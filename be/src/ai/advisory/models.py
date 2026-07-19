from typing import Literal

from pydantic import BaseModel, Field

HazardType = Literal["flash_flood", "landslide", "fog"]
Tier = Literal["prepare", "go_now"]

# Bumped whenever the prompt text below changes so generated content stays traceable
# to the instructions that produced it (see AGENTS.md provenance rules).
PROMPT_VERSION = "advisory-v1"


class AlertDraftRequest(BaseModel):
    """Context an officer gives the model to draft a bulletin from scratch."""

    hazard_type: HazardType
    level: int = Field(ge=1, le=5)
    tier: Tier
    location_label: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=2000)
    language: str = "vi"


class AlertDraft(BaseModel):
    """Editable draft of the three resident-facing bulletin fields.

    Field limits mirror ``AlertCreateRequest`` so a draft always fits the create form.
    """

    what_happened: str = Field(max_length=2000)
    danger_description: str = Field(max_length=2000)
    action_instruction: str = Field(max_length=4000)
    model_name: str
    prompt_version: str = PROMPT_VERSION


class ResidentActionRequest(BaseModel):
    """A published bulletin the resident wants expanded into concrete steps."""

    hazard_type: HazardType | None = None
    level: int = Field(ge=1, le=5)
    tier: Tier
    what_happened: str = Field(min_length=1, max_length=2000)
    danger_description: str = Field(min_length=1, max_length=2000)
    action_instruction: str = Field(min_length=1, max_length=4000)
    language: str = "vi"


class ResidentActionPlan(BaseModel):
    summary: str = Field(max_length=500)
    steps: list[str] = Field(min_length=1, max_length=12)
    model_name: str
    prompt_version: str = PROMPT_VERSION


class WeatherActionRequest(BaseModel):
    """Coordinates of a resident's location; the server fetches the forecast itself."""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_label: str | None = Field(default=None, max_length=200)
    language: str = "vi"


# normal = no notable hazard (just an FYI, no actions); watch/warning/danger escalate.
RiskLevel = Literal["normal", "watch", "warning", "danger"]


class WeatherActionPlan(BaseModel):
    """Weather-driven safety advice for one resident, derived from the live forecast.

    When ``risk_level`` is "normal" the plan is a calm FYI with no action ``steps``.
    """

    risk_level: RiskLevel = "normal"
    weather_summary: str = Field(max_length=600)
    risk_note: str = Field(max_length=600)
    summary: str = Field(max_length=500)
    steps: list[str] = Field(default_factory=list, max_length=12)
    forecast_source: str = "open-meteo"
    model_name: str
    prompt_version: str = PROMPT_VERSION
