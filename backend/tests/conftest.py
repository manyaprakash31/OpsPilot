import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models.models import User, InventoryItem
from app.auth.security import create_access_token

# Test database
TEST_DB_URL = "sqlite:///./test_opspilot.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    from app.routes.seed_data import hash_password
    users = [
        User(username="test_operator", email="op@test.com", full_name="Test Operator", hashed_password=hash_password("Pass123!"), role="operator"),
        User(username="test_approver", email="appr@test.com", full_name="Test Approver", hashed_password=hash_password("Pass123!"), role="lead_approver"),
        User(username="test_manager", email="mgr@test.com", full_name="Test Manager", hashed_password=hash_password("Pass123!"), role="operations_manager"),
        User(username="test_admin", email="admin@test.com", full_name="Test Administrator", hashed_password=hash_password("AdminPass123!"), role="admin"),
    ]
    db.add_all(users)
    
    # Inventory
    inv = InventoryItem(
        sku="DISP-PUN-001",
        name="Modular Retail Display Units (Pune Store Spec)",
        location="Pune Warehouse (Chakan Hub)",
        current_stock=120,
        reserved_stock=0,
        unit="units",
        unit_cost=4500.0
    )
    db.add(inv)
    db.commit()
    db.close()
    
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def operator_token():
    return create_access_token(data={"sub": "test_operator", "role": "operator"})

@pytest.fixture
def approver_token():
    return create_access_token(data={"sub": "test_approver", "role": "lead_approver"})

@pytest.fixture
def admin_token():
    return create_access_token(data={"sub": "test_admin", "role": "admin"})

@pytest.fixture
def operator_headers(operator_token):
    return {"Authorization": f"Bearer {operator_token}"}

@pytest.fixture
def approver_headers(approver_token):
    return {"Authorization": f"Bearer {approver_token}"}

@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
