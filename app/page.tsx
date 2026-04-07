"use client";

import React, { useEffect, useMemo, useState } from "react";

type Band = "화" | "수" | "목" | "금" | "토" | "LIMIT_UP" | "없음";
type Market = "KOSPI" | "KOSDAQ" | string;

type CandidateRow = {
  code: string;
  name: string;
  market: Market;
  eventDate: string;
  eventHighRate: number;
  eventHighPrice: number;
  eventValue: number;
  currentPrice: number;
  elapsedDays: number;
  avgLowDay: number;
  avgHighDay: number;
  avgMinLowPct: number;
  avgMaxHighPct: number;
  rebreakRate: number;
  dnaType: string;
  band?: Band;
  currentRate?: number;
  score?: number;
  timingStatus?: string;
};

type LoginUser = {
  username: string;
  displayName: string;
  role: string;
};

type LoginResponse = {
  ok: boolean;
  message?: string;
  user?: LoginUser;
};

type CandidateResponse = {
  items: CandidateRow[];
  count: number;
};

function formatSignedPercent(value: number | undefined) {
  const n = Number(value || 0);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatEok(value: number | undefined) {
  const n = Number(value || 0);
  return `${(n / 100000000).toFixed(0)}억`;
}

function getBandColor(band: string | undefined) {
  switch (band) {
    case "화":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "수":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "목":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "금":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "토":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "LIMIT_UP":
      return "bg-violet-100 text-violet-700 border-violet-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function bandLabel(rate: number) {
  if (rate < 15) return "화 밴드";
  if (rate < 18.75) return "수 밴드";
  if (rate < 22.5) return "목 밴드";
  if (rate < 26.25) return "금 밴드";
  if (rate < 29.5) return "토 밴드";
  return "상한가 DNA";
}

function MiniChip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function Panel({ title, desc, value }: { title: string; desc: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-4xl font-black tracking-tight text-slate-900">{value}</div>
      <div className="mt-3 text-sm text-slate-500">{desc}</div>
    </div>
  );
}

function DNAHero({ topBand, count }: { topBand: CandidateRow[]; count: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <MiniChip className="border-white/15 bg-white/10 text-white">SEOK</MiniChip>
          <MiniChip className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">밴드 DNA 중심</MiniChip>
          <MiniChip className="border-white/15 bg-white/10 text-slate-100">실제 API 연결 구조</MiniChip>
        </div>
        <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-5xl">
          밴드 DNA 기준으로
          <br />
          오늘 타이밍만 보게 다시 정리했다
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
          이벤트일 고가상승률로 밴드를 먼저 나누고, 평균 저점일 근처에 들어온 종목만 다시 걸러서 보여준다.
          한눈에 밴드 강도, 현재 위치, 평균 눌림, 재돌파 성격까지 보도록 재배치했다.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-300">오늘 후보</div>
            <div className="mt-2 text-3xl font-black">{count}개</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-300">핵심 기준</div>
            <div className="mt-2 text-lg font-bold">밴드 → 저점일 → 현재등락률</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-300">후보 조건</div>
            <div className="mt-2 text-lg font-bold">500억 이상 + 평균 저점 근처</div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-500">오늘 밴드 DNA 상위</div>
            <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">후보 톱 3</div>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">점수 기준</div>
        </div>
        <div className="mt-5 space-y-3">
          {topBand.map((item) => (
            <div key={item.code} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-base font-bold text-slate-900">{item.name}</div>
                    <MiniChip className={getBandColor(item.band)}>{item.band}</MiniChip>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{item.code} · {item.market}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">DNA 점수</div>
                  <div className="text-2xl font-black tracking-tight text-slate-900">{Number(item.score || 0).toFixed(1)}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-50 px-2 py-3">
                  <div className="text-slate-400">이벤트 고가</div>
                  <div className="mt-1 font-bold text-slate-900">{formatSignedPercent(item.eventHighRate)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-3">
                  <div className="text-slate-400">현재 위치</div>
                  <div className="mt-1 font-bold text-slate-900">{formatSignedPercent(item.currentRate)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-3">
                  <div className="text-slate-400">평균 저점일</div>
                  <div className="mt-1 font-bold text-slate-900">{item.avgLowDay}일</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [username, setUsername] = useState("yun");
  const [password, setPassword] = useState("ghftmd");
  const [user, setUser] = useState<LoginUser | null>(null);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [search, setSearch] = useState("");

  const apiBase = "http://127.0.0.1:5000";

  const fetchCandidates = async () => {
    const res = await fetch(`${apiBase}/api/candidates/today`);
    const data: CandidateResponse = await res.json();
    setRows(data.items || []);
  };

  useEffect(() => {
    if (user) {
      fetchCandidates().catch(() => undefined);
    }
  }, [user]);

  const handleLogin = async () => {
    setLoading(true);
    setLoginError("");
    try {
      const res = await fetch(`${apiBase}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data: LoginResponse = await res.json();
      if (!res.ok || !data.ok || !data.user) {
        setLoginError(data.message || "로그인 실패");
        setLoading(false);
        return;
      }
      setUser(data.user);
    } catch {
      setLoginError("Flask 서버 연결 실패");
    } finally {
      setLoading(false);
    }
  };

  const visibleRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((item) => {
      return [item.name, item.code, item.market, item.band, item.dnaType]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [rows, search]);

  const topBand = useMemo(() => [...visibleRows].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 3), [visibleRows]);

  const bandSummary = useMemo(() => {
    const map = new Map<string, number>();
    visibleRows.forEach((item) => map.set(item.band || "없음", (map.get(item.band || "없음") || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [visibleRows]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex items-center gap-2">
            <MiniChip className="bg-slate-900 text-white border-slate-900">SEOK</MiniChip>
            <MiniChip className="bg-slate-100 text-slate-700 border-slate-200">밴드 DNA 대시보드</MiniChip>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight">로그인</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">허용된 사용자만 밴드 DNA 대시보드에 들어오게 구성했다.</p>
          <div className="mt-6 space-y-4">
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" placeholder="아이디" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" placeholder="비밀번호" />
            {loginError ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{loginError}</div> : null}
            <button onClick={handleLogin} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <DNAHero topBand={topBand} count={visibleRows.length} />

        <div className="grid gap-4 md:grid-cols-3">
          <Panel title="핵심 해석" value="밴드 DNA" desc="이벤트 고가상승률 기반으로 오늘 성격을 먼저 읽는다" />
          <Panel title="우선 보는 값" value="평균 저점일" desc="시간축으로 지금이 들어갈 자리인지 먼저 본다" />
          <Panel title="체크 포인트" value="현재등락률" desc="평균 최저점과 현재 위치 차이를 바로 비교한다" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-500">밴드 DNA 분포</div>
                <div className="mt-1 text-2xl font-black tracking-tight">오늘 후보 밴드 맵</div>
              </div>
              <MiniChip className="bg-slate-100 text-slate-700 border-slate-200">{visibleRows.length}개</MiniChip>
            </div>

            <div className="mt-6 space-y-3">
              {bandSummary.map(([band, count]) => (
                <div key={band} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <MiniChip className={getBandColor(band)}>{band}</MiniChip>
                      <div>
                        <div className="font-bold text-slate-900">{bandLabel(visibleRows.find((v) => (v.band || "없음") === band)?.eventHighRate || 0)}</div>
                        <div className="text-xs text-slate-500">이벤트 고가상승률 기준 묶음</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black tracking-tight text-slate-900">{count}</div>
                      <div className="text-xs text-slate-500">후보 수</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-500">밴드 DNA 검색</div>
                <div className="mt-1 text-2xl font-black tracking-tight">종목 바로 보기</div>
              </div>
              <div className="w-full sm:max-w-sm">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  placeholder="종목명, 코드, 시장, 밴드 검색"
                />
              </div>
            </div>

            <div className="mt-5 max-h-[520px] space-y-3 overflow-auto pr-1">
              {visibleRows.map((item) => (
                <div key={`${item.code}-${item.eventDate}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-slate-900">{item.name}</div>
                        <MiniChip className={getBandColor(item.band)}>{item.band}</MiniChip>
                        <MiniChip className="bg-slate-100 text-slate-700 border-slate-200">{item.market}</MiniChip>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{item.code} · 이벤트일 {item.eventDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">DNA 점수</div>
                      <div className="text-3xl font-black tracking-tight text-slate-900">{Number(item.score || 0).toFixed(1)}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs text-slate-400">이벤트 고가상승률</div>
                      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{formatSignedPercent(item.eventHighRate)}</div>
                      <div className="mt-1 text-xs text-slate-500">{bandLabel(item.eventHighRate)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs text-slate-400">현재등락률</div>
                      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{formatSignedPercent(item.currentRate)}</div>
                      <div className="mt-1 text-xs text-slate-500">평균 최저점 {formatSignedPercent(item.avgMinLowPct)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs text-slate-400">시간 위치</div>
                      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{item.elapsedDays}일차</div>
                      <div className="mt-1 text-xs text-slate-500">평균 저점일 {item.avgLowDay}일</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs text-slate-400">이벤트 거래대금</div>
                      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{formatEok(item.eventValue)}</div>
                      <div className="mt-1 text-xs text-slate-500">재돌파 {item.rebreakRate}%</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <MiniChip className="bg-indigo-50 text-indigo-700 border-indigo-200">{item.timingStatus || "없음"}</MiniChip>
                    <MiniChip className="bg-slate-100 text-slate-700 border-slate-200">평균 고점일 {item.avgHighDay}일</MiniChip>
                    <MiniChip className="bg-slate-100 text-slate-700 border-slate-200">평균 최고점 {formatSignedPercent(item.avgMaxHighPct)}</MiniChip>
                    <MiniChip className="bg-slate-100 text-slate-700 border-slate-200">DNA 타입 {item.dnaType || "없음"}</MiniChip>
                  </div>
                </div>
              ))}

              {visibleRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  밴드 DNA 조건에 맞는 결과가 없다. 검색어를 바꾸거나 백엔드 조건을 확인하면 된다.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
