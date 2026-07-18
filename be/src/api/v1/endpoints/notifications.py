from functools import lru_cache
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from core.config import get_settings
from services.web_push_service import WebPushService

router = APIRouter()


class PushConfigResponse(BaseModel):
    public_key: str


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    expirationTime: int | None = None
    keys: dict[str, str]


class PushSubscriptionResponse(BaseModel):
    subscription_count: int


class TestNotificationRequest(BaseModel):
    title: str = "Weather Bridge AI"
    body: str = "Thông báo thử từ Web Push đã gửi thành công."
    url: str = "/resident"


class TestNotificationResponse(BaseModel):
    attempted: int
    sent: int


@lru_cache
def get_web_push_service() -> WebPushService:
    return WebPushService(get_settings())


@router.get("/web-push/config", response_model=PushConfigResponse)
async def web_push_config(
    service: WebPushService = Depends(get_web_push_service),
) -> PushConfigResponse:
    return PushConfigResponse(public_key=service.public_key)


@router.post("/web-push/subscriptions", response_model=PushSubscriptionResponse)
async def subscribe_web_push(
    subscription: PushSubscriptionRequest,
    service: WebPushService = Depends(get_web_push_service),
) -> PushSubscriptionResponse:
    count = service.save_subscription(subscription.model_dump())
    return PushSubscriptionResponse(subscription_count=count)


@router.post("/web-push/test", response_model=TestNotificationResponse)
async def send_test_web_push(
    request: TestNotificationRequest,
    service: WebPushService = Depends(get_web_push_service),
) -> TestNotificationResponse:
    payload: dict[str, Any] = {
        "title": request.title,
        "body": request.body,
        "url": request.url,
        "tag": "weather-bridge-test",
    }
    results = await service.send_to_all(payload)
    return TestNotificationResponse(
        attempted=len(results),
        sent=sum(1 for result in results if result.ok),
    )
