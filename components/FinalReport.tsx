import React from 'react';
import { QuestionSummary, ReflectionData } from '../types';

interface FinalReportProps {
  summaries: QuestionSummary[];
  openFeedback: string[];
  aiInsights: any;
  reflection: ReflectionData;
  customTitle?: string;
  onBack: () => void;
  onOpenReflection: () => void;
  onSaveToHistory: () => void;
}

const FinalReport: React.FC<FinalReportProps> = ({
  summaries,
  openFeedback,
  aiInsights,
  reflection,
  customTitle,
  onBack,
  onOpenReflection,
  onSaveToHistory
}) => {
  const hasReflectionContent = Object.values(reflection).some(
    v => typeof v === 'string' && v.trim().length > 0
  );

  const totalRespondents = summaries[0]?.total || 0;
  const overallAvg = summaries.length > 0
    ? (summaries.reduce((acc, s) => acc + s.averageScore, 0) / summaries.length).toFixed(2)
    : '0';

  // Group by categories
  const categories = ['Mokymas', 'Įsitraukimas', 'Klimatas', 'Grįžtamasis ryšys', 'Kita'] as const;
  const groupedSummaries = categories.map(cat => ({
    category: cat,
    items: summaries.filter(s => s.category === cat),
    avg: (() => {
      const items = summaries.filter(s => s.category === cat);
      if (items.length === 0) return 0;
      return (items.reduce((acc, i) => acc + i.averageScore, 0) / items.length).toFixed(2);
    })()
  })).filter(g => g.items.length > 0);

  // Top & bottom questions
  const sortedQuestions = [...summaries].sort((a, b) => b.averageScore - a.averageScore);
  const topQuestions = sortedQuestions.slice(0, 3);
  const bottomQuestions = sortedQuestions.slice(-3).reverse();

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 4.0) return 'text-teal-600 bg-teal-50 border-teal-200';
    if (score >= 3.0) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const getBarColor = (score: number) => {
    if (score >= 4.5) return 'bg-emerald-500';
    if (score >= 4.0) return 'bg-teal-500';
    if (score >= 3.0) return 'bg-indigo-500';
    return 'bg-amber-500';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up pb-24">
      {/* Top action toolbar (hidden on print) */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i> Grįžti į suvestinę
          </button>
          {!hasReflectionContent && (
            <button
              onClick={onOpenReflection}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 font-bold text-xs uppercase tracking-wider hover:bg-indigo-50 transition-all flex items-center gap-2"
            >
              <i className="fas fa-pencil"></i> Pildyti refleksiją (papildomai)
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSaveToHistory}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <i className="fas fa-bookmark"></i> Išsaugoti
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-100 transition-all flex items-center gap-2 active:scale-95"
          >
            <i className="fas fa-file-pdf"></i> Atsisiųsti / Spausdinti PDF
          </button>
        </div>
      </div>

      {/* Main Printable Report */}
      <div className="bg-white p-8 md:p-14 rounded-[3rem] shadow-xl border border-gray-100 report-container print:shadow-none print:p-0 print:border-none print:rounded-none">
        
        {/* Report Header */}
        <div className="border-b border-gray-100 pb-8 mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-[11px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-3">
              <i className="fas fa-file-lines"></i> Ugdymo kokybės apklausos ataskaita
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              {customTitle || 'Mokinių apklausos rezultatų ataskaita'}
            </h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-4">
              <span><i className="fas fa-calendar-alt text-indigo-400 mr-1.5"></i> {new Date().toLocaleDateString('lt-LT')}</span>
              <span><i className="fas fa-users text-indigo-400 mr-1.5"></i> {totalRespondents} respondentai(-ų)</span>
            </p>
          </div>

          <div className="text-right hidden md:block print:block">
            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Metodika</div>
            <div className="text-xs font-bold text-gray-600">Antakalnio progimnazija</div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block mb-1">Bendras vidurkis</span>
            <div className="text-3xl font-black text-indigo-900">{overallAvg} <span className="text-sm font-semibold text-indigo-400">/ 5.0</span></div>
          </div>
          <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">Pasitenkinimas</span>
            <div className="text-3xl font-black text-emerald-900">{aiInsights?.sentimentScore || Math.round((Number(overallAvg) / 5) * 100)}%</div>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Mokinių skaičius</span>
            <div className="text-3xl font-black text-slate-900">{totalRespondents}</div>
          </div>
          <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-100/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block mb-1">Klausimų kiekis</span>
            <div className="text-3xl font-black text-purple-900">{summaries.length}</div>
          </div>
        </div>

        {/* Top Strengths & Opportunities Box */}
        {summaries.length >= 2 && (
          <div className="grid md:grid-cols-2 gap-6 mb-12 print:grid-cols-2">
            <div className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-700 mb-4 flex items-center gap-2">
                <i className="fas fa-arrow-trend-up"></i> Aukščiausiai įvertinti aspektai
              </h3>
              <ul className="space-y-3">
                {topQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-gray-700 font-medium leading-snug">{q.question}</span>
                    <span className="shrink-0 px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                      {q.averageScore.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-50/40 p-6 rounded-2xl border border-amber-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 mb-4 flex items-center gap-2">
                <i className="fas fa-magnifying-glass-chart"></i> Sritys didesniam dėmesiui
              </h3>
              <ul className="space-y-3">
                {bottomQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-gray-700 font-medium leading-snug">{q.question}</span>
                    <span className="shrink-0 px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                      {q.averageScore.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Detailed Quantitative Results by Category */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
              <i className="fas fa-list-check text-indigo-500"></i> Rezultatai pagal ugdymo sritis
            </h2>
            <div className="h-px flex-1 bg-gray-100"></div>
          </div>

          <div className="space-y-8">
            {groupedSummaries.map((grp) => (
              <div key={grp.category} className="bg-slate-50/50 p-6 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                    {grp.category} ({grp.items.length} klausimai)
                  </h3>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    Kategorijos vidurkis: {grp.avg} / 5.0
                  </span>
                </div>

                <div className="space-y-3">
                  {grp.items.map((item, idx) => {
                    const pct = Math.min(100, Math.max(0, (item.averageScore / 5) * 100));
                    return (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <span className="text-sm font-semibold text-gray-800 leading-snug">{item.question}</span>
                          <span className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-black ${getScoreColor(item.averageScore)}`}>
                            {item.averageScore.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getBarColor(item.averageScore)}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Insights Section */}
        {aiInsights && (
          <section className="mb-14 bg-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden print:bg-white print:text-black print:border print:border-gray-200 print:rounded-2xl">
            <div className="relative z-10">
              <h2 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2 print:text-indigo-600">
                <i className="fas fa-wand-magic-sparkles"></i> Dirbtinio intelekto pedagoginė analizė
              </h2>

              {/* Themes */}
              {aiInsights.themes && aiInsights.themes.length > 0 && (
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  {aiInsights.themes.map((t: any, idx: number) => (
                    <div key={idx} className="bg-white/10 p-4 rounded-xl backdrop-blur-xs border border-white/10 print:bg-gray-50 print:border-gray-200">
                      <div className="text-xs font-black text-indigo-200 uppercase tracking-wider mb-1 print:text-indigo-700">{t.label}</div>
                      <p className="text-xs text-indigo-100/90 leading-relaxed print:text-gray-700">{t.description}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-2 print:text-emerald-700">
                    <i className="fas fa-check-circle mr-1.5"></i> Mokinių vertinamos stiprybės
                  </h4>
                  <p className="text-sm text-indigo-50/90 leading-relaxed print:text-gray-800">{aiInsights.strengths}</p>
                </div>

                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-400 mb-2 print:text-rose-700">
                    <i className="fas fa-triangle-exclamation mr-1.5"></i> Tobulintinos sritys
                  </h4>
                  <p className="text-sm text-indigo-50/90 leading-relaxed print:text-gray-800">{aiInsights.improvements}</p>
                </div>
              </div>

              {aiInsights.insights && (
                <div className="mt-6 p-6 bg-white/5 rounded-2xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 mb-2 print:text-indigo-800">
                    Mentoriaus komentaras
                  </h4>
                  <p className="text-sm text-indigo-50/90 leading-relaxed print:text-gray-800">{aiInsights.insights}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Student Open Comments */}
        {openFeedback && openFeedback.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <i className="fas fa-comment-dots text-indigo-500"></i> Mokinių atviri atsiliepimai ir komentarai
              </h2>
              <div className="h-px flex-1 bg-gray-100"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {openFeedback.map((comment, idx) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-gray-100 text-sm text-gray-700 italic leading-relaxed">
                  "{comment}"
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Teacher Reflection (if completed) */}
        {hasReflectionContent ? (
          <section className="space-y-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <i className="fas fa-user-pen text-indigo-500"></i> Mokytojo profesinė refleksija
              </h2>
              <div className="h-px flex-1 bg-gray-100"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {reflection.observations && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block mb-2">Pastebėjimai</span>
                  <p className="text-sm text-gray-800 leading-relaxed italic">"{reflection.observations}"</p>
                </div>
              )}
              {reflection.strengths && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-2">Mokytojo stiprybės</span>
                  <p className="text-sm text-gray-800 leading-relaxed">{reflection.strengths}</p>
                </div>
              )}
              {reflection.improvements && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block mb-2">Tobulintini aspektai</span>
                  <p className="text-sm text-gray-800 leading-relaxed">{reflection.improvements}</p>
                </div>
              )}
              {reflection.surprises && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block mb-2">Kas nustebino</span>
                  <p className="text-sm text-gray-800 leading-relaxed">{reflection.surprises}</p>
                </div>
              )}
            </div>

            {(reflection.actionStop || reflection.actionStart || reflection.actionContinue) && (
              <div className="bg-indigo-900 text-white p-8 rounded-[2rem] print:bg-white print:text-black print:border print:border-gray-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300 mb-6 flex items-center gap-2 print:text-indigo-700">
                  <i className="fas fa-rocket"></i> Mokytojo veiksmų planas kitam laikotarpiui
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {reflection.actionStop && (
                    <div className="bg-white/10 p-5 rounded-xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                      <span className="text-[10px] font-black uppercase text-rose-300 block mb-2 print:text-rose-700">Nustosiu</span>
                      <p className="text-xs text-white/90 leading-relaxed print:text-gray-800">{reflection.actionStop}</p>
                    </div>
                  )}
                  {reflection.actionStart && (
                    <div className="bg-white/10 p-5 rounded-xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                      <span className="text-[10px] font-black uppercase text-emerald-300 block mb-2 print:text-emerald-700">Pradėsiu</span>
                      <p className="text-xs text-white/90 leading-relaxed print:text-gray-800">{reflection.actionStart}</p>
                    </div>
                  )}
                  {reflection.actionContinue && (
                    <div className="bg-white/10 p-5 rounded-xl border border-white/10 print:bg-gray-50 print:border-gray-200">
                      <span className="text-[10px] font-black uppercase text-teal-300 block mb-2 print:text-teal-700">Tęsiu</span>
                      <p className="text-xs text-white/90 leading-relaxed print:text-gray-800">{reflection.actionContinue}</p>
                    </div>
                  )}
                </div>
                {reflection.nextSteps && (
                  <div className="mt-6 pt-4 border-t border-white/10 print:border-gray-200">
                    <span className="text-[10px] font-black uppercase text-indigo-300 block mb-1 print:text-indigo-700">Sėkmės matavimas</span>
                    <p className="text-xs text-white/90 leading-relaxed print:text-gray-800">{reflection.nextSteps}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <div className="pt-6 border-t border-gray-100 text-center print:hidden">
            <p className="text-xs text-gray-400 font-medium">
              Ataskaita sugeneruota tiesiogiai pagal mokinių apklausos duomenis be papildomos mokytojo refleksijos.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-14 pt-6 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span>Ugdymo kokybė • Antakalnio progimnazija</span>
          <span>Dokumentas sugeneruotas: {new Date().toLocaleDateString('lt-LT')}</span>
        </div>
      </div>
    </div>
  );
};

export default FinalReport;
