import React, { useState, useMemo } from 'react';
import { QuestionSummary, SavedSession } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';

interface PedagogicalGrowthChartProps {
  currentSummaries: QuestionSummary[];
  currentAiInsights?: any;
  history: SavedSession[];
  onSaveCurrentSession?: () => void;
}

interface TimelinePoint {
  id: string | number;
  label: string;
  date: string;
  timestamp: number;
  isCurrent: boolean;
  overallAvg: number;
  sentimentScore: number;
  totalStudents: number;
  mokymas: number;
  klimatas: number;
  isitraukimas: number;
  griztamasis: number;
}

const CATEGORY_COLORS = {
  klimatas: '#10b981', // Emerald
  mokymas: '#6366f1',  // Indigo
  isitraukimas: '#f59e0b', // Amber
  griztamasis: '#8b5cf6', // Purple
  overall: '#0f172a'    // Slate 900
};

const CATEGORY_LABELS = {
  klimatas: 'Klimatas ir pagarba',
  mokymas: 'Mokymo aiškumas',
  isitraukimas: 'Mokinių įsitraukimas',
  griztamasis: 'Grįžtamasis ryšys'
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-white/10 text-xs z-50">
        <div className="font-black text-indigo-300 uppercase tracking-wider mb-2 border-b border-white/10 pb-1">
          {label}
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-slate-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-black text-white">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                {entry.unit || ' / 5.0'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const PedagogicalGrowthChart: React.FC<PedagogicalGrowthChartProps> = ({
  currentSummaries,
  currentAiInsights,
  history,
  onSaveCurrentSession
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'trend' | 'delta'>('categories');
  const [useDemoBaseline, setUseDemoBaseline] = useState(false);

  // Compute stats for a set of summaries
  const computeStats = (summaries: QuestionSummary[]) => {
    if (!summaries || summaries.length === 0) {
      return { overall: 0, mokymas: 0, klimatas: 0, isitraukimas: 0, griztamasis: 0 };
    }
    const overall = summaries.reduce((acc, s) => acc + s.averageScore, 0) / summaries.length;

    const getCatAvg = (catName: string) => {
      const items = summaries.filter(s => s.category === catName);
      if (items.length === 0) return overall;
      return items.reduce((acc, i) => acc + i.averageScore, 0) / items.length;
    };

    return {
      overall: Number(overall.toFixed(2)),
      mokymas: Number(getCatAvg('Mokymas').toFixed(2)),
      klimatas: Number(getCatAvg('Klimatas').toFixed(2)),
      isitraukimas: Number(getCatAvg('Įsitraukimas').toFixed(2)),
      griztamasis: Number(getCatAvg('Grįžtamasis ryšys').toFixed(2))
    };
  };

  // Build chronological data
  const timelineData: TimelinePoint[] = useMemo(() => {
    const points: TimelinePoint[] = [];

    // Historical stored sessions (sorted chronologically)
    const validHistory = (history || [])
      .filter(item => item.summaries && item.summaries.length > 0)
      .sort((a, b) => (new Date(a.date).getTime() || a.id) - (new Date(b.date).getTime() || b.id));

    validHistory.forEach((item, idx) => {
      const stats = computeStats(item.summaries);
      const dateObj = new Date(item.date || item.id);
      const dateFormatted = !isNaN(dateObj.getTime())
        ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
        : item.displayDate;

      points.push({
        id: item.id,
        label: item.title?.replace(/Refleksija\s*/i, '') || `Apklausa #${idx + 1} (${dateFormatted})`,
        date: dateFormatted,
        timestamp: dateObj.getTime() || item.id,
        isCurrent: false,
        overallAvg: stats.overall,
        sentimentScore: item.aiInsights?.sentimentScore || Math.round((stats.overall / 5) * 100),
        totalStudents: item.summaries[0]?.total || 0,
        mokymas: stats.mokymas,
        klimatas: stats.klimatas,
        isitraukimas: stats.isitraukimas,
        griztamasis: stats.griztamasis
      });
    });

    // If demo baseline is requested (to showcase pedagogical growth when user has only 1 session)
    if (useDemoBaseline && points.length === 0 && currentSummaries.length > 0) {
      const curStats = computeStats(currentSummaries);
      // Realistic previous semester baseline (e.g., 4 months prior, slightly lower initial baseline)
      points.push({
        id: 'demo-prior',
        label: 'I pusmetis (Ankstesnis laikotarpis)',
        date: '2025-11',
        timestamp: Date.now() - 120 * 24 * 3600 * 1000,
        isCurrent: false,
        overallAvg: Number((curStats.overall - 0.35).toFixed(2)),
        sentimentScore: Math.max(40, (currentAiInsights?.sentimentScore || 80) - 12),
        totalStudents: currentSummaries[0]?.total || 24,
        mokymas: Number(Math.max(2.5, curStats.mokymas - 0.32).toFixed(2)),
        klimatas: Number(Math.max(2.8, curStats.klimatas - 0.25).toFixed(2)),
        isitraukimas: Number(Math.max(2.4, curStats.isitraukimas - 0.45).toFixed(2)),
        griztamasis: Number(Math.max(2.3, curStats.griztamasis - 0.40).toFixed(2))
      });
    }

    // Current active session as the latest point
    if (currentSummaries.length > 0) {
      const curStats = computeStats(currentSummaries);
      const now = new Date();
      const curLabel = `Dabartinė (${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')})`;

      points.push({
        id: 'current-session',
        label: curLabel,
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        timestamp: now.getTime(),
        isCurrent: true,
        overallAvg: curStats.overall,
        sentimentScore: currentAiInsights?.sentimentScore || Math.round((curStats.overall / 5) * 100),
        totalStudents: currentSummaries[0]?.total || 0,
        mokymas: curStats.mokymas,
        klimatas: curStats.klimatas,
        isitraukimas: curStats.isitraukimas,
        griztamasis: curStats.griztamasis
      });
    }

    return points;
  }, [history, currentSummaries, currentAiInsights, useDemoBaseline]);

  // If there are at least 2 comparison points, calculate growth deltas
  const hasMultipleSessions = timelineData.length >= 2;

  const deltas = useMemo(() => {
    if (timelineData.length < 2) return null;
    const first = timelineData[0];
    const last = timelineData[timelineData.length - 1];

    const calcDelta = (key: keyof TimelinePoint) => {
      const val1 = Number(first[key]) || 0;
      const val2 = Number(last[key]) || 0;
      const diff = Number((val2 - val1).toFixed(2));
      const pct = val1 > 0 ? Number(((diff / val1) * 100).toFixed(1)) : 0;
      return { diff, pct, from: val1, to: val2 };
    };

    return {
      overall: calcDelta('overallAvg'),
      klimatas: calcDelta('klimatas'),
      mokymas: calcDelta('mokymas'),
      isitraukimas: calcDelta('isitraukimas'),
      griztamasis: calcDelta('griztamasis'),
      sentiment: calcDelta('sentimentScore')
    };
  }, [timelineData]);

  // Delta chart data for Recharts BarChart
  const deltaChartData = useMemo(() => {
    if (!deltas) return [];
    return [
      { name: 'Bendras vidurkis', delta: deltas.overall.diff, color: CATEGORY_COLORS.overall },
      { name: 'Klimatas ir pagarba', delta: deltas.klimatas.diff, color: CATEGORY_COLORS.klimatas },
      { name: 'Mokymo aiškumas', delta: deltas.mokymas.diff, color: CATEGORY_COLORS.mokymas },
      { name: 'Mokinių įsitraukimas', delta: deltas.isitraukimas.diff, color: CATEGORY_COLORS.isitraukimas },
      { name: 'Grįžtamasis ryšys', delta: deltas.griztamasis.diff, color: CATEGORY_COLORS.griztamasis }
    ];
  }, [deltas]);

  // Determine greatest pedagogical growth
  const bestGrowth = useMemo(() => {
    if (!deltas) return null;
    const catKeys = [
      { name: 'Klimatas ir pagarba', ...deltas.klimatas, color: CATEGORY_COLORS.klimatas },
      { name: 'Mokymo aiškumas', ...deltas.mokymas, color: CATEGORY_COLORS.mokymas },
      { name: 'Mokinių įsitraukimas', ...deltas.isitraukimas, color: CATEGORY_COLORS.isitraukimas },
      { name: 'Grįžtamasis ryšys', ...deltas.griztamasis, color: CATEGORY_COLORS.griztamasis }
    ];
    return [...catKeys].sort((a, b) => b.diff - a.diff)[0];
  }, [deltas]);

  return (
    <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mb-1">
            <i className="fas fa-arrow-trend-up text-indigo-500"></i> Pedagoginis augimas ir tendencijos
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            Apklausų palyginimas laike
          </h3>
          <p className="text-gray-500 text-xs mt-1">
            Stebėkite mokinių vertinimų dinamiką tarp skirtingų apklausų, pusmečių ar klasių srautų.
          </p>
        </div>

        {/* View Switcher Tabs */}
        {hasMultipleSessions && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 self-stretch md:self-auto">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'categories'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <i className="fas fa-layer-group mr-1.5 text-indigo-500"></i> Pagal sritis
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'trend'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <i className="fas fa-chart-line mr-1.5 text-indigo-500"></i> Bendras vidurkis
            </button>
            <button
              onClick={() => setActiveTab('delta')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'delta'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <i className="fas fa-chart-column mr-1.5 text-indigo-500"></i> Pokyčiai (Δ)
            </button>
          </div>
        )}
      </div>

      {/* Case 1: When user has multiple sessions to compare */}
      {hasMultipleSessions ? (
        <div className="space-y-8 animate-fade-in">
          {/* Key Pedagogical Growth Badges */}
          {deltas && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                  Palyginamos sesijos
                </span>
                <div className="text-2xl font-black text-gray-900">
                  {timelineData.length} <span className="text-xs text-gray-400 font-bold">laikotarpiai</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 font-medium truncate">
                  Nuo {timelineData[0].label} iki {timelineData[timelineData.length - 1].label}
                </div>
              </div>

              <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1">
                  Bendras pokytis
                </span>
                <div className="text-2xl font-black text-indigo-950 flex items-center gap-1.5">
                  <i className={`fas text-base ${deltas.overall.diff >= 0 ? 'fa-arrow-up text-emerald-500' : 'fa-arrow-down text-rose-500'}`}></i>
                  {deltas.overall.diff >= 0 ? `+${deltas.overall.diff}` : deltas.overall.diff}
                  <span className="text-xs font-bold text-indigo-400">balo</span>
                </div>
                <div className="text-[11px] text-indigo-600 font-bold mt-1">
                  {deltas.overall.from.toFixed(2)} → {deltas.overall.to.toFixed(2)} / 5.0
                </div>
              </div>

              <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                  Didžiausias šuolis
                </span>
                <div className="text-lg font-black text-emerald-950 truncate" title={bestGrowth?.name}>
                  {bestGrowth?.name || 'Visos stabilios'}
                </div>
                <div className="text-[11px] font-black text-emerald-600 mt-1">
                  {bestGrowth && bestGrowth.diff >= 0 ? `+${bestGrowth.diff} balo (+${bestGrowth.pct}%)` : 'Stabili dinamika'}
                </div>
              </div>

              <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block mb-1">
                  Emocinis klimatas
                </span>
                <div className="text-2xl font-black text-purple-950 flex items-center gap-1.5">
                  <i className={`fas text-base ${deltas.sentiment.diff >= 0 ? 'fa-face-smile text-emerald-500' : 'fa-face-meh text-amber-500'}`}></i>
                  {deltas.sentiment.diff >= 0 ? `+${deltas.sentiment.diff}%` : `${deltas.sentiment.diff}%`}
                </div>
                <div className="text-[11px] text-purple-600 font-bold mt-1">
                  Pasitenkinimas: {deltas.sentiment.to}%
                </div>
              </div>
            </div>
          )}

          {/* Chart Display Area */}
          <div className="bg-slate-50/70 p-6 rounded-[2.5rem] border border-gray-200/70">
            {/* View 1: Multi-line Category Growth */}
            {activeTab === 'categories' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 px-2">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                    Ugdymo sričių įverčių augimas (1.0 - 5.0 balai)
                  </span>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#10b981]"></span> Klimatas
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#6366f1]"></span> Mokymas
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> Įsitraukimas
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#8b5cf6]"></span> Grįžtamasis ryšys
                    </span>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[2.0, 5.0]}
                        ticks={[2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={4.0} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Siektinas lygis (4.0)', fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />
                      
                      <Line
                        type="monotone"
                        dataKey="klimatas"
                        name={CATEGORY_LABELS.klimatas}
                        stroke={CATEGORY_COLORS.klimatas}
                        strokeWidth={3.5}
                        dot={{ r: 5, fill: CATEGORY_COLORS.klimatas, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="mokymas"
                        name={CATEGORY_LABELS.mokymas}
                        stroke={CATEGORY_COLORS.mokymas}
                        strokeWidth={3.5}
                        dot={{ r: 5, fill: CATEGORY_COLORS.mokymas, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="isitraukimas"
                        name={CATEGORY_LABELS.isitraukimas}
                        stroke={CATEGORY_COLORS.isitraukimas}
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ r: 5, fill: CATEGORY_COLORS.isitraukimas, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="griztamasis"
                        name={CATEGORY_LABELS.griztamasis}
                        stroke={CATEGORY_COLORS.griztamasis}
                        strokeWidth={3}
                        dot={{ r: 5, fill: CATEGORY_COLORS.griztamasis, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* View 2: Overall Average & Satisfaction Area Chart */}
            {activeTab === 'trend' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                    Bendro balo tendencija ir pasitenkinimo indeksas
                  </span>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[2.0, 5.0]}
                        ticks={[2.0, 3.0, 4.0, 5.0]}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="overallAvg"
                        name="Bendras vidurkis"
                        stroke="#4f46e5"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#growthGradient)"
                        dot={{ r: 6, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* View 3: Delta Bar Chart */}
            {activeTab === 'delta' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                    Neto pokytis (nuo pirmos iki dabartinės apklausos)
                  </span>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deltaChartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[-1, 1]}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                      <Tooltip
                        formatter={(val: any) => [`${val > 0 ? `+${val}` : val} balo`, 'Pokytis']}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: 'none', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="delta" radius={[6, 6, 0, 0]} maxBarSize={45}>
                        {deltaChartData.map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={entry.delta >= 0 ? (entry.delta > 0.3 ? '#10b981' : '#6366f1') : '#f43f5e'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Timeline Table / List */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <div className="bg-slate-100/70 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-gray-600 flex justify-between">
              <span>Laikotarpio duomenų suvestinė</span>
              <span>{timelineData.length} įrašai</span>
            </div>
            <div className="divide-y divide-gray-100">
              {timelineData.map((pt) => (
                <div
                  key={pt.id}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${
                    pt.isCurrent ? 'bg-indigo-50/40 font-semibold' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${pt.isCurrent ? 'bg-indigo-600 animate-pulse' : 'bg-gray-300'}`}></div>
                    <div>
                      <span className="font-bold text-gray-900">{pt.label}</span>
                      {pt.isCurrent && (
                        <span className="ml-2 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                          Dabartinė
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-gray-600">
                    <span>
                      <strong className="text-gray-900">Vidurkis:</strong> {pt.overallAvg.toFixed(2)}
                    </span>
                    <span>
                      <strong className="text-[#10b981]">Klimatas:</strong> {pt.klimatas.toFixed(2)}
                    </span>
                    <span>
                      <strong className="text-[#6366f1]">Mokymas:</strong> {pt.mokymas.toFixed(2)}
                    </span>
                    <span>
                      <strong className="text-[#f59e0b]">Įsitraukimas:</strong> {pt.isitraukimas.toFixed(2)}
                    </span>
                    <span>
                      <strong className="text-[#8b5cf6]">Grįžtamasis ryšys:</strong> {pt.griztamasis.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {useDemoBaseline && (
            <div className="text-center">
              <button
                onClick={() => setUseDemoBaseline(false)}
                className="text-xs text-gray-400 hover:text-gray-600 underline font-medium"
              >
                Išjungti demonstracinį palyginimą ir rodyti tik realius išsaugotus įrašus
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Case 2: Only 1 session exists so far */
        <div className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-indigo-50/60 via-slate-50 to-purple-50/40 border border-indigo-100 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white mx-auto flex items-center justify-center text-2xl shadow-lg shadow-indigo-200">
            <i className="fas fa-chart-line"></i>
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <h4 className="text-lg font-black text-gray-900">
              Pedagoginio augimo grafikas bus sugeneruotas po antrosios apklausos
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Šiuo metu turite užkrautą <strong>1 apklausos sesiją</strong>. Kai po kito pusmečio ar su kita mokinių klase atliksite apklausą ir ją išsaugosite, sistema automatiškai nubraižys interaktyvius Recharts augimo grafikus bei apskaičiuos jūsų pedagoginį progresą pagal sritis.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setUseDemoBaseline(true)}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
            >
              <i className="fas fa-wand-magic-sparkles"></i> Išbandyti demonstracinį augimo palyginimą (I ir II pusmetis)
            </button>
            {onSaveCurrentSession && (
              <button
                onClick={onSaveCurrentSession}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95"
              >
                <i className="fas fa-bookmark"></i> Išsaugoti šią sesiją į istoriją
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PedagogicalGrowthChart;
