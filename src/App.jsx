import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  Trophy,
  Users,
  Shuffle,
  CalendarDays,
  Swords,
  Sparkles,
  Shield,
  Zap,
  Play,
  Wand2,
} from "lucide-react";

const DEFAULT_TEAMS = [
  "国际王者荣耀冲锋队",
  "南洋勾兑",
  "农奴队",
  "跨境科研团伙",
  "啊对对队",
  "我们五个真的蔡",
  "满血即是斩杀线队",
  "IPRM",
  "LWN之剑",
  "T1",
  "贪生pass队",
  "《你相信光吗》",
  "未命名",
  "SMILE",
  "队队",
  "觉悟人机",
  "蛋仔派队",
  "谁是破绽哥",
  "农药小队",
  "你说的都队",
  "米波航空队",
  "云轫战队",
  "蜜雪冰城",
  "comp2006",
  "败方MVP的眼泪",
  "星耀守门员",
  "不会玩的队",
  "12345上山打老虎",
];

const GROUP_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(input, seed) {
  const arr = [...input];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function distributeTeams(teams, groupCount) {
  const safeGroupCount = Math.max(2, Math.min(16, groupCount));
  const groups = Array.from({ length: safeGroupCount }, (_, i) => ({
    name: `A组`.replace("A", GROUP_LABELS[i] || `第${i + 1}`),
    teams: [],
  }));

  const baseSize = Math.floor(teams.length / safeGroupCount);
  const remainder = teams.length % safeGroupCount;
  const groupSizes = Array.from({ length: safeGroupCount }, (_, i) =>
    i < remainder ? baseSize + 1 : baseSize
  );

  let idx = 0;
  for (let round = 0; idx < teams.length; round += 1) {
    const order = round % 2 === 0 ? [...groups.keys()] : [...groups.keys()].reverse();
    for (const groupIndex of order) {
      if (groups[groupIndex].teams.length < groupSizes[groupIndex] && idx < teams.length) {
        groups[groupIndex].teams.push(teams[idx]);
        idx += 1;
      }
    }
  }

  return groups;
}

function generateRoundRobin(teams) {
  const cleanTeams = teams.filter(Boolean);
  if (cleanTeams.length < 2) return [];

  const players = [...cleanTeams];
  const hasBye = players.length % 2 === 1;
  if (hasBye) players.push("轮空");

  const rounds = players.length - 1;
  const half = players.length / 2;
  const arr = [...players];
  const schedule = [];

  for (let round = 0; round < rounds; round += 1) {
    const matches = [];
    for (let i = 0; i < half; i += 1) {
      const home = arr[i];
      const away = arr[arr.length - 1 - i];
      if (home !== "轮空" && away !== "轮空") {
        matches.push({
          round: round + 1,
          teamA: round % 2 === 0 ? home : away,
          teamB: round % 2 === 0 ? away : home,
        });
      }
    }

    schedule.push({ round: round + 1, matches });

    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return schedule;
}

function buildFixtureText(groups) {
  const lines = [];
  groups.forEach((group) => {
    lines.push(group.name);
    group.teams.forEach((team, idx) => lines.push(`${idx + 1}. ${team}`));
    lines.push("对阵表：");
    const rounds = generateRoundRobin(group.teams);
    rounds.forEach((round) => {
      lines.push(`第${round.round}轮`);
      round.matches.forEach((m, idx) => {
        lines.push(`  ${idx + 1}. ${m.teamA} vs ${m.teamB}`);
      });
    });
    lines.push("");
  });
  return lines.join("\n");
}

function NeonOrb({ className = "" }) {
  return <div className={`absolute rounded-full blur-3xl ${className}`} />;
}

function buildRevealOrder(groups) {
  const order = [];
  const maxLen = Math.max(...groups.map((group) => group.teams.length), 0);
  for (let slot = 0; slot < maxLen; slot += 1) {
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      if (groups[groupIndex]?.teams[slot]) {
        order.push({ groupIndex, teamIndex: slot });
      }
    }
  }
  return order;
}

export default function NanyangCupGroupDrawApp() {
  const [groupCount, setGroupCount] = useState(8);
  const [groupCountInput, setGroupCountInput] = useState("8");
  const [seedInput, setSeedInput] = useState(String(Date.now()).slice(-6));
  const [currentSeed, setCurrentSeed] = useState(Number(String(Date.now()).slice(-6)));
  const [teams] = useState(DEFAULT_TEAMS);
  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [revealedCounts, setRevealedCounts] = useState([]);
  const [activeReveal, setActiveReveal] = useState(null);
  const [rollingTeam, setRollingTeam] = useState("");
  const [rollingGroupIndex, setRollingGroupIndex] = useState(null);
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const shuffledTeams = useMemo(() => seededShuffle(teams, currentSeed || 1), [teams, currentSeed]);
  const groups = useMemo(() => distributeTeams(shuffledTeams, groupCount), [shuffledTeams, groupCount]);

  const totalMatches = useMemo(() => {
    return groups.reduce((sum, group) => {
      const n = group.teams.length;
      return sum + (n * (n - 1)) / 2;
    }, 0);
  }, [groups]);

  const clearAnimationTimers = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!isAnimating) {
      setRevealedCounts(groups.map((group) => group.teams.length));
      setActiveReveal(null);
      setRollingTeam("");
      setRollingGroupIndex(null);
    }
  }, [groups, isAnimating]);

  useEffect(() => {
    return () => {
      clearAnimationTimers();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = (event) => {
      const isDark = event.matches;
      setPrefersDark(isDark);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    };

    updateTheme(mediaQuery);
    mediaQuery.addEventListener("change", updateTheme);

    return () => {
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  useEffect(() => {
    setGroupCountInput(String(groupCount));
  }, [groupCount]);

  const applySeed = () => {
    if (isAnimating) return;
    const parsed = Number(seedInput.replace(/\D/g, "").slice(0, 9) || Date.now().toString().slice(-6));
    setCurrentSeed(parsed || 1);
  };

  const commitGroupCount = () => {
    if (isAnimating) {
      setGroupCountInput(String(groupCount));
      return;
    }

    if (groupCountInput.trim() === "") {
      setGroupCountInput(String(groupCount));
      return;
    }

    const parsed = Number(groupCountInput);
    const safeValue = Math.max(2, Math.min(16, Number.isNaN(parsed) ? groupCount : parsed));
    setGroupCount(safeValue);
    setGroupCountInput(String(safeValue));
  };

  const redraw = () => {
    if (isAnimating) return;
    const nextSeed = Math.floor(Math.random() * 999999) + 1;
    setSeedInput(String(nextSeed));
    setCurrentSeed(nextSeed);
  };

  const copyFixtures = async () => {
    const text = buildFixtureText(groups);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const finishAnimation = () => {
    clearAnimationTimers();
    setIsAnimating(false);
    setActiveReveal(null);
    setRollingTeam("");
    setRollingGroupIndex(null);
    setRevealedCounts(groups.map((group) => group.teams.length));
  };

  const startDrawAnimation = () => {
    if (isAnimating) return;

    const revealOrder = buildRevealOrder(groups);
    if (!revealOrder.length) return;

    const flatTeams = revealOrder.map((step) => groups[step.groupIndex].teams[step.teamIndex]);

    clearAnimationTimers();
    setIsAnimating(true);
    setRevealedCounts(groups.map(() => 0));
    setActiveReveal(null);
    setRollingGroupIndex(revealOrder[0].groupIndex);
    setRollingTeam(flatTeams[0] || "");

    let revealIndex = 0;
    let rollIndex = 0;

    intervalRef.current = window.setInterval(() => {
      const currentStep = revealOrder[revealIndex];
      if (!currentStep) return;
      const remainingTeams = flatTeams.slice(revealIndex);
      if (!remainingTeams.length) return;
      setRollingGroupIndex(currentStep.groupIndex);
      setRollingTeam(remainingTeams[rollIndex % remainingTeams.length]);
      rollIndex += 1;
    }, 150);

    const revealNext = () => {
      const step = revealOrder[revealIndex];
      if (!step) {
        finishAnimation();
        return;
      }

      const finalTeam = groups[step.groupIndex].teams[step.teamIndex];
      setRollingGroupIndex(step.groupIndex);
      setRollingTeam(finalTeam);
      setActiveReveal(step);
      setRevealedCounts((prev) => {
        const nextCounts = [...prev];
        nextCounts[step.groupIndex] = Math.max(nextCounts[step.groupIndex] || 0, step.teamIndex + 1);
        return nextCounts;
      });

      revealIndex += 1;
      rollIndex = 0;

      timeoutRef.current = window.setTimeout(() => {
        setActiveReveal(null);
        if (revealIndex >= revealOrder.length) {
          timeoutRef.current = window.setTimeout(() => {
            finishAnimation();
          }, 800);
          return;
        }
        timeoutRef.current = window.setTimeout(revealNext, 750);
      }, 420);
    };

    timeoutRef.current = window.setTimeout(revealNext, 1400);
  };

  return (
    <div className={`min-h-screen overflow-hidden ${prefersDark ? "bg-[#070816] text-white" : "bg-slate-100 text-slate-950"}`}>
      <div className="pointer-events-none absolute inset-0">
        <NeonOrb className="left-[-5rem] top-[-3rem] h-72 w-72 bg-fuchsia-500/20" />
        <NeonOrb className="right-[-3rem] top-20 h-80 w-80 bg-cyan-400/20" />
        <NeonOrb className="bottom-[-8rem] left-1/3 h-96 w-96 bg-violet-500/10" />
        <div className={`absolute inset-0 ${prefersDark
          ? "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(10,14,35,0.2),rgba(7,8,22,1))]"
          : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_26%),linear-gradient(180deg,rgba(244,247,255,0.96),rgba(226,232,240,0.92))]"}`
        } />
        <div className={`absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px] ${prefersDark ? "opacity-20" : "opacity-30 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)]"}`} />
      </div>

      <div className="relative mx-auto max-w-7xl p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(168,85,247,0.18),rgba(34,211,238,0.08),transparent_60%)]" />
          <div className="relative grid gap-6 p-6 md:p-8 lg:grid-cols-[1.45fr_0.95fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-200">
                <Sparkles className="h-3.5 w-3.5" />
                NANYANG CUP 2026
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 dark:text-white md:text-6xl">
                  小组赛抽签
                  <span className="ml-3 bg-gradient-to-r from-fuchsia-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
                    赛事控制台
                  </span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                  2026“南洋杯”王者荣耀友谊大赛专用抽签页面。已载入 28 支队伍，默认采用 8 组分组模式，并自动生成每组单循环赛程，适合官网展示、直播抽签与裁判对阵发布。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
                  <div className="text-xs text-cyan-100/70">参赛队伍</div>
                  <div className="mt-1 text-2xl font-bold text-cyan-200">{teams.length}</div>
                </div>
                <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-3">
                  <div className="text-xs text-fuchsia-100/70">小组总数</div>
                  <div className="mt-1 text-2xl font-bold text-fuchsia-200">{groupCount}</div>
                </div>
                <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 px-4 py-3">
                  <div className="text-xs text-violet-100/70">总对局数</div>
                  <div className="mt-1 text-2xl font-bold text-violet-200">{totalMatches}</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-fuchsia-500/20 via-cyan-400/10 to-transparent blur-xl" />
              <div className="relative rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0e1328]/80">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-950 dark:text-white">裁判控制面板</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">公开抽签时可直接使用</div>
                  </div>
                  <div className="rounded-full border border-slate-200/80 bg-slate-100/80 p-2 dark:border-white/10 dark:bg-white/5">
                    <Shield className="h-5 w-5 text-cyan-300" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">小组数量</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={groupCountInput}
                      onChange={(e) => {
                        const nextValue = e.target.value.replace(/\D/g, "");
                        setGroupCountInput(nextValue);
                      }}
                      onBlur={commitGroupCount}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitGroupCount();
                        }
                      }}
                      className="rounded-2xl border-slate-200/80 bg-white text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                      disabled={isAnimating}
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">28 队推荐 8 组，也可自定义其他分组方案。</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">抽签种子</label>
                    <div className="flex gap-2">
                      <Input
                        value={seedInput}
                        onChange={(e) => setSeedInput(e.target.value)}
                        className="rounded-2xl border-slate-200/80 bg-white text-slate-950 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                        placeholder="输入数字即可复现"
                        disabled={isAnimating}
                      />
                      <Button
                        onClick={applySeed}
                        className="rounded-2xl bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                        disabled={isAnimating}
                      >
                        应用
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    <Button
                      onClick={redraw}
                      className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:opacity-90"
                      disabled={isAnimating}
                    >
                      <Shuffle className="mr-2 h-4 w-4" />
                      重新抽签
                    </Button>
                    <Button
                      onClick={copyFixtures}
                      variant="secondary"
                      className="rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/15"
                      disabled={isAnimating}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? "已复制" : "复制对阵表"}
                    </Button>
                  </div>

                  <Button
                    onClick={startDrawAnimation}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 text-slate-950 hover:opacity-90"
                    disabled={isAnimating}
                  >
                    {isAnimating ? <Wand2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    {isAnimating ? "抽签动画进行中" : "开始抽签动画"}
                  </Button>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge className="rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                      当前种子：{currentSeed}
                    </Badge>
                    <Badge className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200 hover:bg-fuchsia-400/10">
                      单循环赛制
                    </Badge>
                    {isAnimating && (
                      <Badge className="rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/10">
                        公开抽签演示中
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {isAnimating && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 overflow-hidden rounded-[28px] border border-amber-400/20 bg-gradient-to-r from-amber-400/10 via-orange-400/10 to-rose-500/10 p-5 shadow-xl backdrop-blur-xl"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-amber-200/70">
                  <Trophy className="h-4 w-4" />
                  Live Draw
                </div>
                <div className="mt-1 text-lg font-bold text-slate-950 dark:text-white">抽签滚动中，请锁定当前落位</div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-black/20">
                <div className="rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1 text-sm font-black text-amber-100">
                  {rollingGroupIndex !== null ? `${groups[rollingGroupIndex]?.name} 落位中` : "等待中"}
                </div>
                <motion.div
                  key={rollingTeam}
                  initial={{ opacity: 0.35, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className="min-w-[180px] rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2 text-center text-sm font-bold text-slate-950 dark:border-white/10 dark:bg-white/10 dark:text-white md:min-w-[260px]"
                >
                  {rollingTeam || "抽签准备中"}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        <Tabs defaultValue="draw" className="mt-6 space-y-5">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-slate-200/80 bg-white/80 p-1 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <TabsTrigger
              value="draw"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-500 data-[state=active]:to-violet-500 data-[state=active]:text-white"
            >
              抽签结果
            </TabsTrigger>
            <TabsTrigger
              value="fixtures"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
            >
              对阵表
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white"
            >
              全部队伍
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              <AnimatePresence>
                {groups.map((group, groupIndex) => {
                  const visibleTeams = group.teams.slice(0, revealedCounts[groupIndex] || 0);
                  const unrevealedCount = group.teams.length - visibleTeams.length;
                  const isActiveGroup = activeReveal?.groupIndex === groupIndex;

                  return (
                    <motion.div
                      key={`${group.name}-${currentSeed}-${groupCount}`}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0, scale: isActiveGroup ? 1.02 : 1 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: groupIndex * 0.04 }}
                    >
                      <Card
                        className={`group relative h-full overflow-hidden rounded-[28px] border bg-white/80 shadow-xl backdrop-blur-xl transition-all duration-300 dark:bg-white/5 ${
                          isActiveGroup
                            ? "border-amber-400/50 shadow-amber-500/10"
                            : "border-slate-200/80 hover:-translate-y-1 hover:border-fuchsia-400/30 hover:bg-white dark:border-white/10 dark:hover:bg-white/[0.07]"
                        }`}
                      >
                        <div
                          className={`absolute inset-x-0 top-0 h-1 ${
                            isActiveGroup
                              ? "bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500"
                              : "bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-violet-500"
                          }`}
                        />
                        <div
                          className={`absolute right-[-40px] top-[-40px] h-28 w-28 rounded-full blur-2xl transition-all duration-300 ${
                            isActiveGroup ? "bg-amber-400/25" : "bg-fuchsia-500/15 group-hover:bg-cyan-400/20"
                          }`}
                        />
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-500">Group Stage</div>
                              <CardTitle className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{group.name}</CardTitle>
                            </div>
                            <Badge className="rounded-full border border-slate-200/80 bg-slate-100/80 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100">
                              {visibleTeams.length}/{group.teams.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2.5">
                            <AnimatePresence>
                              {visibleTeams.map((team, idx) => {
                                const isNewReveal =
                                  activeReveal?.groupIndex === groupIndex && activeReveal?.teamIndex === idx;
                                return (
                                  <motion.div
                                    key={`${team}-${idx}`}
                                    initial={{ opacity: 0, scale: 0.92, y: 18 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.28 }}
                                    className={`flex items-center gap-3 rounded-2xl border p-3 ${
                                      isNewReveal
                                        ? "border-amber-300/40 bg-amber-300/10 shadow-lg shadow-amber-500/10"
                                        : "border-slate-200/80 bg-slate-50 dark:border-white/8 dark:bg-[#121933]/80"
                                    }`}
                                  >
                                    <div
                                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-lg ${
                                        isNewReveal
                                          ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30"
                                          : "bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-fuchsia-500/20"
                                      }`}
                                    >
                                      {idx + 1}
                                    </div>
                                    <div className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {team}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>

                            {Array.from({ length: unrevealedCount }).map((_, placeholderIdx) => {
                              const slotIndex = visibleTeams.length + placeholderIdx;
                              const isRollingSlot =
                                isAnimating &&
                                !activeReveal &&
                                rollingGroupIndex === groupIndex &&
                                slotIndex === (revealedCounts[groupIndex] || 0);

                              return (
                                <motion.div
                                  key={`${group.name}-placeholder-${placeholderIdx}`}
                                  initial={false}
                                  animate={
                                    isRollingSlot
                                      ? { scale: [1, 1.02, 1], opacity: [0.8, 1, 0.85] }
                                      : { scale: 1, opacity: 1 }
                                  }
                                  transition={
                                    isRollingSlot
                                      ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
                                      : { duration: 0.2 }
                                  }
                                  className={`flex items-center gap-3 rounded-2xl border p-3 ${
                                    isRollingSlot
                                      ? "border-amber-300/30 bg-amber-300/10"
                                      : "border-dashed border-slate-200/80 bg-slate-100/80 dark:border-white/10 dark:bg-[#0c1022]/60"
                                  }`}
                                >
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                                      isRollingSlot
                                        ? "border border-amber-300/30 bg-amber-300/15 text-amber-100"
                                        : "border border-slate-200/80 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5"
                                    }`}
                                  >
                                    {isRollingSlot ? "!" : "?"}
                                  </div>
                                  <div
                                    className={`flex-1 rounded-full ${
                                      isRollingSlot
                                        ? "bg-amber-200/15 px-3 py-2 text-sm font-semibold text-amber-50"
                                        : "h-4 animate-pulse bg-white/5"
                                    }`}
                                  >
                                    {isRollingSlot ? rollingTeam || "抽签中" : null}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="fixtures" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              {groups.map((group) => {
                const rounds = generateRoundRobin(group.teams);
                return (
                  <Card
                    key={`${group.name}-fixtures`}
                    className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-950 dark:text-white">
                            <Swords className="h-5 w-5 text-cyan-300" />
                            {group.name} 对阵表
                          </CardTitle>
                          <CardDescription className="mt-2 text-slate-500 dark:text-slate-400">
                            {group.teams.join(" / ")}
                          </CardDescription>
                        </div>
                        <Badge className="rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                          <CalendarDays className="mr-1 h-3.5 w-3.5" /> {rounds.length} 轮
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rounds.map((round) => (
                        <div
                          key={`${group.name}-round-${round.round}`}
                          className="rounded-[24px] border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0d142d]/80"
                        >
                          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                            <Zap className="h-4 w-4 text-amber-300" />
                            第 {round.round} 轮
                          </div>
                          <div className="space-y-2.5">
                            {round.matches.map((match, idx) => (
                              <div
                                key={`${group.name}-${round.round}-${idx}`}
                                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5"
                              >
                                <div className="truncate text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {match.teamA}
                                </div>
                                <div className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/15 px-3 py-1 text-xs font-black tracking-[0.2em] text-fuchsia-200">
                                  VS
                                </div>
                                <div className="truncate text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {match.teamB}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="teams">
            <Card className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
              <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-950 dark:text-white">
                  <Users className="h-5 w-5 text-amber-300" />
                  全部参赛队伍
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">当前已载入的 28 支战队名单</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[520px] pr-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {teams.map((team, idx) => (
                      <div
                        key={team}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3 transition-all duration-300 hover:border-amber-400/30 hover:bg-white dark:border-white/10 dark:bg-[#10172f]/80 dark:hover:bg-[#141d3e]"
                      >
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">Team #{idx + 1}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{team}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/80 p-5 text-sm leading-7 text-slate-600 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <span className="font-semibold text-slate-950 dark:text-white">新加效果：</span>
          已升级为滚动式公开抽签。点击“开始抽签动画”后，会先快速滚动候选队伍，再锁定到对应小组位置，适合现场投屏和直播展示。
        </div>
      </div>
    </div>
  );
}
