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
  daysToHighBreak?: number;
  daysToCloseBreak?: number;
  avgLowTargetPrice?: number;
  worstMinLowPct?: number;
  worstLowTargetPrice?: number;
};

type LoginUser = {
  username: string;
  displayName: string;
  role: string;
};

type LoginResponse = {
  ok: boolean;
  message?: string;
  user?: LoginUser | null;
};

type SearchResponse = {
  ok: boolean;
  message?: string;
  keyword?: string;
  count: number;
  items: CandidateRow[];
};

const API_BASE = "http://127.0.0.1:5000";

function formatSignedPercent(value: number | undefined) {
  const n = Number(value ?? 0);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatPrice(value: number | undefined) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("ko-KR")}원`;
}

function formatEok(value: number | undefined) {
  const n = Number(value ?? 0);
  return `${(n / 100000000).toFixed(0)}억`;
}

function getBandColor(band?: string) {
  switch (band) {
    case "화":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "수":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "목":
      return "bg-amber-100 text-amber-700 border-amber-300";
    case "금":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "토":
      return "bg-sky-100 text-sky-700 border-sky-300";
    case "LIMIT_UP":
      return "bg-violet-100 text-violet-700 border-violet-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

function getScoreColor(score?: number) {
  const n = Number(score ?? 0);
  if (n >= 70) return "text-emerald-600";
  if (n >= 55) return "text-sky-600";
  if (n >= 40) return "text-amber-600";
  return "text-slate-500";
}

function bandLabel(rate: number) {
  if (rate < 15) return "화 밴드";
  if (rate < 18.75) return "수 밴드";
  if (rate < 22.5) return "목 밴드";
  if (rate < 26.25) return "금 밴드";
  if (rate < 29.5) return "토 밴드";
  return "상한가 DNA";
}

function MiniChip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function ValueCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function ResultCard({ item }: { item: CandidateRow }) {
  const scoreClass = getScoreColor(item.score);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {item.name}
            </div>
            <MiniChip className={getBandColor(item.band)}>{item.band || "없음"}</MiniChip>
            <MiniChip className="bg-slate-100 text-slate-700 border-slate-300">
              {item.market}
            </MiniChip>
            <MiniChip className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {item.timingStatus || "없음"}
            </MiniChip>
          </div>

          <div className="mt-2 text-sm text-slate-500">
            {item.code} · 이벤트일 {item.eventDate}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 px-5 py-4 text-right">
          <div className="text-xs text-slate-400">DNA 점수</div>
          <div className={`mt-1 text-4xl font-black tracking-tight ${scoreClass}`}>
            {Number(item.score ?? 0).toFixed(1)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ValueCard
          label="이벤트 고가상승률"
          value={formatSignedPercent(item.eventHighRate)}
          sub={bandLabel(Number(item.eventHighRate || 0))}
        />
        <ValueCard
          label="현재 등락률"
          value={formatSignedPercent(item.currentRate)}
          sub={`현재가 ${formatPrice(item.currentPrice)}`}
        />
        <ValueCard
          label="평균 저점 자리"
          value={`${formatSignedPercent(item.avgMinLowPct)} / ${formatPrice(item.avgLowTargetPrice)}`}
          sub={`평균 저점일 ${Number(item.avgLowDay ?? 0).toFixed(1)}일`}
        />
        <ValueCard
          label="최저점 자리"
          value={`${formatSignedPercent(item.worstMinLowPct)} / ${formatPrice(item.worstLowTargetPrice)}`}
          sub="최악 눌림 대비 기준"
        />
        <ValueCard
          label="평균 고점 구간"
          value={`${Number(item.avgHighDay ?? 0).toFixed(1)}일`}
          sub={`평균 최고점 ${formatSignedPercent(item.avgMaxHighPct)}`}
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ValueCard
          label="경과일"
          value={`${Number(item.elapsedDays ?? 0).toFixed(1)}일차`}
          sub="이벤트 이후 현재 위치"
        />
        <ValueCard
          label="재돌파율"
          value={`${Number(item.rebreakRate ?? 0).toFixed(1)}%`}
          sub="2차 상승 성향"
        />
        <ValueCard
          label="이벤트 거래대금"
          value={formatEok(item.eventValue)}
          sub="당시 자금 강도"
        />
        <ValueCard
          label="DNA 타입"
          value={item.dnaType || "없음"}
          sub={`고점 예상 ${Number(item.daysToHighBreak ?? 0).toFixed(1)}일`}
        />
      </div>
    </div>
  );
}

function LoginScreen({
  username,
  password,
  setUsername,
  setPassword,
  onLogin,
  loading,
  error,
}: {
  username: string;
  password: string;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  onLogin: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-2">
          <MiniChip className="border-slate-900 bg-slate-900 text-white">SEOK</MiniChip>
          <MiniChip className="border-slate-300 bg-slate-100 text-slate-700">
            비공개 종목검색
          </MiniChip>
        </div>

        <h1 className="mt-5 text-3xl font-black tracking-tight">로그인</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          형이 허용한 아이디만 들어오게 만든 화면이다.
        </p>

        <div className="mt-6 space-y-4">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLogin();
            }}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="아이디"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onLogin();
            }}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
            placeholder="비밀번호"
          />

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            onClick={onLogin}
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [user, setUser] = useState<LoginUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [username, setUsername] = useState("seok");
  const [password, setPassword] = useState("1234");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [rows, setRows] = useState<CandidateRow[]>([]);

  const topOne = useMemo(() => rows[0] ?? null, [rows]);

  useEffect(() => {
    const checkMe = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me`, {
          credentials: "include",
        });

        const data: LoginResponse = await res.json();

        if (res.ok && data.ok && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkMe();
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data: LoginResponse = await res.json();

      if (!res.ok || !data.ok || !data.user) {
        setLoginError(data.message || "로그인 실패");
        return;
      }

      setUser(data.user);
    } catch {
      setLoginError("서버 연결 실패");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // 무시
    } finally {
      setUser(null);
      setRows([]);
      setSearch("");
      setSearchMessage("");
    }
  };

  const runSearch = async () => {
    const keyword = search.trim();

    if (!keyword) {
      setSearchMessage("종목명 또는 종목코드를 입력해라");
      setRows([]);
      return;
    }

    setSearchLoading(true);
    setSearchMessage("");

    try {
      const res = await fetch(
        `${API_BASE}/api/candidates/search?keyword=${encodeURIComponent(keyword)}`,
        {
          credentials: "include",
        }
      );

      const data: SearchResponse = await res.json();

      if (res.status === 401) {
        setUser(null);
        setRows([]);
        setSearchMessage("로그인이 풀렸다. 다시 로그인해라");
        return;
      }

      if (!res.ok || !data.ok) {
        setRows([]);
        setSearchMessage(data.message || "검색 실패");
        return;
      }

      setRows(data.items || []);
      setSearchMessage(`검색 결과 ${data.count}건`);
    } catch {
      setRows([]);
      setSearchMessage("검색 중 서버 연결 실패");
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearch("");
    setRows([]);
    setSearchMessage("");
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        확인 중...
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        username={username}
        password={password}
        setUsername={setUsername}
        setPassword={setPassword}
        onLogin={handleLogin}
        loading={loginLoading}
        error={loginError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <MiniChip className="border-slate-900 bg-slate-900 text-white">SEOK</MiniChip>
                <MiniChip className="border-slate-300 bg-slate-100 text-slate-700">
                  로그인 사용자: {user.displayName}
                </MiniChip>
              </div>

              <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                종목 검색만 빠르게 보게 다시 정리했다
              </div>
              <div className="mt-2 text-sm text-slate-500">
                무거운 연산은 로컬에서 돌리고, 여기서는 핵심 값만 조회한다.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900"
              >
                로그아웃
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
              placeholder="종목명 또는 종목코드 검색"
            />
            <button
              onClick={runSearch}
              disabled={searchLoading}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {searchLoading ? "검색 중..." : "검색"}
            </button>
            <button
              onClick={clearSearch}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900"
            >
              초기화
            </button>
          </div>

          {searchMessage ? (
            <div className="mt-3 text-sm text-slate-600">{searchMessage}</div>
          ) : null}
        </div>

        {topOne ? (
          <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center gap-2">
              <MiniChip className="border-white/15 bg-white/10 text-white">핵심 종목</MiniChip>
              <MiniChip className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                {topOne.name}
              </MiniChip>
              <MiniChip className="border-white/15 bg-white/10 text-slate-100">
                {topOne.code}
              </MiniChip>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div>
                <div className="text-xs text-slate-300">현재 위치</div>
                <div className="mt-2 text-3xl font-black">
                  {Number(topOne.elapsedDays ?? 0).toFixed(1)}일차
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-300">평균 저점</div>
                <div className="mt-2 text-3xl font-black">
                  {Number(topOne.avgLowDay ?? 0).toFixed(1)}일
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-300">재돌파율</div>
                <div className="mt-2 text-3xl font-black">
                  {Number(topOne.rebreakRate ?? 0).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-300">DNA 점수</div>
                <div className="mt-2 text-3xl font-black">
                  {Number(topOne.score ?? 0).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {rows.map((item) => (
            <ResultCard key={`${item.code}-${item.eventDate}`} item={item} />
          ))}

          {!searchLoading && rows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              로그인 후 종목명이나 종목코드를 검색하면 핵심 값만 보여준다.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}