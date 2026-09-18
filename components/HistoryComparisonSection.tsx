import React, { useState, useMemo } from 'react';
import { QuestionSummary, SavedSession } from '../types';

interface ComparisonRecord {
  id: string | number;
  title: string;
  displayDate: string;
  summaries: QuestionSummary[];
  aiInsights?: any;
  feedback?: string[];
  isCurrent?: boolean;
}

interface HistoryComparisonSectionProps {
  history: SavedSession[];
  currentSession: {
    id: string | number;
    title: string;
    displayDate: string;
    summaries: QuestionSummary[];
    aiInsights?: any;
    feedback?: string[];
  };
}

const CATEGORIES = ['Mokymas', 'Įsitraukimas', 'Klimatas', 'Grįžtamasis ryšys'] as const;

export const HistoryComparisonSection: React.FC<HistoryComparisonSectionProps> = ({
  history,
  currentSession
}) => {
  const [useDemoBaseline, setUseDemoBaseline] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('VISI');

  // Build the complete list of available records to compare
  const availableRecords: ComparisonRecord[] = useMemo(() => {
    const list: ComparisonRecord[] = [];

    // 1. Current active session
    if (currentSession && currentSession.summaries && currentSession.summaries.length > 0) {
      list.push({
        id: 'current',
        title: currentSession.title || 'Dabartinė apklausos ataskaita',
        displayDate: currentSession.displayDate || new Date().toLocaleDateString('lt-LT'),
        summaries: currentSession.summaries,
        aiInsights: currentSession.aiInsights,
        feedback: currentSession.feedback,
        isCurrent: true
      });
    }

    // 2. Saved historical sessions
    (history || []).forEach((item, idx) => {
      if (item.summaries && item.summaries.length > 0) {
        list.push({
          id: item.id,
          title: item.title || `Apklausa #${idx + 1} (${item.displayDate})`,
          displayDate: item.displayDate || new Date(item.date).toLocaleDateString('lt-LT'),
          summaries: item.summaries,
          aiInsights: item.aiInsights,
          feedback: item.feedback,
          isCurrent: false
        });
      }
    });

    // 3. If demo baseline is requested to allow testing when only 1 record exists
    if (useDemoBaseline && currentSession.summaries.length > 0) {
      const demoSummaries = currentSession.summaries.map(s => {
        // Create realistic previous semester scores (typically 0.2 - 0.4 lower)
        const adjustedScore = Math.max(1.5, Math.min(5.0, Number((s.averageScore - (s.isReverse ? -0.3 : 0.35)).toFixed(2))));
        return {
          ...s,
          averageScore: adjustedScore
        };
      });

      list.push({
        id: 'demo-baseline',
        title: 'I pusmečio bazinis vertinimas (Pavyzdys)',
        displayDate: '2025-11-15',
        summaries: demoSummaries,
        aiInsights: {
          sentimentScore: Math.max(40, (currentSession.aiInsights?.sentimentScore || 75) - 14),
          strengths: "Mokiniai vertina aiškų temų išdėstymą.",
          improvements: "Reikia daugiau laiko skirti formatyviam grįžtamajam ryšiui."
        },
        feedback: ["Norėtųsi daugiau praktinių pavyzdžių"],
        isCurrent: false
      });
    }

    return list;
  }, [history, currentSession, useDemoBaseline]);

  // Selected session IDs: default to first two available
  const [selectedIdA, setSelectedIdA] = useState<string | number>(() => {
    if (availableRecords.length >= 2) {
      return availableRecords[1].id; // older or second record as Baseline (A)
    }
    return availableRecords[0]?.id || '';
  });

  const [selectedIdB, setSelectedIdB] = useState<string | number>(() => {
    return availableRecords[0]?.id || ''; // current or latest as Target (B)
  });

  // Ensure valid selection if records change
  const recordA = useMemo(() => {
    return availableRecords.find(r => String(r.id) === String(selectedIdA)) || availableRecords[0];
  }, [availableRecords, selectedIdA]);

  const recordB = useMemo(() => {
    return availableRecords.find(r => String(r.id) === String(selectedIdB)) || availableRecords[1] || availableRecords[0];
  }, [availableRecords, selectedIdB]);

  // Swap records A and B
  const handleSwap = () => {
    const temp = selectedIdA;
    setSelectedIdA(selectedIdB);
    setSelectedIdB(temp);
  };

  // Helper to compute overall and category stats for a record
  const getRecordStats = (record?: ComparisonRecord) => {
    if (!record || !record.summaries || record.summaries.length === 0) {
      return { overall: 0, count: 0, categories: {} as Record<string, number> };
    }
    const overall = record.summaries.reduce((acc, s) => acc + s.averageScore, 0) / record.summaries.length;
    
    const catMap: Record<string, number> = {};
    CATEGORIES.forEach(cat => {
      const items = record.summaries.filter(s => s.category === cat);
      if (items.length > 0) {
        catMap[cat] = items.reduce((acc, i) => acc + i.averageScore, 0) / items.length;
      } else {
        catMap[cat] = overall;
      }
    });

    return {
      overall: Number(overall.toFixed(2)),
      count: record.summaries[0]?.total || 0,
      categories: catMap
    };
  };

  const statsA = useMemo(() => getRecordStats(recordA), [recordA]);
  const statsB = useMemo(() => getRecordStats(recordB), [recordB]);

  // Calculate delta between A and B
  const overallDiff = Number((statsB.overall - statsA.overall).toFixed(2));
  const overallPct = statsA.overall > 0 ? Number(((overallDiff / statsA.overall) * 100).toFixed(1)) : 0;

  // Build question-level side-by-side comparison
  const questionComparisons = useMemo(() => {
    if (!recordA || !recordB) return [];

    const mapA = new Map<string, QuestionSummary>();
    recordA.summaries.forEach(s => mapA.set(s.question.trim().toLowerCase(), s));

    const mapB = new Map<string, QuestionSummary>();
    recordB.summaries.forEach(s => mapB.set(s.question.trim().toLowerCase(), s));

    // Union of all questions
    const allQuestions = Array.from(new Set([...Array.from(mapA.keys()), ...Array.from(mapB.keys())]));

    const result = allQuestions.map(qKey => {
      const itemA = mapA.get(qKey);
      const itemB = mapB.get(qKey);
      const questionText = itemB?.question || itemA?.question || '';
      const category = itemB?.category || itemA?.category || 'Kita';
      const isReverse = itemB?.isReverse || itemA?.isReverse;

      const scoreA = itemA ? itemA.averageScore : null;
      const scoreB = itemB ? itemB.averageScore : null;

      let delta: number | null = null;
      if (scoreA !== null && scoreB !== null) {
        delta = Number((scoreB - scoreA).toFixed(2));
        if (isReverse) {
          delta = -delta; // For reverse questions, decreasing score is positive progress
        }
      }

      return {
        question: questionText,
        category,
        isReverse,
        scoreA,
        scoreB,
        delta
      };
    });

    // Filter if needed
    if (filterCategory !== 'VISI') {
      return result.filter(r => r.category === filterCategory);
    }

    return result;
  }, [recordA, recordB, filterCategory]);

  // Find greatest positive leap and area with largest decline/gap
  const keyObservations = useMemo(() => {
    const validQuestions = questionComparisons.filter(q => q.delta !== null);
    if (validQuestions.length === 0) return null;

    const sortedByDelta = [...validQuestions].sort((a, b) => (b.delta || 0) - (a.delta || 0));
    const bestImprovement = sortedByDelta[0];
    const lowestImprovement = sortedByDelta[sortedByDelta.length - 1];

    return {
      best: bestImprovement,
      lowest: lowestImprovement
    };
  }, [questionComparisons]);

  const canCompare = availableRecords.length >= 2;

  return (
    <section className="report-section mb-12 print-avoid-break">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-md">
            <i className="fas fa-code-compare"></i>
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">
              Istorinių įrašų palyginimas šalia vienas kito
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              Pasirinkite du istorinius apklausų laikotarpius ir vizualiai palyginkite rezultatų bei mokinių vertinimų pokytį.
            </p>
          </div>
        </div>

        {/* Demo button if only 1 record exists */}
        {!canCompare && (
          <button
            onClick={() => setUseDemoBaseline(true)}
            className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs flex items-center gap-2 transition-all print:hidden"
          >
            <i className="fas fa-wand-magic-sparkles"></i> Užkrauti demonstracinį įrašą palyginimui
          </button>
        )}
      </div>

      {!canCompare ? (
        <div className="bg-slate-50 border border-dashed border-gray-300 p-8 rounded-3xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto text-lg">
            <i className="fas fa-clock-rotate-left"></i>
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
              Istorijai palyginti reikalingi bent du įrašai
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              Šiuo metu turite tik dabartinės apklausos duomenis. Išsaugokite šią sesiją ir atlikite vėlesnę apklausą, arba išbandykite demonstracinį palyginimą su ankstesniu pusmečiu.
            </p>
          </div>
          <button
            onClick={() => setUseDemoBaseline(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-sm"
          >
            <i className="fas fa-play"></i> Išbandyti demonstracinį palyginimą
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selectors Bar (Print friendly controls) */}
          <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-gray-200/80 print:bg-transparent print:border-none print:p-0">
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              {/* Record A Selector */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">A</span>
                  1-asis įrašas (Bazinis / Pradinis laikotarpis):
                </label>
                <select
                  value={selectedIdA}
                  onChange={(e) => setSelectedIdA(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-2xs"
                >
                  {availableRecords.map((r) => (
                    <option key={`a-${r.id}`} value={r.id} disabled={String(r.id) === String(selectedIdB)}>
                      {r.title} ({r.displayDate}) {r.isCurrent ? '• [Dabartinis]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="md:col-span-1 flex justify-center">
                <button
                  onClick={handleSwap}
                  title="Sukeisti įrašus vietomis"
                  className="w-10 h-10 rounded-xl bg-white hover:bg-indigo-50 border border-gray-200 text-indigo-600 flex items-center justify-center shadow-2xs transition-all active:scale-95 print:hidden"
                >
                  <i className="fas fa-right-left"></i>
                </button>
                <div className="hidden print:block text-xs font-black text-gray-400">vs</div>
              </div>

              {/* Record B Selector */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">B</span>
                  2-asis įrašas (Palyginamasis / Vėlesnis laikotarpis):
                </label>
                <select
                  value={selectedIdB}
                  onChange={(e) => setSelectedIdB(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-2xs"
                >
                  {availableRecords.map((r) => (
                    <option key={`b-${r.id}`} value={r.id} disabled={String(r.id) === String(selectedIdA)}>
                      {r.title} ({r.displayDate}) {r.isCurrent ? '• [Dabartinis]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Side-by-Side Summary Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Record A Summary Card */}
            <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-2xs relative">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                  1-asis įrašas (A)
                </span>
                <span className="text-[11px] font-bold text-gray-400">{recordA?.displayDate}</span>
              </div>
              <h3 className="text-xs font-black text-gray-900 line-clamp-1 mb-3" title={recordA?.title}>
                {recordA?.title}
              </h3>
              <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Bendras vidurkis</span>
                  <div className="text-2xl font-black text-indigo-950">
                    {statsA.overall.toFixed(2)} <span className="text-xs text-gray-400 font-bold">/ 5.0</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Mokiniai</span>
                  <span className="text-sm font-black text-gray-700">{statsA.count} atsakymai</span>
                </div>
              </div>
            </div>

            {/* Delta / Growth Badge in the center */}
            <div className={`p-5 rounded-2xl border-2 flex flex-col justify-center items-center text-center ${
              overallDiff >= 0 
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                : 'bg-rose-50/50 border-rose-200 text-rose-950'
            }`}>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                Bendras pokytis (B vs A)
              </span>
              <div className="flex items-center gap-2 text-3xl font-black mb-1">
                <i className={`fas text-xl ${overallDiff >= 0 ? 'fa-arrow-trend-up text-emerald-600' : 'fa-arrow-trend-down text-rose-600'}`}></i>
                <span>{overallDiff >= 0 ? `+${overallDiff.toFixed(2)}` : overallDiff.toFixed(2)}</span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                overallDiff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {overallDiff >= 0 ? `Augimas +${overallPct}%` : `Sumažėjimas ${overallPct}%`}
              </span>
            </div>

            {/* Record B Summary Card */}
            <div className="bg-white p-5 rounded-2xl border-2 border-emerald-100 shadow-2xs relative">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                  2-asis įrašas (B)
                </span>
                <span className="text-[11px] font-bold text-gray-400">{recordB?.displayDate}</span>
              </div>
              <h3 className="text-xs font-black text-gray-900 line-clamp-1 mb-3" title={recordB?.title}>
                {recordB?.title}
              </h3>
              <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Bendras vidurkis</span>
                  <div className="text-2xl font-black text-emerald-950">
                    {statsB.overall.toFixed(2)} <span className="text-xs text-gray-400 font-bold">/ 5.0</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Mokiniai</span>
                  <span className="text-sm font-black text-gray-700">{statsB.count} atsakymai</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Takeaways & Pedagogical Observations */}
          {keyObservations && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs">
                  <i className="fas fa-circle-check"></i>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-0.5">
                    Didžiausias teigiamas postūmis
                  </span>
                  <p className="text-xs text-gray-800 font-bold leading-snug">
                    „{keyObservations.best.question}“
                  </p>
                  <span className="text-[11px] font-black text-emerald-700 mt-1 inline-block">
                    {keyObservations.best.scoreA?.toFixed(2)} → {keyObservations.best.scoreB?.toFixed(2)} (+{keyObservations.best.delta?.toFixed(2)} balo)
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-xs">
                  <i className="fas fa-triangle-exclamation"></i>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-0.5">
                    Daugiausiai dėmesio reikalaujanti sritis
                  </span>
                  <p className="text-xs text-gray-800 font-bold leading-snug">
                    „{keyObservations.lowest.question}“
                  </p>
                  <span className="text-[11px] font-black text-amber-700 mt-1 inline-block">
                    {keyObservations.lowest.scoreA?.toFixed(2)} → {keyObservations.lowest.scoreB?.toFixed(2)} ({keyObservations.lowest.delta && keyObservations.lowest.delta > 0 ? `+${keyObservations.lowest.delta.toFixed(2)}` : keyObservations.lowest.delta?.toFixed(2)} balo)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Category-by-Category Side-by-Side Comparison */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
              <i className="fas fa-chart-simple text-indigo-600"></i> Ugdymo sričių palyginimas šalia vienas kito
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATEGORIES.map(cat => {
                const valA = statsA.categories[cat] || 0;
                const valB = statsB.categories[cat] || 0;
                const diff = Number((valB - valA).toFixed(2));

                return (
                  <div key={cat} className="p-4 rounded-xl border border-gray-100 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-800">{cat}</span>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        <i className={`fas text-[9px] ${diff >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                        {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {/* Side A */}
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                        <div className="text-[10px] text-gray-400 font-bold uppercase truncate">
                          A: {recordA?.title}
                        </div>
                        <div className="text-base font-black text-indigo-900 mt-0.5">
                          {valA.toFixed(2)} <span className="text-[10px] text-gray-400">/ 5.0</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, (valA / 5) * 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Side B */}
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                        <div className="text-[10px] text-gray-400 font-bold uppercase truncate">
                          B: {recordB?.title}
                        </div>
                        <div className="text-base font-black text-emerald-900 mt-0.5">
                          {valB.toFixed(2)} <span className="text-[10px] text-gray-400">/ 5.0</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, (valB / 5) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Matrix Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-gray-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                  Klausimų rezultatų pokyčių matrica
                </h4>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Lyginami kiekvieno klausimo balai tarp abiejų laikotarpių
                </p>
              </div>

              {/* Category Filter Pills (Hidden in Print) */}
              <div className="flex flex-wrap gap-1 print:hidden">
                <button
                  onClick={() => setFilterCategory('VISI')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    filterCategory === 'VISI' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Visi ({questionComparisons.length})
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      filterCategory === cat ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-600">
                    <th className="py-3 px-4">Klausimas ir sritis</th>
                    <th className="py-3 px-3 text-center w-24">1-as įrašas (A)</th>
                    <th className="py-3 px-3 text-center w-24">2-as įrašas (B)</th>
                    <th className="py-3 px-3 text-center w-24">Pokytis (Δ)</th>
                    <th className="py-3 px-4 text-center w-28">Tendencija</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {questionComparisons.map((item, idx) => {
                    const deltaVal = item.delta;
                    const isPositive = deltaVal !== null && deltaVal > 0.05;
                    const isNegative = deltaVal !== null && deltaVal < -0.05;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 leading-snug">{item.question}</div>
                          <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mt-0.5 inline-block">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-700 bg-indigo-50/20">
                          {item.scoreA !== null ? item.scoreA.toFixed(2) : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-700 bg-emerald-50/20">
                          {item.scoreB !== null ? item.scoreB.toFixed(2) : '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {deltaVal !== null ? (
                            <span className={`inline-flex items-center gap-1 font-black text-xs px-2 py-0.5 rounded-md ${
                              isPositive ? 'bg-emerald-100 text-emerald-800' : isNegative ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {deltaVal > 0 ? `+${deltaVal.toFixed(2)}` : deltaVal.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPositive ? (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                              <i className="fas fa-arrow-up text-[10px]"></i> Pažanga
                            </span>
                          ) : isNegative ? (
                            <span className="text-[11px] font-bold text-rose-600 flex items-center justify-center gap-1">
                              <i className="fas fa-arrow-down text-[10px]"></i> Stebėti
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-gray-400 flex items-center justify-center gap-1">
                              <i className="fas fa-minus text-[10px]"></i> Stabilu
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HistoryComparisonSection;
