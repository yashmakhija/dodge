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
        "Authorization": f"Bearer {config.LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=config.LLM_TIMEOUT) as client:
        response = client.post(
            f"{config.LLM_API_URL}/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage")
    return {"response": content, "usage": usage}


def _build_payload(
    question: str, system_prompt: str, history: list[dict] | None
) -> dict:
    messages = [
        {
            "role": "user",
            "content": f"<instructions>\n{system_prompt}\n</instructions>\n\nAcknowledge these instructions briefly.",
        },
        {
            "role": "assistant",
            "content": 'Understood. I will act as the SAP O2C SQL analyst, respond only with the specified JSON format, and reject off-topic queries.',
        },
    ]

    if history:
        for msg in history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": question})

    return {
        "model": config.LLM_MODEL,
        "messages": messages,
        "max_tokens": config.LLM_MAX_TOKENS,
    }
