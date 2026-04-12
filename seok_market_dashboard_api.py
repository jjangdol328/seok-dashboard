from __future__ import annotations

from typing import Any
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DB_PATH = r"C:\seok\analysis\analysis.db"

ALLOWED_USERS = [
    {"username": "seok", "password": "1234", "displayName": "형", "role": "owner"},
    {"username": "brother", "password": "1234", "displayName": "형 동생", "role": "member"},
]


def calc_current_rate(current_price: float, event_high_price: float) -> float:
    if not event_high_price:
        return 0.0
    return round(((current_price - event_high_price) / event_high_price) * 100, 2)


def get_band(rate: float | None) -> str:
    if rate is None:
        return "없음"
    if rate < 15:
        return "화"
    if rate < 18.75:
        return "수"
    if rate < 22.5:
        return "목"
    if rate < 26.25:
        return "금"
    if rate < 29.5:
        return "토"
    return "LIMIT_UP"


def make_score(item: dict[str, Any], current_rate: float) -> float:
    low_gap = abs(float(item.get("elapsedDays", 0) or 0) - float(item.get("avgLowDay", 0) or 0))
    timing_score = max(0, 40 - low_gap * 20)
    price_score = max(0, 30 - abs(current_rate - float(item.get("avgMinLowPct", 0) or 0)) * 4)
    rebreak_score = float(item.get("rebreakRate", 0) or 0) * 0.4
    return round(timing_score + price_score + rebreak_score, 1)


def make_timing_status(elapsed: float, avg: float) -> str:
    gap = elapsed - avg
    if abs(gap) <= 0.5:
        return "평균 저점일 근처"
    if gap < 0:
        return "평균 저점일 직전"
    return "평균 저점 통과 후 관찰"


def is_near_average_low_day(elapsed: float, avg: float) -> bool:
    return elapsed >= max(1, avg - 1) and elapsed <= avg + 1


def load_rows_from_db() -> list[dict[str, Any]]:
    if not os.path.exists(DB_PATH):
        return []

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    try:
        cur.execute("SELECT * FROM event_analysis_20d LIMIT 500")
        rows = cur.fetchall()
    except Exception:
        conn.close()
        return []

    result: list[dict[str, Any]] = []
    for r in rows:
        row = dict(r)

        event_high_rate = float(row.get("event_high_rate", 0) or 0)
        event_close_rate = float(row.get("event_close_rate", 0) or 0)
        min_low_day = float(row.get("min_low_day", 0) or 0)
        max_high_day = float(row.get("max_high_day", 0) or 0)
        min_low_pct = float(row.get("min_low_pct", 0) or 0)
        max_high_pct = float(row.get("max_high_pct", 0) or 0)
        rebreak = 100.0 if row.get("rebreak", 0) else 0.0
        value_ratio = float(row.get("value_ratio", 0) or 0)

        result.append(
            {
                "code": str(row.get("code", "")).zfill(6),
                "name": row.get("name", ""),
                "market": row.get("market", "KOSPI"),
                "eventDate": row.get("date", ""),
                "eventHighRate": event_high_rate,
                "eventHighPrice": 100.0,
                "eventValue": value_ratio * 100000000,
                "currentPrice": 100.0 + event_close_rate,
                "elapsedDays": min_low_day,
                "avgLowDay": min_low_day,
                "avgHighDay": max_high_day,
                "avgMinLowPct": min_low_pct,
                "avgMaxHighPct": max_high_pct,
                "rebreakRate": rebreak,
                "dnaType": row.get("event_band", ""),
            }
        )

    conn.close()
    return result


def enrich_item(item: dict[str, Any]) -> dict[str, Any]:
    event_high_price = float(item.get("eventHighPrice", 0) or 0)
    current_rate = calc_current_rate(
        float(item.get("currentPrice", 0) or 0),
        event_high_price,
    )

    out = dict(item)
    out["band"] = get_band(float(item.get("eventHighRate", 0) or 0))
    out["currentRate"] = current_rate
    out["score"] = make_score(item, current_rate)
    out["timingStatus"] = make_timing_status(
        float(item.get("elapsedDays", 0) or 0),
        float(item.get("avgLowDay", 0) or 0),
    )

    avg_min_low_pct = float(item.get("avgMinLowPct", 0) or 0)

    # 실제 최저점 퍼센트 컬럼이 아직 없으면 임시로 평균 저점보다 5% 더 깊게 가정
    worst_min_low_pct = float(item.get("worstMinLowPct", avg_min_low_pct - 5.0) or 0)

    out["avgLowTargetPrice"] = pct_to_price(event_high_price, avg_min_low_pct)
    out["worstMinLowPct"] = worst_min_low_pct
    out["worstLowTargetPrice"] = pct_to_price(event_high_price, worst_min_low_pct)

    out["daysToHighBreak"] = float(item.get("avgHighDay", 0) or 0)
    out["daysToCloseBreak"] = float(item.get("avgDaysToCloseRebreak", 0) or 0)

    return out


def filtered_candidates() -> list[dict[str, Any]]:
    rows = load_rows_from_db()
    items: list[dict[str, Any]] = []
    for item in rows:
        if not is_near_average_low_day(
            float(item.get("elapsedDays", 0) or 0),
            float(item.get("avgLowDay", 0) or 0),
        ):
            continue
        items.append(enrich_item(item))
    items.sort(key=lambda x: float(x.get("score", 0) or 0), reverse=True)
    return items


def build_market_summary(items: list[dict[str, Any]], market: str) -> dict[str, Any]:
    market_items = [x for x in items if x.get("market") == market]
    if not market_items:
        score = 0.0
        change_pct = 0.0
    else:
        score = round(sum(float(x.get("score", 0) or 0) for x in market_items) / len(market_items), 1)
        change_pct = round(sum(float(x.get("currentRate", 0) or 0) for x in market_items) / len(market_items), 2)

    if score >= 60:
        mood = "강세"
        pullback = "2~3%"
    elif score >= 45:
        mood = "횡보"
        pullback = "3~4%"
    else:
        mood = "약세"
        pullback = "4~6%"

    return {
        "market": market,
        "changePct": change_pct,
        "score": score,
        "mood": mood,
        "sampleCount": len(market_items),
        "suggestedPullback": pullback,
    }


@app.get("/")
def root() -> Any:
    return jsonify({"ok": True, "message": "seok market dashboard api running"})


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

    session["user"] = matched
    return jsonify({"ok": True, "user": matched})


@app.post("/api/logout")
def logout() -> Any:
    session.pop("user", None)
    return jsonify({"ok": True})


@app.get("/api/me")
def me() -> Any:
    user = session.get("user")
    if not user:
        return jsonify({"ok": False, "user": None}), 401
    return jsonify({"ok": True, "user": user})


@app.get("/api/candidates/today")
def api_candidates_today() -> Any:
    _, err = require_login()
    if err:
        return err

    items = filtered_candidates()
    return jsonify({"ok": True, "items": items, "count": len(items)})


@app.get("/api/candidates/search")
def api_candidates_search() -> Any:
    _, err = require_login()
    if err:
        return err

    keyword = str(request.args.get("keyword", "")).strip().lower()
    if not keyword:
        return jsonify({"ok": True, "items": [], "count": 0, "keyword": ""})

    rows = [enrich_item(x) for x in load_rows_from_db()]
    items = []

    for item in rows:
        text = " ".join(
            [
                str(item.get("code", "")),
                str(item.get("name", "")),
                str(item.get("market", "")),
                str(item.get("dnaType", "")),
                str(item.get("band", "")),
            ]
        ).lower()

        if keyword in text:
            items.append(item)

    items.sort(key=lambda x: float(x.get("score", 0) or 0), reverse=True)
    items = items[:20]

    return jsonify({"ok": True, "items": items, "count": len(items), "keyword": keyword})


@app.get("/api/market/status")
def api_market_status() -> Any:
    _, err = require_login()
    if err:
        return err

    items = filtered_candidates()
    kospi = build_market_summary(items, "KOSPI")
    kosdaq = build_market_summary(items, "KOSDAQ")
    return jsonify({
        "ok": True,
        "updatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "kospi": kospi,
        "kosdaq": kosdaq,
    })


@app.get("/api/dashboard")
def api_dashboard() -> Any:
    _, err = require_login()
    if err:
        return err

    items = filtered_candidates()
    kospi = build_market_summary(items, "KOSPI")
    kosdaq = build_market_summary(items, "KOSDAQ")
    return jsonify({
        "ok": True,
        "updatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "market": {
            "kospi": kospi,
            "kosdaq": kosdaq,
        },
        "candidates": {
            "items": items,
            "count": len(items),
        },
    })


@app.post("/api/run-update")
def api_run_update() -> Any:
    _, err = require_login()
    if err:
        return err
    return jsonify({"ok": True, "message": "업데이트 실행 자리 - 여기서 일봉/시장상황 갱신 연결"})


@app.post("/api/run-analysis")
def api_run_analysis() -> Any:
    _, err = require_login()
    if err:
        return err
    return jsonify({"ok": True, "message": "분석 실행 자리 - 여기서 밴드 DNA / 돌파일 계산 연결"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)