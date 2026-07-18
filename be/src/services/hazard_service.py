from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from core.object_storage import ObjectUrlSigner
from database.domain_models import HazardLayer, HazardRun, HazardZone
from modules.hazards.schemas import (
    HazardCellResponse,
    HazardCellSample,
    HazardLayerResponse,
    HazardManifestResponse,
    HazardType,
)


class HazardService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.signer = ObjectUrlSigner(settings)

    async def manifest(
        self, requested_type: HazardType, forecast_day: date | None
    ) -> HazardManifestResponse:
        hazard_types = self._physical_types(requested_type)
        query = (
            select(HazardLayer, HazardRun)
            .join(HazardRun, HazardRun.id == HazardLayer.run_id)
            .where(
                HazardLayer.is_current.is_(True),
                HazardLayer.hazard_type.in_(hazard_types),
            )
            .order_by(HazardLayer.forecast_day, HazardLayer.hazard_type)
        )
        if forecast_day:
            query = query.where(HazardLayer.forecast_day == forecast_day)
        rows = (await self.session.execute(query)).all()
        layers = [self._layer_response(layer, run) for layer, run in rows]
        return HazardManifestResponse(requested_type=requested_type, layers=layers)

    async def inspect_cell(
        self,
        requested_type: HazardType,
        latitude: float,
        longitude: float,
        forecast_day: date | None,
    ) -> HazardCellResponse:
        manifest = await self.manifest(requested_type, forecast_day)
        samples: list[HazardCellSample] = []
        dialect_name = self.session.get_bind().dialect.name
        for layer in manifest.layers:
            zone = None
            if dialect_name == "postgresql":
                point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
                zone = await self.session.scalar(
                    select(HazardZone)
                    .where(
                        HazardZone.hazard_layer_id == layer.id,
                        func.ST_Intersects(HazardZone.geometry, point),
                    )
                    .order_by(HazardZone.risk_level.desc())
                    .limit(1)
                )
            samples.append(
                HazardCellSample(
                    hazard_type=layer.hazard_type,
                    layer_id=layer.id,
                    forecast_day=layer.forecast_day,
                    risk_level=zone.risk_level if zone else None,
                    score_min=zone.score_min if zone else None,
                    score_max=zone.score_max if zone else None,
                    confidence=zone.confidence if zone else layer.confidence,
                )
            )
        comparable = [sample for sample in samples if sample.score_max is not None]
        dominant = (
            max(comparable, key=lambda item: item.score_max or 0).hazard_type
            if comparable
            else None
        )
        return HazardCellResponse(
            latitude=latitude,
            longitude=longitude,
            samples=samples,
            dominant_source=dominant,
        )

    def _layer_response(self, layer: HazardLayer, run: HazardRun) -> HazardLayerResponse:
        return HazardLayerResponse(
            id=layer.id,
            run_id=layer.run_id,
            hazard_type=layer.hazard_type,
            forecast_day=layer.forecast_day,
            raster_url=self.signer.sign(layer.cog_object_key),
            web_png_url=self.signer.sign(layer.png_object_key),
            bbox=layer.bbox,
            crs=layer.crs,
            resolution_m=layer.resolution_m,
            level_bins=layer.level_bins,
            legend=layer.legend,
            confidence=layer.confidence,
            contribution_summary=layer.contribution_summary,
            issued_at=run.issued_at,
        )

    @staticmethod
    def _physical_types(requested_type: HazardType) -> tuple[str, ...]:
        if requested_type == "dominant":
            return ("flash_flood", "landslide")
        return (requested_type,)
