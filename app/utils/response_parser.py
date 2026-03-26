import json


def parse_llm_response(raw: str) -> dict | None:
    raw = raw.strip()

    if raw.startswith("```"):
        lines = raw.split("\n")
        lines = [l for l in lines if not l.startswith("```")]
        raw = "\n".join(lines).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    extracted = _extract_json_object(raw)
    if extracted:
        try:
            return json.loads(extracted)
        except json.JSONDecodeError:
            pass

    return None


def _extract_json_object(text: str) -> str | None:
    depth = 0
    start = None
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                return text[start : i + 1]
    return None


def format_answer(explanation: str, data: list[dict]) -> str:
    parts = [explanation]

    if len(data) <= 10:
        for row in data:
            items = [f"**{k}**: {v}" for k, v in row.items() if v is not None]
            parts.append("- " + ", ".join(items))
    else:
        parts.append(f"\n*Showing {len(data)} results in the table below.*")

    return "\n".join(parts)
