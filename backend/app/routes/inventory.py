from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import InventoryItem, Supplier, User
from app.schemas.schemas import InventoryItemResponse, SupplierResponse
from app.auth.deps import get_current_user

router = APIRouter(prefix="/reference", tags=["Reference Data"])

@router.get("/inventory", response_model=List[InventoryItemResponse])
def get_inventory_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns verified warehouse inventory records."""
    return db.query(InventoryItem).order_by(InventoryItem.location.asc()).all()

@router.get("/suppliers", response_model=List[SupplierResponse])
def get_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns verified supplier partner directory."""
    return db.query(Supplier).order_by(Supplier.name.asc()).all()
