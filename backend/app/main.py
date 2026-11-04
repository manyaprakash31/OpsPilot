import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
from app.database import Base, engine
from app.routes.seed_data import seed_database
from app.routes import auth, requests, approvals, audit, dashboard, inventory

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("opspilot")

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Protects backend from oversized request body attacks."""
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={"detail": "Request body exceeds safe payload threshold (1MB)."}
            )
        return await call_next(request)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Applies OWASP-compliant secure response headers to mitigate clickjacking, MIME sniffing, and framing."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed demo scenario
    logger.info("Initializing OpsPilot database and seeding demonstration scenario...")
    try:
        Base.metadata.create_all(bind=engine)
        seed_database()
        logger.info("OpsPilot backend database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization exception: {e}")
    yield
    # Shutdown logic
    logger.info("OpsPilot backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="OpsPilot — AI-Powered Operations Management Platform",
    lifespan=lifespan
)

# CORS Middleware with explicit origins and Vercel preview domain support
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security payload limit
app.add_middleware(RequestSizeLimitMiddleware)

# OWASP Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# Safe Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled operational exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal operational error occurred. The incident has been logged safely."}
    )

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(requests.router, prefix=settings.API_V1_PREFIX)
app.include_router(approvals.router, prefix=settings.API_V1_PREFIX)
app.include_router(audit.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(inventory.router, prefix=settings.API_V1_PREFIX)

@app.get("/api/health", tags=["Health"])
def health_check():
    db_status = "connected"
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
    except Exception as e:
        logger.warning(f"Health check database ping warning: {e}")
        db_status = "unreachable"

    return {
        "status": "healthy",
        "database": db_status,
        "service": "OpsPilot Operations Engine",
        "version": settings.VERSION,
        "llm_provider": settings.LLM_PROVIDER,
        "demo_mode": settings.DEMO_MODE
    }

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
