"""두 번 실행해 리스트·JSON·SQLite의 수명 차이를 비교합니다."""

import json
import sqlite3
from pathlib import Path


folder = Path(__file__).resolve().parent / "instance"
folder.mkdir(parents=True, exist_ok=True)
text = "부산에서는 흰여울문화마을의 바다 골목을 걸어 보세요."

# Python 리스트는 프로그램을 다시 실행할 때 빈 상태로 시작합니다.
memory_recommendations = []
memory_recommendations.append(text)

# JSON 파일은 이전 목록을 읽은 뒤 새 추천을 더해 다시 저장합니다.
json_path = folder / "mini_recommendations.json"
if json_path.exists():
    file_recommendations = json.loads(json_path.read_text(encoding="utf-8"))
else:
    file_recommendations = []
file_recommendations.append(text)
json_path.write_text(
    json.dumps(file_recommendations, ensure_ascii=False, indent=2), encoding="utf-8"
)

# SQLite는 표에 한 행을 추가하고 SQL로 전체 행 수를 셉니다.
db_path = folder / "mini_recommendations.db"
with sqlite3.connect(db_path) as db:
    db.execute(
        "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, content TEXT NOT NULL)"
    )
    db.execute("INSERT INTO notes (content) VALUES (?)", (text,))
    db.commit()
    db_count = db.execute("SELECT COUNT(*) FROM notes").fetchone()[0]

print(f"Python 리스트: {len(memory_recommendations)}개")
print(f"JSON 파일: {len(file_recommendations)}개")
print(f"SQLite DB: {db_count}개")
