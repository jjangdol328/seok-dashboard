"use client";
import React, { useMemo, useState } from "react";
import { Search, RefreshCw, BarChart3, Lock, LogOut } from "lucide-react";

// 배포 쉽게 하려고 shadcn/ui 의존성 없이 동작하는 버전으로 정리
// 1) band = 이벤트일 당시 고가상승률 기준
// 2) currentRate = 이벤트 고가 대비 현재 위치
// 3) 오늘 후보 = eventValue 500억 이상 + elapsedDays 가 avgLowDay 근처에 들어온 종목만
// 4) 로그인은 허용된 사용자만 통과

type Band = "화" | "수" | "목" | "금" | "토";
type Market = "KOSPI" | "KOSDAQ";

type AllowedUser = {
  username: string;
  password: string;
  displayName: string;
  role: string;
};

type RawStock = {
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
};

type CandidateRow = RawStock & {
  band: Band;
  currentRate: number;
  score: number;
  timingStatus: string;
};

type TestCase = {
  name: string;
  passed: boolean;
  detail: string;
};

const allowedUsers: AllowedUser[] = [
  { username: "yun", password: "ghftmd", displayName: "형", role: "owner" },
  { username: "won", password: "ghftmd", displayName: "형 동생", role: "member" },
];

const rawStocks: RawStock[] = [
  {
    code: "005930",
    name: "삼성전자",
    market: "KOSPI",
    eventDate: "2026-04-05",
    eventHighRate: 13.4,
    eventHighPrice: 81200,
    eventValue: 82000000000,
    currentPrice: 77800,
    elapsedDays: 2,
    avgLowDay: 2.2,
    avgHighDay: 5.8,
    avgMinLowPct: -4.9,
    avgMaxHighPct: 11.7,
    rebreakRate: 63,
    dnaType: "기본 DNA 우세",
  },
  {
    code: "035720",
    name: "카카오",
    market: "KOSPI",
    eventDate: "2026-04-06",
    eventHighRate: 20.8,
    eventHighPrice: 61200,
    eventValue: 54000000000,
    currentPrice: 57600,
    elapsedDays: 1,
    avgLowDay: 1.6,
    avgHighDay: 4.1,
    avgMinLowPct: -6.2,
    avgMaxHighPct: 14.5,
    rebreakRate: 58,
    dnaType: "밴드 DNA 강함",
  },
  {
    code: "247540",
    name: "에코프로비엠",
    market: "KOSDAQ",
    eventDate: "2026-04-03",
    eventHighRate: 16.9,
    eventHighPrice: 184000,
    eventValue: 47000000000,
    currentPrice: 175500,
    elapsedDays: 3,
    avgLowDay: 2.8,
    avgHighDay: 6.3,
    avgMinLowPct: -5.7,
    avgMaxHighPct: 10.4,
    rebreakRate: 51,
    dnaType: "기본 DNA 우세",
  },
  {
    code: "091990",
    name: "셀트리온헬스케어",
    market: "KOSDAQ",
    eventDate: "2026-04-06",
    eventHighRate: 24.6,
    eventHighPrice: 71200,
    eventValue: 91000000000,
    currentPrice: 66000,
    elapsedDays: 1,
    avgLowDay: 1.3,
    avgHighDay: 3.9,
    avgMinLowPct: -7.9,
    avgMaxHighPct: 9.1,
    rebreakRate: 47,
    dnaType: "고변동 밴드",
  },
];

function getBand(eventHighRate: number): Band {
  if (eventHighRate < 15) return "화";
  if (eventHighRate < 18.75) return "수";
  if (eventHighRate < 22.5) return "목";
  if (eventHighRate < 26.25) return "금";
  return "토";
}

function calcCurrentRate(currentPrice: number, eventHighPrice: number): number {
  if (!eventHighPrice) return 0;
  return Number((((currentPrice - eventHighPrice) / eventHighPrice) * 100).toFixed(2));
}

function isNearAverageLowDay(elapsedDays: number, avgLowDay: number): boolean {
  return elapsedDays >= Math.max(1, avgLowDay - 1) && elapsedDays <= avgLowDay + 1;
}

function makeTimingStatus(elapsedDays: number, avgLowDay: number): string {
  const gap = elapsedDays - avgLowDay;
  if (Math.abs(gap) <= 0.5) return "평균 저점일 근처";
  if (gap < 0) return "평균 저점일 직전";
  return "평균 저점 통과 후 관찰";
}

function makeScore(row: RawStock, currentRate: number): number {
  const lowGap = Math.abs(row.elapsedDays - row.avgLowDay);
  const timingScore = Math.max(0, 40 - lowGap * 20);
  const priceScore = Math.max(0, 30 - Math.abs(currentRate - row.avgMinLowPct) * 4);
  const rebreakScore = row.rebreakRate * 0.4;
  return Number((timingScore + priceScore + rebreakScore).toFixed(1));
}

function formatSignedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatKoreanMoney(value: number): string {
  const eok = value / 100000000;
  return `${eok.toFixed(0)}억`;
}

function toCandidateRow(row: RawStock): CandidateRow {
  const currentRate = calcCurrentRate(row.currentPrice, row.eventHighPrice);
  return {
    ...row,
    band: getBand(row.eventHighRate),
    currentRate,
    score: makeScore(row, currentRate),
    timingStatus: makeTimingStatus(row.elapsedDays, row.avgLowDay),
  };
}

function buildTestCases(): TestCase[] {
  const testRate = calcCurrentRate(77800, 81200);
  const testBand1 = getBand(13.4);
  const testBand2 = getBand(24.6);
  const testNear1 = isNearAverageLowDay(2, 2.2);
  const testNear2 = isNearAverageLowDay(5, 2.2);
  const testMoney = formatKoreanMoney(82000000000);

  return [
    {
      name: "현재등락률 계산",
      passed: testRate === -4.19,
      detail: `예상 -4.19%, 실제 ${testRate}%`,
    },
    {
      name: "밴드 계산 - 화",
      passed: testBand1 === "화",
      detail: `예상 화, 실제 ${testBand1}`,
    },
    {
      name: "밴드 계산 - 금",
      passed: testBand2 === "금",
      detail: `예상 금, 실제 ${testBand2}`,
    },
    {
      name: "평균 저점일 근처 필터 포함",
      passed: testNear1 === true,
      detail: `elapsedDays=2, avgLowDay=2.2 → ${String(testNear1)}`,
    },
    {
      name: "평균 저점일 근처 필터 제외",
      passed: testNear2 === false,
      detail: `elapsedDays=5, avgLowDay=2.2 → ${String(testNear2)}`,
    },
    {
      name: "거래대금 표시 포맷",
      passed: testMoney === "820억",
      detail: `예상 820억, 실제 ${testMoney}`,
    },
  ];
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 pb-3 ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 pt-0 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl font-bold ${className}`}>{children}</h2>;
}

function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mt-2 text-sm text-slate-600 ${className}`}>{children}</p>;
}

function AppButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
  };

  return (
    <button type={type} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 ${props.className || ""}`} />;
}

function BadgePill({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "secondary" | "outline" }) {
  const styles = {
    default: "bg-slate-900 text-white border border-slate-900",
    secondary: "bg-slate-100 text-slate-900 border border-slate-200",
    outline: "bg-white text-slate-700 border border-slate-300",
  };

  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[variant]}`}>{children}</span>;
}

function StatBox({ title, value, desc }: { title: string; value: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{desc}</p>
    </div>
  );
}

function LoginScreen({
  username,
  password,
  setUsername,
  setPassword,
  onLogin,
  error,
}: {
  username: string;
  password: string;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  onLogin: () => void;
  error: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="rounded-3xl">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <BadgePill>SEOK</BadgePill>
              <BadgePill variant="secondary">허용 사용자 전용</BadgePill>
            </div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Lock className="h-5 w-5" />
              로그인
            </CardTitle>
            <CardDescription>
              형이 허용한 사용자만 들어오게 만든 간단 로그인 화면이다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">아이디</p>
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="아이디 입력" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">비밀번호</p>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onLogin();
                }}
              />
            </div>
            {error ? <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}
            <AppButton onClick={onLogin} className="w-full">
              <Lock className="h-4 w-4" />
              로그인
            </AppButton>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              지금은 데모라서 프론트에 허용 계정이 들어가 있다. 실제 배포할 때는 서버에서 체크하도록 바꾸면 된다.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
  const [search, setSearch] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentUser, setCurrentUser] = useState<AllowedUser | null>(null);

  const allRows = useMemo(() => rawStocks.map(toCandidateRow), []);
  const testCases = useMemo(() => buildTestCases(), []);

  const todayCandidates = useMemo(() => {
    return allRows
      .filter((row) => row.eventValue >= 50000000000)
      .filter((row) => isNearAverageLowDay(row.elapsedDays, row.avgLowDay))
      .sort((a, b) => b.score - a.score);
  }, [allRows]);

  const searchedStocks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return [];
    return allRows.filter((row) =>
      [row.name, row.code, row.market, row.band, row.dnaType].join(" ").toLowerCase().includes(keyword)
    );
  }, [search, allRows]);

  const handleLogin = () => {
    const matchedUser = allowedUsers.find(
      (user) => user.username === username.trim() && user.password === password
    );

    if (!matchedUser) {
      setLoginError("허용되지 않은 계정이거나 비밀번호가 맞지 않는다.");
      return;
    }

    setCurrentUser(matchedUser);
    setLoginError("");
    setPassword("");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsername("");
    setPassword("");
    setLoginError("");
    setSearch("");
  };

  if (!currentUser) {
    return (
      <LoginScreen
        username={username}
        password={password}
        setUsername={setUsername}
        setPassword={setPassword}
        onLogin={handleLogin}
        error={loginError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <BadgePill>SEOK</BadgePill>
              <BadgePill variant="secondary">이벤트 DNA</BadgePill>
              <BadgePill variant="outline">평균 저점 타이밍</BadgePill>
              <BadgePill variant="outline">접속자 {currentUser.displayName}</BadgePill>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">seok 후보/검색 대시보드</h1>
            <p className="mt-2 text-sm text-slate-600">
              밴드는 이벤트일 당시 고가상승률로 고정하고, 현재등락률은 평균 저점일 근처에서 들어온 현재 위치로 계산한다.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <AppButton>
              <RefreshCw className="h-4 w-4" />
              업데이트 실행
            </AppButton>
            <AppButton variant="outline">
              <BarChart3 className="h-4 w-4" />
              분석 다시 계산
            </AppButton>
            <AppButton variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              로그아웃
            </AppButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatBox title="오늘 후보" value={`${todayCandidates.length}개`} desc="이벤트일 거래대금 500억 이상 + 평균 저점일 근처만 포함" />
          <StatBox title="검색 가능 종목" value={`${allRows.length}개`} desc="종목명/코드로 바로 DNA 조회" />
          <StatBox title="계산 기준" value="이벤트 고가 대비" desc="현재등락률 + 이벤트일 거래대금 500억 필터 적용" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>종목 바로 검색</CardTitle>
            <CardDescription>
              종목명이나 코드만 치면 이벤트일 고가상승률 기준 밴드, 이벤트일 거래대금, 평균 저점일 근처 현재등락률을 바로 본다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <TextInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="예: 삼성전자, 005930, 카카오"
                className="pl-9"
              />
            </div>

            <div className="mt-4 space-y-3">
              {!search.trim() ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  종목명이나 종목코드를 입력하면 바로 결과가 나온다.
                </div>
              ) : searchedStocks.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  검색 결과가 없다. 나중에 API 연결하면 DB 실시간 검색으로 바꾸면 된다.
                </div>
              ) : (
                searchedStocks.map((item) => (
                  <div key={item.code} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{item.name}</p>
                          <BadgePill variant="outline">{item.code}</BadgePill>
                          <BadgePill>{item.market}</BadgePill>
                          <BadgePill variant="secondary">
                            {item.band} / 이벤트 고가 {formatSignedPercent(item.eventHighRate)}
                          </BadgePill>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{item.dnaType}</p>
                      </div>
                      <div className="text-sm font-semibold">
                        현재등락률(평균 저점 근처) {formatSignedPercent(item.currentRate)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-7">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">이벤트일</p>
                        <p className="mt-1 font-bold">{item.eventDate}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">경과일</p>
                        <p className="mt-1 font-bold">{item.elapsedDays}일차</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">이벤트 거래대금</p>
                        <p className="mt-1 font-bold">{formatKoreanMoney(item.eventValue)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">평균 저점일</p>
                        <p className="mt-1 font-bold">{item.avgLowDay}일</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">평균 고점일</p>
                        <p className="mt-1 font-bold">{item.avgHighDay}일</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">평균 최저점%</p>
                        <p className="mt-1 font-bold">{formatSignedPercent(item.avgMinLowPct)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">평균 최고점%</p>
                        <p className="mt-1 font-bold">{formatSignedPercent(item.avgMaxHighPct)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>오늘 후보</CardTitle>
            <CardDescription>
              이벤트일 거래대금 500억 이상이면서 elapsedDays 가 avgLowDay 근처에 들어온 종목만 오늘 후보에 넣는다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    {[
                      "종목",
                      "시장",
                      "밴드",
                      "이벤트 고가%",
                      "이벤트일",
                      "이벤트 거래대금",
                      "경과일",
                      "평균 저점일",
                      "현재등락률",
                      "평균 최저점%",
                      "재돌파",
                      "상태",
                      "점수",
                    ].map((head) => (
                      <th key={head} className="px-3 py-3 font-semibold text-slate-700">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayCandidates.map((item) => (
                    <tr key={item.code} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.code}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3">{item.market}</td>
                      <td className="px-3 py-3"><BadgePill variant="secondary">{item.band}</BadgePill></td>
                      <td className="px-3 py-3">{formatSignedPercent(item.eventHighRate)}</td>
                      <td className="px-3 py-3">{item.eventDate}</td>
                      <td className="px-3 py-3">{formatKoreanMoney(item.eventValue)}</td>
                      <td className="px-3 py-3">{item.elapsedDays}일차</td>
                      <td className="px-3 py-3">{item.avgLowDay}일</td>
                      <td className="px-3 py-3">{formatSignedPercent(item.currentRate)}</td>
                      <td className="px-3 py-3">{formatSignedPercent(item.avgMinLowPct)}</td>
                      <td className="px-3 py-3">{item.rebreakRate}%</td>
                      <td className="px-3 py-3"><BadgePill variant="outline">{item.timingStatus}</BadgePill></td>
                      <td className="px-3 py-3">{item.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>내부 계산 테스트</CardTitle>
            <CardDescription>핵심 계산이 깨졌는지 바로 확인하는 간단 테스트</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {testCases.map((test) => (
              <div key={test.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
                <div>
                  <p className="font-medium">{test.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{test.detail}</p>
                </div>
                <BadgePill variant={test.passed ? "secondary" : "outline"}>{test.passed ? "통과" : "실패"}</BadgePill>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>백엔드 계산 연결 가이드</CardTitle>
            <CardDescription>실제 DB/API 연결할 때 그대로 옮기면 되는 계산식</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold">1. 밴드 계산</p>
              <pre className="mt-2 overflow-x-auto text-xs">{`band = getBand(event_high_rate)`}</pre>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold">2. 현재등락률 계산</p>
              <pre className="mt-2 overflow-x-auto text-xs">{`current_rate = (current_price - event_high_price) / event_high_price * 100`}</pre>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold">3. 오늘 후보 조건</p>
              <pre className="mt-2 overflow-x-auto text-xs">{`if event_value >= 50000000000 and elapsed_days >= avg_low_day - 1 and elapsed_days <= avg_low_day + 1:
    include_candidate = True`}</pre>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold">4. 추천 API 구조</p>
              <pre className="mt-2 overflow-x-auto text-xs">{`POST /api/login
GET /api/stocks/search?q=삼성전자
GET /api/candidates/today
POST /api/run-update
POST /api/run-analysis`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

