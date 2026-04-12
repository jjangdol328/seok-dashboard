from __future__ import annotations

from typing import Any
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 형이 허용한 사용자만 통과
ALLOWED_USERS = [
    {"username": "seok", "password": "ghftmd", "displayName": "나", "role": "owner"},
    {"username": "won", "password": "ghftmd", "displayName": "형", "role": "member"},
]

# 지금은 샘플 데이터
# 나중에 여기만 SQLite/키움 결과 조회로 교체하면 됨
# 🔥 실제 DB 연결 (형 데이터 사용)
import sqlite3
import os

DB_PATH = r"C:\seok\analysis\analysis.db"


def load_stocks_from_db():
    if not os.path.exists(DB_PATH):
        return []

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT * FROM event_analysis_20d LIMIT 200")
        rows = cursor.fetchall()
    except Exception:
        conn.close()
        return []

    result = []
    for r in rows:
        row = dict(r)
        result.append({
            "code": row.get("code", ""),
            "name": row.get("name", ""),
            "market": row.get("market", "KOSPI"),
            "eventDate": row.get("date", ""),
            "eventHighRate": row.get("event_high_rate", 0) or 0,
            "eventHighPrice": 100.0,  # event_analysis_20d에는 이벤트 고가 원본값이 없어서 임시 기준값 사용
            "eventValue": float(row.get("value_ratio", 0) or 0) * 100000000,  # 임시 환산값
            "currentPrice": 100.0 + float(row.get("event_close_rate", 0) or 0),
            "elapsedDays": row.get("min_low_day", 0) or 0,
            "avgLowDay": row.get("min_low_day", 0) or 0,
            "avgHighDay": row.get("max_high_day", 0) or 0,
            "avgMinLowPct": row.get("min_low_pct", 0) or 0,
            "avgMaxHighPct": row.get("max_high_pct", 0) or 0,
            "rebreakRate": 100 if row.get("rebreak", 0) else 0,
            "dnaType": row.get("event_band", ""),
        })

    conn.close()
    return result



# 🔥 계산 함수들 (누락된 부분 복구)

def calc_current_rate(current_price, event_high_price):
    if not event_high_price:
        return 0
    return round((current_price - event_high_price) / event_high_price * 100, 2)


def get_band(rate):
    if rate is None:
        return "없음"
    if rate < 15:
        return "화"
    elif rate < 18.75:
        return "수"
    elif rate < 22.5:
        return "목"
    elif rate < 26.25:
        return "금"
    elif rate < 29.5:
        return "토"
    return "LIMIT_UP"


def make_score(item, current_rate: float) -> float:
    low_gap = abs(item.get("elapsedDays", 0) - item.get("avgLowDay", 0))
    timing_score = max(0, 40 - low_gap * 20)
    price_score = max(0, 30 - abs(current_rate - item.get("avgMinLowPct", 0)) * 4)
    rebreak_score = item.get("rebreakRate", 0) * 0.4
    return round(timing_score + price_score + rebreak_score, 1)


def make_timing_status(elapsed, avg):
    if abs(elapsed - avg) <= 1:
        return "최적"
    elif abs(elapsed - avg) <= 3:
        return "근접"
    return "이탈"


def is_near_average_low_day(elapsed, avg):
    return abs(elapsed - avg) <= 3


def enrich_item(item: dict[str, Any]) -> dict[str, Any]:
    current_rate = calc_current_rate(item.get("currentPrice", 0), item.get("eventHighPrice", 0))
    result = dict(item)
    result["band"] = get_band(item.get("eventHighRate", 0))
    result["currentRate"] = current_rate
    result["score"] = make_score(item, current_rate)
    result["timingStatus"] = make_timing_status(item.get("elapsedDays", 0), item.get("avgLowDay", 0))
    return result


@app.get("/")
def root() -> Any:
    return jsonify({"ok": True, "message": "seok flask api running"})


@app.post("/api/login")
def login() -> Any:
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    matched = next(
        (
            {
                "username": user["username"],
                "displayName": user["displayName"],
                "role": user["role"],
            }
            for user in ALLOWED_USERS
            if user["username"] == username and user["password"] == password
        ),
        None,
    )

    if not matched:
        return jsonify({"ok": False, "message": "허용되지 않은 계정이거나 비밀번호가 맞지 않는다."}), 401

    return jsonify({"ok": True, "user": matched})


@app.get("/api/candidates/today")
def get_today_candidates() -> Any:
    items = []
    for item in RAW_STOCKS:
       # if float(item.get("eventValue", 0) or 0) < 50000000000:
        #    continue
        if not is_near_average_low_day(float(item.get("elapsedDays", 0) or 0), float(item.get("avgLowDay", 0) or 0)):
            continue
        items.append(enrich_item(item))

    return jsonify({"items": items, "count": len(items)})


@app.get("/api/stocks/search")
def search_stocks() -> Any:
    q = str(request.args.get("q", "")).strip().lower()
    if not q:
        return jsonify({"items": [], "count": 0})

    items = []
    for item in RAW_STOCKS:
        text = " ".join([
            str(item.get("code", "")),
            str(item.get("name", "")),
            str(item.get("market", "")),
            str(item.get("dnaType", "")),
        ]).lower()
        if q in text:
            items.append(enrich_item(item))

    return jsonify({"items": items, "count": len(items)})


@app.post("/api/run-update")
def run_update() -> Any:
    # 나중에 여기서 키움 수집 스크립트 호출
    return jsonify({"ok": True, "message": "업데이트 실행 자리"})


@app.post("/api/run-analysis")
def run_analysis() -> Any:
    # 나중에 여기서 이벤트 분석 / DNA 분석 스크립트 호출
    return jsonify({"ok": True, "message": "분석 실행 자리"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
