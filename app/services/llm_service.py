import httpx

from app.config import config
from app.services.prompts import build_system_prompt


def call_llm(question: str, history: list[dict] | None = None) -> dict:
    if not config.LLM_API_URL or not config.LLM_API_KEY:
        raise RuntimeError(
            "LLM_API_URL and LLM_API_KEY environment variables are required."
        )

    system_prompt = build_system_prompt()
    payload = _build_payload(question, system_prompt, history)
    headers = {
        "X-API-Key": config.LLM_API_KEY,
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=config.LLM_TIMEOUT) as client:
        response = client.post(
            f"{config.LLM_API_URL}/chat",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()

    data = response.json()
    return {"response": data.get("response", ""), "usage": data.get("usage")}


def _build_payload(
    question: str, system_prompt: str, history: list[dict] | None
) -> dict:
    payload = {
        "message": question,
        "system": system_prompt,
        "model": config.LLM_MODEL,
        "max_tokens": config.LLM_MAX_TOKENS,
    }

    if history:
        payload["history"] = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in history[-10:]
        ]

    return payload
