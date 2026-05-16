"""
SMS Routing Engine
Handles route selection based on LCR, Priority, Performance, Round Robin
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, Tuple
from uuid import UUID
from decimal import Decimal
import phonenumbers
import re

from app.models.client import Client, ClientTranslation
from app.models.supplier import Supplier, SupplierTranslation
from app.models.route import Route, RouteTrunk, ClientRoute, Trunk, TrunkSupplier
from app.models.rate import ClientRate, SupplierRate, MccMncData


class RoutingEngine:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def process_message(
        self,
        client_id: UUID,
        source_addr: str,
        destination_addr: str,
        message_content: str
    ) -> dict:
        """
        Main routing pipeline:
        1. Validate client
        2. Apply client translations
        3. Lookup MCC/MNC
        4. Get client rate
        5. Check balance
        6. Select route
        7. Select supplier from trunk
        8. Get supplier rate
        9. Apply supplier translations
        10. Return routing result
        """
        
        # 1. Get client
        client = await self._get_client(client_id)
        if not client:
            return {"error": "Client not found", "status": "rejected"}
        
        if not client.is_active:
            return {"error": "Client inactive", "status": "rejected"}
        
        # 2. Apply client translations
        translated_source, translated_dest, translated_content = await self._apply_translations(
            client_id, "client", source_addr, destination_addr, message_content
        )
        
        # 3. Lookup MCC/MNC
        mcc, mnc, country, operator = await self._lookup_mcc_mnc(translated_dest)
        
        # 4. Get client rate
        client_rate = await self._get_client_rate(client_id, mcc, mnc)
        if client_rate is None:
            return {"error": "No rate configured for destination", "status": "rejected"}
        
        # 5. Check balance
        can_charge, balance_error = await self._check_balance(client, client_rate)
        if not can_charge:
            return {"error": balance_error, "status": "rejected"}
        
        # 6. Select route
        route, trunk = await self._select_route(client_id, mcc, mnc)
        if not route or not trunk:
            return {"error": "No route available", "status": "rejected"}
        
        # 7. Select supplier from trunk
        supplier = await self._select_supplier(trunk.id, route.routing_type, mcc, mnc)
        if not supplier:
            return {"error": "No supplier available", "status": "rejected"}
        
        # 8. Get supplier rate
        supplier_rate = await self._get_supplier_rate(supplier.id, mcc, mnc)
        if supplier_rate is None:
            supplier_rate = Decimal("0")  # Default to 0 if no rate
        
        # 9. Apply supplier translations
        final_source, final_dest, final_content = await self._apply_translations(
            supplier.id, "supplier", translated_source, translated_dest, translated_content
        )
        
        # Calculate profit
        profit = client_rate - supplier_rate
        
        return {
            "status": "success",
            "client_id": str(client_id),
            "client_code": client.client_code,
            "supplier_id": str(supplier.id),
            "supplier_code": supplier.supplier_code,
            "route_id": str(route.id),
            "trunk_id": str(trunk.id),
            "source_addr": final_source,
            "destination_addr": final_dest,
            "message_content": final_content,
            "mcc": mcc,
            "mnc": mnc,
            "country": country,
            "operator": operator,
            "client_rate": float(client_rate),
            "supplier_rate": float(supplier_rate),
            "profit": float(profit),
            "billing_mode": client.billing_mode,
            "supplier_connection_type": supplier.connection_type
        }
    
    async def _get_client(self, client_id: UUID) -> Optional[Client]:
        result = await self.db.execute(
            select(Client).where(Client.id == client_id)
        )
        return result.scalar()
    
    async def _apply_translations(
        self,
        entity_id: UUID,
        entity_type: str,
        source: str,
        destination: str,
        content: str
    ) -> Tuple[str, str, str]:
        """Apply translations in priority order"""
        
        if entity_type == "client":
            result = await self.db.execute(
                select(ClientTranslation)
                .where(ClientTranslation.client_id == entity_id, ClientTranslation.is_active == True)
                .order_by(ClientTranslation.priority)
            )
        else:
            result = await self.db.execute(
                select(SupplierTranslation)
                .where(SupplierTranslation.supplier_id == entity_id, SupplierTranslation.is_active == True)
                .order_by(SupplierTranslation.priority)
            )
        
        translations = result.scalars().all()
        
        for trans in translations:
            try:
                if trans.type == "number":
                    destination = re.sub(trans.match_pattern, trans.replace_pattern or "", destination)
                elif trans.type == "sid":
                    source = re.sub(trans.match_pattern, trans.replace_pattern or "", source)
                elif trans.type == "content":
                    content = re.sub(trans.match_pattern, trans.replace_pattern or "", content)
                elif trans.type == "extract_otp":
                    # Extract OTP from content
                    match = re.search(trans.match_pattern, content)
                    if match:
                        content = match.group()
            except re.error:
                pass  # Skip invalid regex
        
        return source, destination, content
    
    async def _lookup_mcc_mnc(self, destination: str) -> Tuple[str, str, str, str]:
        """Lookup MCC/MNC from destination number"""
        
        # Clean number
        dest_clean = re.sub(r'[^\d+]', '', destination)
        if dest_clean.startswith('00'):
            dest_clean = '+' + dest_clean[2:]
        elif not dest_clean.startswith('+'):
            dest_clean = '+' + dest_clean
        
        try:
            parsed = phonenumbers.parse(dest_clean)
            country_code = str(parsed.country_code)
            
            # Find MCC/MNC by country code prefix
            result = await self.db.execute(
                select(MccMncData)
                .where(MccMncData.number_prefix == country_code)
                .limit(1)
            )
            mcc_mnc = result.scalar()
            
            if mcc_mnc:
                return mcc_mnc.mcc, mcc_mnc.mnc, mcc_mnc.country_name, mcc_mnc.operator_name
        except:
            pass
        
        return "000", "00", "Unknown", "Unknown"
    
    async def _get_client_rate(self, client_id: UUID, mcc: str, mnc: str) -> Optional[Decimal]:
        """Get client rate for MCC/MNC"""
        
        # Try exact match first
        result = await self.db.execute(
            select(ClientRate)
            .where(
                ClientRate.client_id == client_id,
                ClientRate.mcc == mcc,
                ClientRate.mnc == mnc,
                ClientRate.is_active == True
            )
            .limit(1)
        )
        rate = result.scalar()
        
        if rate:
            return rate.rate
        
        # Try MCC only (country level rate)
        result = await self.db.execute(
            select(ClientRate)
            .where(
                ClientRate.client_id == client_id,
                ClientRate.mcc == mcc,
                ClientRate.mnc == None,
                ClientRate.is_active == True
            )
            .limit(1)
        )
        rate = result.scalar()
        
        return rate.rate if rate else None
    
    async def _check_balance(self, client: Client, rate: Decimal) -> Tuple[bool, str]:
        """Check if client has sufficient balance"""
        
        if client.billing_type == "prepaid":
            if client.balance < rate:
                return False, "Insufficient balance"
        else:  # postpaid
            available = client.balance + client.credit_limit
            if available < rate:
                return False, "Credit limit exceeded"
        
        return True, ""
    
    async def _select_route(
        self,
        client_id: UUID,
        mcc: str,
        mnc: str
    ) -> Tuple[Optional[Route], Optional[Trunk]]:
        """Select route for client and destination"""
        
        # Get client routes
        result = await self.db.execute(
            select(ClientRoute)
            .where(
                ClientRoute.client_id == client_id,
                ClientRoute.is_active == True,
                ((ClientRoute.mcc == mcc) | (ClientRoute.mcc == None)),
                ((ClientRoute.mnc == mnc) | (ClientRoute.mnc == None))
            )
            .order_by(ClientRoute.priority)
            .limit(1)
        )
        client_route = result.scalar()
        
        if not client_route:
            # Try default route
            result = await self.db.execute(
                select(Client).where(Client.id == client_id)
            )
            client = result.scalar()
            if client and client.default_route_id:
                result = await self.db.execute(
                    select(Route).where(Route.id == client.default_route_id)
                )
                route = result.scalar()
            else:
                return None, None
        else:
            result = await self.db.execute(
                select(Route).where(Route.id == client_route.route_id)
            )
            route = result.scalar()
        
        if not route or not route.is_active:
            return None, None
        
        # Get trunk from route
        result = await self.db.execute(
            select(RouteTrunk)
            .join(Trunk)
            .where(
                RouteTrunk.route_id == route.id,
                RouteTrunk.is_active == True,
                Trunk.is_active == True
            )
            .order_by(RouteTrunk.priority)
            .limit(1)
        )
        route_trunk = result.scalar()
        
        if not route_trunk:
            return None, None
        
        result = await self.db.execute(
            select(Trunk).where(Trunk.id == route_trunk.trunk_id)
        )
        trunk = result.scalar()
        
        return route, trunk
    
    async def _select_supplier(
        self,
        trunk_id: UUID,
        routing_type: str,
        mcc: str,
        mnc: str
    ) -> Optional[Supplier]:
        """Select supplier from trunk based on routing type"""
        
        # Get trunk suppliers
        result = await self.db.execute(
            select(TrunkSupplier)
            .join(Supplier)
            .where(
                TrunkSupplier.trunk_id == trunk_id,
                TrunkSupplier.is_active == True,
                Supplier.is_active == True
            )
            .order_by(TrunkSupplier.priority)
        )
        trunk_suppliers = result.scalars().all()
        
        if not trunk_suppliers:
            return None
        
        if routing_type == "priority":
            # Return first by priority
            supplier_id = trunk_suppliers[0].supplier_id
        
        elif routing_type == "lcr":
            # Return lowest cost
            best_rate = None
            best_supplier_id = None
            
            for ts in trunk_suppliers:
                rate = await self._get_supplier_rate(ts.supplier_id, mcc, mnc)
                if rate is not None and (best_rate is None or rate < best_rate):
                    best_rate = rate
                    best_supplier_id = ts.supplier_id
            
            supplier_id = best_supplier_id or trunk_suppliers[0].supplier_id
        
        elif routing_type == "performance":
            # Return best delivery ratio
            best_ratio = -1
            best_supplier_id = None
            
            for ts in trunk_suppliers:
                result = await self.db.execute(
                    select(Supplier).where(Supplier.id == ts.supplier_id)
                )
                supplier = result.scalar()
                if supplier and supplier.total_submitted > 0:
                    ratio = supplier.total_delivered / supplier.total_submitted
                    if ratio > best_ratio:
                        best_ratio = ratio
                        best_supplier_id = supplier.id
            
            supplier_id = best_supplier_id or trunk_suppliers[0].supplier_id
        
        elif routing_type == "round_robin":
            # Simple round robin based on weight
            import random
            weights = [ts.weight for ts in trunk_suppliers]
            selected = random.choices(trunk_suppliers, weights=weights, k=1)[0]
            supplier_id = selected.supplier_id
        
        else:  # testing
            supplier_id = trunk_suppliers[0].supplier_id
        
        result = await self.db.execute(
            select(Supplier).where(Supplier.id == supplier_id)
        )
        return result.scalar()
    
    async def _get_supplier_rate(self, supplier_id: UUID, mcc: str, mnc: str) -> Optional[Decimal]:
        """Get supplier rate for MCC/MNC"""
        
        result = await self.db.execute(
            select(SupplierRate)
            .where(
                SupplierRate.supplier_id == supplier_id,
                SupplierRate.mcc == mcc,
                SupplierRate.is_active == True
            )
            .limit(1)
        )
        rate = result.scalar()
        
        return rate.rate if rate else None
