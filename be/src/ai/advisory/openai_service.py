from __future__ import annotations

import json
from typing import Any

import httpx

from ai.advisory.exceptions import (
    AdvisoryConfigError,
    AdvisoryHTTPError,
    AdvisoryTransportError,
)
from ai.advisory.models import (
    PROMPT_VERSION,
    AlertDraft,
    AlertDraftRequest,
    ResidentActionPlan,
    ResidentActionRequest,
    WeatherActionPlan,
)
from core.config import Settings

_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"

_HAZARD_LABELS = {
    "flash_flood": "lũ quét",
    "landslide": "sạt lở đất",
    "fog": "sương mù dày",
}
_TIER_LABELS = {
    "prepare": "chuẩn bị ứng phó (chưa phải di dời ngay)",
    "go_now": "di dời ngay lập tức",
}

# Shared framing: this content reaches rural, sometimes low-literacy communities in
# mountainous Vietnam, so it must be short, concrete and in the imperative — and it is
# always a DRAFT for a human officer to review, never authoritative on its own.
_SYSTEM_DRAFT = (
    "Bạn là trợ lý soạn thảo cảnh báo thiên tai cho cán bộ phòng chống thiên tai cấp xã tại "
    "vùng núi Việt Nam. Người nhận là người dân, nhiều người ít đọc chữ, nên câu phải NGẮN, "
    "CỤ THỂ, dùng động từ mệnh lệnh, tránh thuật ngữ kỹ thuật. Không bịa số liệu, mốc thời gian "
    "hay địa danh không được cung cấp. Đây chỉ là BẢN NHÁP để cán bộ chỉnh sửa trước khi phát. "
    'Trả về đúng JSON: {"what_happened": "...", "danger_description": "...", '
    '"action_instruction": "..."}. what_happened mô tả điều đang xảy ra (tối đa ~2 câu); '
    "danger_description nêu vì sao nguy hiểm (tối đa ~2 câu); action_instruction là việc người "
    "dân cần làm (tối đa ~4 câu, có thể liệt kê bằng dấu chấm phẩy). Không thêm lời bình nào khác."
)

_SYSTEM_WEATHER = (
    "Bạn là trợ lý an toàn thiên tai cho người dân vùng núi Việt Nam (nguy cơ chính: lũ quét, "
    "sạt lở đất, sương mù). Dựa TRÊN dự báo thời tiết và MỨC RỦI RO được cung cấp, hãy đề xuất "
    "người dân nên làm gì trong 1-3 ngày tới. Chỉ dựa vào số liệu được cho, KHÔNG bịa thêm số "
    "liệu, mốc giờ hay địa danh. Câu ngắn, cụ thể, dùng động từ mệnh lệnh, tránh thuật ngữ. "
    "Mức độ khẩn cấp và SỐ LƯỢNG bước phải TỈ LỆ với mức rủi ro, TUYỆT ĐỐI không phóng đại: "
    "watch = 2-3 bước theo dõi/phòng ngừa nhẹ; warning = 3-5 bước chuẩn bị; "
    "danger = 4-6 bước khẩn cấp. "
    'Trả về đúng JSON: {"weather_summary": "tóm tắt thời tiết bằng lời (1-2 câu)", '
    '"risk_note": "nguy cơ thiên tai suy ra từ thời tiết (1-2 câu)", '
    '"summary": "một câu nên làm gì", "steps": ["bước 1", "bước 2", ...]}. '
    "Không thêm lời bình nào khác."
)

_RISK_VI = {
    "watch": "theo dõi (rủi ro thấp)",
    "warning": "cảnh báo (rủi ro trung bình - cao)",
    "danger": "nguy hiểm (rủi ro rất cao)",
}

_SYSTEM_ACTIONS = (
    "Bạn là trợ lý an toàn thiên tai cho người dân vùng núi Việt Nam. Dựa trên nội dung cảnh báo "
    "ĐÃ ĐƯỢC PHÁT (không thay đổi ý nghĩa, không hạ thấp mức nguy hiểm), hãy diễn giải thành các "
    "bước hành động ngắn gọn, rõ ràng, ưu tiên theo thứ tự làm trước - làm sau. Mỗi bước một câu "
    "mệnh lệnh. Không bịa thêm nguồn lực, số điện thoại hay địa điểm không có trong cảnh báo. "
    'Trả về đúng JSON: {"summary": "một câu tóm tắt cần làm gì ngay", "steps": ["bước 1", '
    '"bước 2", ...]} với tối đa 8 bước. Không thêm lời bình nào khác.'
)


class OpenAIAdvisoryService:
    """LLM helper that drafts hazard bulletins and expands them into resident action steps.

    Content quality caveat: output is machine-generated and must be reviewed by a responsible
    officer before it is relied upon for real warnings — the model has no ground-truth view of
    the local terrain or the live situation.
    """

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client

    async def draft_alert(self, request: AlertDraftRequest) -> AlertDraft:
        hazard = _HAZARD_LABELS[request.hazard_type]
        tier = _TIER_LABELS[request.tier]
        user_lines = [
            f"Loại hình: {hazard}",
            f"Mức độ (1 thấp - 5 rất cao): {request.level}",
            f"Khuyến nghị: {tier}",
        ]
        if request.location_label:
            user_lines.append(f"Địa bàn: {request.location_label}")
        if request.notes:
            user_lines.append(f"Ghi chú của cán bộ: {request.notes}")
        if request.language != "vi":
            user_lines.append(f"Viết nội dung bằng ngôn ngữ mã: {request.language}")

        body = await self._chat(_SYSTEM_DRAFT, "\n".join(user_lines))
        try:
            return AlertDraft(
                what_happened=str(body["what_happened"]).strip(),
                danger_description=str(body["danger_description"]).strip(),
                action_instruction=str(body["action_instruction"]).strip(),
                model_name=self.settings.openai_model,
                prompt_version=PROMPT_VERSION,
            )
        except KeyError as exc:
            raise AdvisoryTransportError(f"Missing field in OpenAI draft: {exc}") from exc

    async def suggest_resident_actions(
        self, request: ResidentActionRequest
    ) -> ResidentActionPlan:
        hazard = _HAZARD_LABELS.get(request.hazard_type or "", "thiên tai")
        tier = _TIER_LABELS[request.tier]
        user_lines = [
            f"Loại hình: {hazard}",
            f"Mức độ (1 thấp - 5 rất cao): {request.level}",
            f"Khuyến nghị: {tier}",
            f"Điều đang xảy ra: {request.what_happened}",
            f"Vì sao nguy hiểm: {request.danger_description}",
            f"Hướng dẫn gốc: {request.action_instruction}",
        ]
        if request.language != "vi":
            user_lines.append(f"Viết nội dung bằng ngôn ngữ mã: {request.language}")

        body = await self._chat(_SYSTEM_ACTIONS, "\n".join(user_lines))
        try:
            steps = [str(step).strip() for step in body["steps"] if str(step).strip()]
        except KeyError as exc:
            raise AdvisoryTransportError(f"Missing 'steps' in OpenAI response: {exc}") from exc
        if not steps:
            raise AdvisoryTransportError("OpenAI returned no action steps")
        return ResidentActionPlan(
            summary=str(body.get("summary", "")).strip(),
            steps=steps[:12],
            model_name=self.settings.openai_model,
            prompt_version=PROMPT_VERSION,
        )

    async def suggest_weather_actions(
        self,
        weather_context: str,
        risk_level: str,
        location_label: str | None = None,
        language: str = "vi",
    ) -> WeatherActionPlan:
        """Turn a pre-formatted forecast summary into weather-driven action advice.

        Only called for elevated risk (watch/warning/danger) — the "normal" case is handled
        deterministically by WeatherAdvisoryService without spending an LLM call. The caller
        fetches the forecast, assesses ``risk_level`` and formats ``weather_context``.
        """
        user_lines = []
        if location_label:
            user_lines.append(f"Địa điểm: {location_label}")
        user_lines.append(f"Mức rủi ro: {_RISK_VI.get(risk_level, risk_level)}")
        user_lines.append("Dự báo thời tiết:")
        user_lines.append(weather_context)
        if language != "vi":
            user_lines.append(f"Viết nội dung bằng ngôn ngữ mã: {language}")

        body = await self._chat(_SYSTEM_WEATHER, "\n".join(user_lines))
        try:
            steps = [str(step).strip() for step in body["steps"] if str(step).strip()]
        except KeyError as exc:
            raise AdvisoryTransportError(f"Missing 'steps' in OpenAI response: {exc}") from exc
        if not steps:
            raise AdvisoryTransportError("OpenAI returned no weather action steps")
        return WeatherActionPlan(
            risk_level=risk_level,  # type: ignore[arg-type]
            weather_summary=str(body.get("weather_summary", "")).strip(),
            risk_note=str(body.get("risk_note", "")).strip(),
            summary=str(body.get("summary", "")).strip(),
            steps=steps[:12],
            model_name=self.settings.openai_model,
            prompt_version=PROMPT_VERSION,
        )

    async def _chat(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        if not self.settings.openai_api_key:
            raise AdvisoryConfigError("OPENAI_API_KEY is not set.")

        payload = {
            "model": self.settings.openai_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
        }

        client = self._client or httpx.AsyncClient(timeout=60)
        owns_client = self._client is None
        try:
            response = await client.post(
                _CHAT_COMPLETIONS_URL,
                headers={
                    "Authorization": f"Bearer {self.settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        except httpx.HTTPError as exc:
            raise AdvisoryTransportError(str(exc)) from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise AdvisoryHTTPError(response.status_code, response.text)

        try:
            content = response.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
        except (KeyError, IndexError, ValueError) as exc:
            raise AdvisoryTransportError(f"Unexpected OpenAI payload: {exc}") from exc
        if not isinstance(parsed, dict):
            raise AdvisoryTransportError("OpenAI did not return a JSON object")
        return parsed
