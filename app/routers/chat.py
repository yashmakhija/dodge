from fastapi import APIRouter
from pydantic import BaseModel

from app.services.guardrails import check_off_topic
from app.services.llm_service import call_llm
from app.services.sql_executor import execute_safe_query
from app.utils.response_parser import format_answer, parse_llm_response

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    history: list[dict] | None = None


class ChatResponse(BaseModel):
    answer: str
    sql: str | None = None
    data: list[dict] | None = None
    error: str | None = None
    off_topic: bool = False


@router.post("/query", response_model=ChatResponse)
def chat_query(req: ChatRequest):
    off_topic_msg = check_off_topic(req.question)
    if off_topic_msg:
        return ChatResponse(answer=off_topic_msg, off_topic=True)

    try:
        llm_result = call_llm(req.question, req.history)
    except Exception as e:
        return ChatResponse(
            answer="Sorry, I'm having trouble connecting to the AI service.",
            error=str(e),
        )

    raw_response = llm_result["response"]
    parsed = parse_llm_response(raw_response)

    if not parsed:
        return ChatResponse(answer=raw_response)

    if parsed.get("off_topic"):
        return ChatResponse(
            answer=parsed.get(
                "message",
                "I can only answer questions about the SAP Order-to-Cash dataset.",
            ),
            off_topic=True,
        )

    sql = parsed.get("sql")
    explanation = parsed.get("explanation", "")

    if not sql:
        return ChatResponse(answer=explanation or raw_response)

    result = execute_safe_query(sql)

    if not result["success"]:
        return ChatResponse(
            answer=f"{explanation}\n\n(Query failed: {result['error']})",
            sql=sql,
            error=result["error"],
        )

    if result["data"]:
        answer = format_answer(explanation, result["data"])
    else:
        answer = f"{explanation}\n\nNo results found for this query."

    return ChatResponse(answer=answer, sql=sql, data=result["data"][:50])
