import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, RevokedToken
from app.schemas.schemas import UserLogin, UserCreate, UserResponse, Token
from app.auth.security import hash_password, verify_password, create_access_token
from app.auth.deps import get_current_user, require_role, oauth2_scheme
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates user, verifies Argon2id password hash, enforces brute-force lockout,
    and returns signed JWT.
    """
    username = credentials.username.strip().lower()
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Check rate limit / lockout
    user = db.query(User).filter(User.username == username).first()
    if user and user.locked_until and user.locked_until > now:
        remaining_minutes = int((user.locked_until - now).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to excessive failed attempts. Please retry in {remaining_minutes} minutes."
        )

    if not user or not verify_password(credentials.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= settings.LOGIN_MAX_ATTEMPTS:
                user.locked_until = now + datetime.timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
                user.failed_login_attempts = 0
            db.commit()
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")

    # Reset failed attempts upon successful authentication
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    token_data = {
        "sub": user.username,
        "role": user.role,
        "name": user.full_name
    }
    token = create_access_token(data=token_data)

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return UserResponse.model_validate(current_user)

@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Terminates the active session by revoking the bearer token on the server.
    Subsequent requests with this token will be rejected with 401 Unauthorized.
    """
    existing = db.query(RevokedToken).filter(RevokedToken.token == token).first()
    if not existing:
        revoked = RevokedToken(token=token)
        db.add(revoked)
        db.commit()
    return {"detail": "Session terminated successfully"}

@router.post("/register", response_model=UserResponse)
def register_user(
    user_in: UserCreate, 
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role("admin"))
):
    """
    Registers a new user. Restricted strictly to authorized Administrators.
    Prevents horizontal and vertical privilege escalation from untrusted callers.
    """
    existing_user = db.query(User).filter(
        (User.username == user_in.username.lower()) | (User.email == user_in.email.lower())
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered"
        )
        
    new_user = User(
        username=user_in.username.lower().strip(),
        email=user_in.email.lower().strip(),
        full_name=user_in.full_name.strip(),
        hashed_password=hash_password(user_in.password),
        role=user_in.role if user_in.role in ["operator", "operations_manager", "lead_approver", "admin"] else "operator",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse.model_validate(new_user)
