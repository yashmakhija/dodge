import json
import os
import sqlite3
from pathlib import Path


def load_jsonl_file(filepath: str) -> list[dict]:
    rows = []
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_table_data(table_dir: Path) -> list[dict]:
    rows = []
    for filepath in sorted(table_dir.glob("*.jsonl")):
        rows.extend(load_jsonl_file(str(filepath)))
    return rows


def get_all_columns(rows: list[dict]) -> list[str]:
    columns = []
    seen = set()
    for row in rows:
        for key in row.keys():
            if key not in seen:
                columns.append(key)
                seen.add(key)
    return columns


def serialize_value(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return str(value)


def ingest_table(conn: sqlite3.Connection, table_name: str, rows: list[dict]):
    if not rows:
        return 0

    columns = get_all_columns(rows)
    cols_quoted = [f'"{col}"' for col in columns]
    placeholders = ", ".join(["?"] * len(columns))

    conn.execute(
        f"CREATE TABLE IF NOT EXISTS {table_name} ({', '.join(f'{c} TEXT' for c in cols_quoted)})"
    )

    values = []
    for row in rows:
        values.append(tuple(serialize_value(row.get(col)) for col in columns))

    conn.executemany(
        f"INSERT OR IGNORE INTO {table_name} ({', '.join(cols_quoted)}) VALUES ({placeholders})",
        values,
    )
    return len(values)


def ingest_all_tables(conn: sqlite3.Connection, data_dir: str) -> dict[str, int]:
    data_path = Path(data_dir)
    counts = {}

    for table_dir in sorted(data_path.iterdir()):
        if not table_dir.is_dir() or table_dir.name.startswith("."):
            continue

        rows = load_table_data(table_dir)
        count = ingest_table(conn, table_dir.name, rows)
        counts[table_dir.name] = count

    return counts
