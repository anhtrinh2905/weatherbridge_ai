from uuid import UUID

from auth.keycloak import CurrentUser
from core.errors import AppError
from core.time import utc_now
from database.domain_models import (
    Alert,
    AuditLog,
    EvacuationAssignment,
    EvacuationOrder,
    Household,
    Resident,
    ResidentSafetyEvent,
    Shelter,
)
from database.models import GeoLocation
from database.spatial import point_value
from modules.evacuations.schemas import (
    EvacuationAssignmentRequest,
    EvacuationAssignmentResponse,
    EvacuationOrderCreateRequest,
    EvacuationOrderResponse,
    SafetyEventCreateRequest,
    SafetyEventResponse,
    ShelterCreateRequest,
    ShelterResponse,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from services.profile_service import AccessContext, ProfileService


class EvacuationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.profiles = ProfileService(session)

    async def list_shelters(self, user: CurrentUser) -> list[ShelterResponse]:
        context = await self.profiles.access_context(user)
        query = select(Shelter).where(Shelter.status == "active").order_by(Shelter.name)
        if not context.is_admin and context.area_ids:
            query = query.where(Shelter.geo_location_id.in_(context.area_ids))
        shelters = (await self.session.scalars(query)).all()
        return [await self._shelter_response(item) for item in shelters]

    async def create_shelter(
        self, payload: ShelterCreateRequest, user: CurrentUser
    ) -> ShelterResponse:
        context = await self.profiles.access_context(user)
        if context.domain_role not in {"admin", "commune_officer"}:
            raise AppError(403, "This role cannot manage shelters", "shelter_forbidden")
        area = await self.profiles.resolve_area(payload.area_code)
        await self.profiles.assert_area_access(context, area.id)
        if await self.session.scalar(select(Shelter).where(Shelter.code == payload.code)):
            raise AppError(409, "Shelter code already exists", "shelter_duplicate")
        now = utc_now()
        shelter = Shelter(
            code=payload.code,
            geo_location_id=area.id,
            name=payload.name,
            location=point_value(
                self.session.get_bind().dialect.name, payload.longitude, payload.latitude
            ),
            capacity=payload.capacity,
            accessibility=payload.accessibility,
            status="active",
            simulated=payload.simulated,
            created_at=now,
            updated_at=now,
        )
        self.session.add(shelter)
        await self.session.flush()
        self._audit(context, "shelter.create", "shelter", shelter.id, area.id)
        await self.session.commit()
        return await self._shelter_response(shelter)

    async def list_orders(self, user: CurrentUser) -> list[EvacuationOrderResponse]:
        context = await self.profiles.access_context(user)
        query = select(EvacuationOrder).order_by(EvacuationOrder.created_at.desc())
        if context.is_admin:
            pass
        elif context.area_ids:
            query = query.where(EvacuationOrder.geo_location_id.in_(context.area_ids))
        else:
            raise AppError(403, "No area is assigned", "area_unassigned")
        orders = (await self.session.scalars(query)).all()
        return [await self._order_response(item) for item in orders]

    async def create_order(
        self, payload: EvacuationOrderCreateRequest, user: CurrentUser
    ) -> EvacuationOrderResponse:
        context = await self.profiles.access_context(user)
        if context.domain_role not in {"admin", "commune_officer"}:
            raise AppError(403, "This role cannot issue evacuation orders", "evacuation_forbidden")
        area = await self.profiles.resolve_area(payload.area_code)
        await self.profiles.assert_area_access(context, area.id)
        alert = await self.session.get(Alert, payload.alert_id)
        if alert is None or alert.status != "published":
            raise AppError(
                409,
                "Evacuation order requires a published alert",
                "alert_not_published",
            )
        if await self.session.scalar(
            select(EvacuationOrder).where(EvacuationOrder.alert_id == alert.id)
        ):
            raise AppError(409, "Alert already has an evacuation order", "evacuation_duplicate")
        order = EvacuationOrder(
            alert_id=alert.id,
            geo_location_id=area.id,
            status="active",
            issued_by_profile_id=context.profile.id,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            instructions=payload.instructions,
            created_at=utc_now(),
        )
        self.session.add(order)
        await self.session.flush()
        self._audit(context, "evacuation.create", "evacuation_order", order.id, area.id)
        await self.session.commit()
        return await self._order_response(order)

    async def assign(
        self,
        order_id: UUID,
        payload: EvacuationAssignmentRequest,
        user: CurrentUser,
    ) -> EvacuationAssignmentResponse:
        if payload.household_id is None and payload.resident_id is None:
            raise AppError(422, "Household or resident is required", "assignee_required")
        context = await self.profiles.access_context(user)
        if not context.is_official:
            raise AppError(403, "Only officials can assign evacuations", "evacuation_forbidden")
        order = await self.session.get(EvacuationOrder, order_id)
        if order is None:
            raise AppError(404, "Evacuation order not found", "evacuation_not_found")
        await self.profiles.assert_area_access(context, order.geo_location_id)
        shelter = await self.session.get(Shelter, payload.shelter_id)
        if shelter is None or shelter.status != "active":
            raise AppError(404, "Active shelter not found", "shelter_not_found")
        if payload.household_id:
            household = await self.session.get(Household, payload.household_id)
            if household is None:
                raise AppError(404, "Household not found", "household_not_found")
            await self.profiles.assert_area_access(context, household.village_id)
        if payload.resident_id:
            resident = await self.session.get(Resident, payload.resident_id)
            if resident is None:
                raise AppError(404, "Resident not found", "resident_not_found")
            await self.profiles.assert_area_access(context, resident.managed_geo_location_id)
        now = utc_now()
        assignment = EvacuationAssignment(
            evacuation_order_id=order.id,
            household_id=payload.household_id,
            resident_id=payload.resident_id,
            shelter_id=shelter.id,
            status="assigned",
            assigned_at=now,
            updated_at=now,
        )
        self.session.add(assignment)
        await self.session.commit()
        return self._assignment_response(assignment)

    async def record_safety(
        self, payload: SafetyEventCreateRequest, user: CurrentUser
    ) -> SafetyEventResponse:
        context = await self.profiles.access_context(user)
        if context.domain_role == "resident":
            resident = await self.session.scalar(
                select(Resident).where(Resident.user_profile_id == context.profile.id)
            )
            if resident is None:
                raise AppError(404, "Resident account is not linked", "resident_not_linked")
            if payload.resident_id not in {None, resident.id}:
                raise AppError(403, "Residents can only update themselves", "resident_forbidden")
        elif context.is_official and payload.resident_id:
            resident = await self.session.get(Resident, payload.resident_id)
            if resident is None:
                raise AppError(404, "Resident not found", "resident_not_found")
            await self.profiles.assert_area_access(context, resident.managed_geo_location_id)
        else:
            raise AppError(422, "resident_id is required", "resident_required")
        event = ResidentSafetyEvent(
            resident_id=resident.id,
            evacuation_order_id=payload.evacuation_order_id,
            status=payload.status,
            recorded_by_profile_id=context.profile.id,
            notes=payload.notes,
            occurred_at=utc_now(),
        )
        self.session.add(event)
        await self.session.commit()
        return SafetyEventResponse(
            id=event.id,
            resident_id=event.resident_id,
            evacuation_order_id=event.evacuation_order_id,
            status=event.status,
            occurred_at=event.occurred_at,
        )

    async def _shelter_response(self, item: Shelter) -> ShelterResponse:
        area_code = await self.session.scalar(
            select(GeoLocation.code).where(GeoLocation.id == item.geo_location_id)
        )
        return ShelterResponse(
            id=item.id,
            code=item.code,
            area_code=area_code or "unknown",
            name=item.name,
            capacity=item.capacity,
            accessibility=item.accessibility,
            status=item.status,
            simulated=item.simulated,
        )

    async def _order_response(self, item: EvacuationOrder) -> EvacuationOrderResponse:
        area_code = await self.session.scalar(
            select(GeoLocation.code).where(GeoLocation.id == item.geo_location_id)
        )
        count = int(
            await self.session.scalar(
                select(func.count(EvacuationAssignment.id)).where(
                    EvacuationAssignment.evacuation_order_id == item.id
                )
            )
            or 0
        )
        return EvacuationOrderResponse(
            id=item.id,
            alert_id=item.alert_id,
            area_code=area_code or "unknown",
            status=item.status,
            starts_at=item.starts_at,
            ends_at=item.ends_at,
            instructions=item.instructions,
            assignment_count=count,
        )

    @staticmethod
    def _assignment_response(item: EvacuationAssignment) -> EvacuationAssignmentResponse:
        return EvacuationAssignmentResponse(
            id=item.id,
            evacuation_order_id=item.evacuation_order_id,
            shelter_id=item.shelter_id,
            household_id=item.household_id,
            resident_id=item.resident_id,
            status=item.status,
        )

    def _audit(
        self,
        context: AccessContext,
        action: str,
        entity_type: str,
        entity_id: UUID,
        area_id: UUID,
    ) -> None:
        self.session.add(
            AuditLog(
                actor_profile_id=context.profile.id,
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id),
                geo_location_id=area_id,
                created_at=utc_now(),
            )
        )
