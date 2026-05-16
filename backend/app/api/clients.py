"""
Client Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.client import Client, ClientTranslation, ClientIPWhitelist
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse,
    TranslationCreate, TranslationResponse, TopupRequest
)
from app.services.billing import BillingService

router = APIRouter()

@router.get("", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all clients with pagination and filtering"""
    query = select(Client)
    
    if search:
        query = query.where(
            or_(
                Client.client_code.ilike(f"%{search}%"),
                Client.company_name.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%")
            )
        )
    
    if status == "active":
        query = query.where(Client.is_active == True)
    elif status == "inactive":
        query = query.where(Client.is_active == False)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Paginate
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    clients = result.scalars().all()
    
    return {
        "items": clients,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.post("", response_model=ClientResponse)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new client"""
    # Check if client code exists
    existing = await db.execute(
        select(Client).where(Client.client_code == client_data.client_code)
    )
    if existing.scalar():
        raise HTTPException(status_code=400, detail="Client code already exists")
    
    client = Client(**client_data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    
    return client

@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get client by ID"""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return client

@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update client"""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    for key, value in client_data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    
    await db.commit()
    await db.refresh(client)
    
    return client

@router.delete("/{client_id}")
async def delete_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete client (soft delete)"""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client.is_active = False
    await db.commit()
    
    return {"message": "Client deleted successfully"}

@router.post("/{client_id}/topup")
async def topup_client(
    client_id: UUID,
    topup: TopupRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add funds to client balance"""
    billing_service = BillingService(db)
    
    payment = await billing_service.add_payment(
        entity_type="client",
        entity_id=client_id,
        amount=topup.amount,
        payment_type="topup",
        payment_method=topup.payment_method,
        reference_number=topup.reference_number,
        notes=topup.notes,
        processed_by=current_user.id
    )
    
    return {"message": "Topup successful", "payment_id": payment.id}

@router.get("/{client_id}/balance")
async def get_client_balance(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get client balance and credit info"""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {
        "balance": float(client.balance),
        "credit_limit": float(client.credit_limit),
        "available": float(client.balance + client.credit_limit),
        "billing_type": client.billing_type
    }

# Translations
@router.get("/{client_id}/translations", response_model=List[TranslationResponse])
async def list_client_translations(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List client translations"""
    result = await db.execute(
        select(ClientTranslation)
        .where(ClientTranslation.client_id == client_id)
        .order_by(ClientTranslation.priority)
    )
    return result.scalars().all()

@router.post("/{client_id}/translations", response_model=TranslationResponse)
async def create_client_translation(
    client_id: UUID,
    translation: TranslationCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create client translation"""
    trans = ClientTranslation(client_id=client_id, **translation.model_dump())
    db.add(trans)
    await db.commit()
    await db.refresh(trans)
    return trans

@router.delete("/{client_id}/translations/{translation_id}")
async def delete_client_translation(
    client_id: UUID,
    translation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete client translation"""
    result = await db.execute(
        select(ClientTranslation)
        .where(ClientTranslation.id == translation_id, ClientTranslation.client_id == client_id)
    )
    trans = result.scalar()
    
    if not trans:
        raise HTTPException(status_code=404, detail="Translation not found")
    
    await db.delete(trans)
    await db.commit()
    
    return {"message": "Translation deleted"}

# IP Whitelist
@router.get("/{client_id}/whitelist")
async def list_client_whitelist(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List client IP whitelist"""
    result = await db.execute(
        select(ClientIPWhitelist).where(ClientIPWhitelist.client_id == client_id)
    )
    return result.scalars().all()

@router.post("/{client_id}/whitelist")
async def add_client_whitelist(
    client_id: UUID,
    ip_address: str,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add IP to client whitelist"""
    whitelist = ClientIPWhitelist(
        client_id=client_id,
        ip_address=ip_address,
        description=description
    )
    db.add(whitelist)
    await db.commit()
    await db.refresh(whitelist)
    return whitelist

@router.delete("/{client_id}/whitelist/{whitelist_id}")
async def remove_client_whitelist(
    client_id: UUID,
    whitelist_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Remove IP from client whitelist"""
    result = await db.execute(
        select(ClientIPWhitelist)
        .where(ClientIPWhitelist.id == whitelist_id, ClientIPWhitelist.client_id == client_id)
    )
    whitelist = result.scalar()
    
    if not whitelist:
        raise HTTPException(status_code=404, detail="Whitelist entry not found")
    
    await db.delete(whitelist)
    await db.commit()
    
    return {"message": "IP removed from whitelist"}

# Bind status
@router.get("/{client_id}/bind-status")
async def get_client_bind_status(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get client SMPP bind status"""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {
        "smpp_status": client.smpp_status,
        "smpp_session_id": client.smpp_session_id,
        "smpp_last_activity": client.smpp_last_activity,
        "connection_mode": client.connection_mode
    }

@router.post("/{client_id}/bind")
async def bind_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Manually bind client (for client mode connections)"""
    # This would trigger the SMPP client connection
    # Implementation depends on SMPP server
    return {"message": "Bind request sent"}

@router.post("/{client_id}/unbind")
async def unbind_client(
    client_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Manually unbind client"""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client.smpp_status = "unbound"
    client.smpp_session_id = None
    await db.commit()
    
    return {"message": "Client unbound"}
