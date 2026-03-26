from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import graph

load_dotenv()

table_counts: dict[str, int] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global table_counts
    table_counts = init_db()
    total = sum(table_counts.values())
    print(f"Database ready: {len(table_counts)} tables, {total} total rows")
    yield


app = FastAPI(title="Dodge AI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(graph.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "tables": len(table_counts),
        "total_rows": sum(table_counts.values()),
        "table_counts": table_counts,
    }
