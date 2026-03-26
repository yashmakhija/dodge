import re

OFF_TOPIC_PATTERNS = [
    r"\b(write|compose|create)\b.*(poem|story|essay|song|joke|code)",
    r"\b(what is|who is|tell me about)\b.*(weather|president|capital|population)",
    r"\b(translate|convert)\b.*\b(language|french|spanish|hindi)\b",
    r"\b(play|sing|draw|paint)\b",
    r"\bhello\b.*\bhow are you\b",
    r"\b(recipe|cook|food|restaurant)\b",
    r"\b(movie|film|music|game|sport)\b",
    r"\b(stock|crypto|bitcoin|invest)\b",
]

O2C_KEYWORDS = [
    "order", "sales", "delivery", "billing", "invoice", "payment",
    "customer", "product", "material", "plant", "journal", "accounting",
    "document", "schedule", "partner", "business", "amount", "currency",
    "shipped", "delivered", "billed", "cancelled", "flow", "trace",
    "SO ", "DL ", "BD ", "JE ", "PAY ",
]

_off_topic_re = re.compile("|".join(OFF_TOPIC_PATTERNS), re.IGNORECASE)


def check_off_topic(question: str) -> str | None:
    q_lower = question.lower()

    has_o2c_context = any(kw.lower() in q_lower for kw in O2C_KEYWORDS)
    if has_o2c_context:
        return None

    if _off_topic_re.search(question):
        return "This system is designed to answer questions related to the SAP Order-to-Cash dataset only."

    return None
