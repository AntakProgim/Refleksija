import React, { useState } from 'react';
import { QuestionSummary, ReflectionData, SavedSession } from '../types';
import HistoryComparisonSection from './HistoryComparisonSection';

interface FinalReportProps {
  summaries: QuestionSummary[];
  openFeedback: string[];
  aiInsights: any;
  reflection: ReflectionData;
  customTitle?: string;
  history?: SavedSession[];
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
  history,
  onBack,
  onOpenReflection,
  onSaveToHistory
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Customization fields for the printable document
  const [reportTitle, setReportTitle] = useState(customTitle || 'Mokinių apklausos rezultatų ir DI pedagoginės analizės ataskaita');
  const [teacherName, setTeacherName] = useState(localStorage.getItem('saved_teacher_name') || '');
  const [subjectAndClass, setSubjectAndClass] = useState(localStorage.getItem('saved_subject_class') || '');
  const [schoolYear, setSchoolYear] = useState('2025/2026 m. m.');

  // Toggleable sections for printing
  const [includeAI, setIncludeAI] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeCategoryDetails, setIncludeCategoryDetails] = useState(true);
  const [includeHistoryComparison, setIncludeHistoryComparison] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeReflection, setIncludeReflection] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

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
      if (items.length === 0) return '0.00';
      return (items.reduce((acc, i) => acc + i.averageScore, 0) / items.length).toFixed(2);
    })()
  })).filter(g => g.items.length > 0);

  // Top & bottom questions
  const sortedQuestions = [...summaries].sort((a, b) => b.averageScore - a.averageScore);
  const topQuestions = sortedQuestions.slice(0, 3);
  const bottomQuestions = sortedQuestions.slice(-3).reverse();

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 4.0) return 'text-teal-700 bg-teal-50 border-teal-200';
    if (score >= 3.0) return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
  };

  const getBarColor = (score: number) => {
    if (score >= 4.5) return 'bg-emerald-500';
    if (score >= 4.0) return 'bg-teal-500';
    if (score >= 3.0) return 'bg-indigo-500';
    return 'bg-amber-500';
  };

  const saveDetailsToLocal = () => {
    if (teacherName) localStorage.setItem('saved_teacher_name', teacherName);
    if (subjectAndClass) localStorage.setItem('saved_subject_class', subjectAndClass);
  };

  const handleExportPDF = async () => {
    saveDetailsToLocal();
    setIsExporting(true);

    const element = document.getElementById('printable-final-report');
    if (!element) {
      setIsExporting(false);
      window.print();
      return;
    }

    const html2pdf = (window as any).html2pdf;
    if (typeof html2pdf === 'function') {
      try {
        const cleanTeacher = teacherName ? `_${teacherName.replace(/\s+/g, '_')}` : '';
        const cleanClass = subjectAndClass ? `_${subjectAndClass.replace(/[\s\/\\]+/g, '_')}` : '';
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `Ugdymo_kokybes_ir_DI_ataskaita${cleanTeacher}${cleanClass}_${dateStr}.pdf`;

        const opt = {
          margin: [8, 10, 10, 10], // mm: viršus, dešinė, apačia, kairė
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().set(opt).from(element).save();
      } catch (err) {
        console.error('PDF export error, falling back to window.print:', err);
        window.print();
      } finally {
        setIsExporting(false);
      }
    } else {
      setIsExporting(false);
      window.print();
    }
  };

  const handleNativePrint = () => {
    saveDetailsToLocal();
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up pb-24">
      {/* Top Action Toolbar (Hidden in print/export) */}
      <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all flex items-center gap-2 active:scale-95"
          >
            <i className="fas fa-arrow-left"></i> Suvestinė
          </button>
          {!hasReflectionContent && (
            <button
              onClick={onOpenReflection}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 font-bold text-xs uppercase tracking-wider hover:bg-indigo-50 transition-all flex items-center gap-2 active:scale-95"
            >
              <i className="fas fa-pencil"></i> Pildyti refleksiją
            </button>
          )}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 ${
              showConfig 
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <i className="fas fa-sliders"></i> Ataskaitos nustatymai
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onSaveToHistory}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition-all flex items-center gap-2 active:scale-95"
          >
            <i className="fas fa-bookmark text-indigo-500"></i> Išsaugoti
          </button>

          {/* Primary PDF Export button */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-100 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            title="Sugeneruoja ir atsisiunčia ataskaitą kartu su DI įžvalgomis kaip PDF failą"
          >
            <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
            <span>{isExporting ? 'Ruošiamas PDF...' : 'Eksportuoti PDF'}</span>
          </button>

          {/* Native Print button */}
          <button
            onClick={handleNativePrint}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95"
            title="Spausdinti arba išsaugoti per naršyklės spausdinimo langą (Ctrl+P)"
          >
            <i className="fas fa-print"></i>
            <span>Spausdinti</span>
          </button>
        </div>
      </div>

      {/* Configuration & Customization Drawer (Hidden in print) */}
      {showConfig && (
        <div className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-sm space-y-6 print:hidden animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-2">
              <i className="fas fa-sliders text-indigo-600"></i> Spausdinamo PDF dokumento nustatymai
            </h3>
            <span className="text-[11px] text-gray-400 font-medium">Šie duomenys bus atvaizduoti ataskaitos antraštėje</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">
                Mokytojo vardas, pavardė
              </label>
              <input
                type="text"
                placeholder="Pvz.: Tomas Jankūnas"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 bg-slate-50 text-xs font-bold text-gray-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">
                Klasė ir mokomasis dalykas
              </label>
              <input
                type="text"
                placeholder="Pvz.: 8A klasė • Matematika"
                value={subjectAndClass}
                onChange={(e) => setSubjectAndClass(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 bg-slate-50 text-xs font-bold text-gray-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">
                Mokslo metai / Laikotarpis
              </label>
              <input
                type="text"
                placeholder="Pvz.: 2025/2026 m. m."
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 bg-slate-50 text-xs font-bold text-gray-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 mb-1.5">
              Ataskaitos antraštė
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 bg-slate-50 text-xs font-bold text-gray-800 focus:bg-white focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Section Toggles */}
          <div className="pt-2 border-t border-gray-100">
            <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">
              Pasirinkite, kurias sekcijas įtraukti į spausdinamą PDF:
            </span>
            <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAI}
                  onChange={(e) => setIncludeAI(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>DI pedagoginė analizė</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeMetrics}
                  onChange={(e) => setIncludeMetrics(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Pagrindiniai rodikliai ir Top/Bottom klausimai</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCategoryDetails}
                  onChange={(e) => setIncludeCategoryDetails(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Klausimų rezultatai pagal sritis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeHistoryComparison}
                  onChange={(e) => setIncludeHistoryComparison(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Istorinių įrašų palyginimas šalia vienas kito</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Mokinių atviri komentarai</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeReflection}
                  onChange={(e) => setIncludeReflection(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Mokytojo refleksija ir veiksmų planas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Tvirtinimo ir parašo laukai</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Printable / Exportable Document Container */}
      <div 
        id="printable-final-report" 
        className="bg-white p-8 md:p-14 rounded-[3rem] shadow-xl border border-gray-100 report-container print:shadow-none print:p-0 print:border-none print:rounded-none"
      >
        {/* Document Header with School Branding */}
        <div className="border-b-2 border-indigo-900/10 pb-8 mb-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block">
                Vilniaus Antakalnio progimnazija
              </span>
              <span className="text-xs font-bold text-gray-500">
                Ugdymo kokybės stebėsena ir mokinių grįžtamasis ryšys
              </span>
            </div>
            <div className="text-left md:text-right">
              <span className="text-xs font-black text-gray-700 block">{schoolYear}</span>
              <span className="text-[11px] font-semibold text-gray-400">
                Dokumento data: {new Date().toLocaleDateString('lt-LT')}
              </span>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-3 mb-4">
            {reportTitle}
          </h1>

          {/* Teacher & Class Metadata Bar */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 uppercase text-[10px] font-black">Mokytojas(-a):</span>
              <span className="text-indigo-900">{teacherName || 'Nenurodyta'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 uppercase text-[10px] font-black">Klasė / Dalykas:</span>
              <span className="text-indigo-900">{subjectAndClass || 'Nenurodyta'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 uppercase text-[10px] font-black">Dalyviai:</span>
              <span className="text-indigo-900">{totalRespondents} mokiniai(-ių)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 uppercase text-[10px] font-black">Klausimų kiekis:</span>
              <span className="text-indigo-900">{summaries.length}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Key Metrics & Top/Bottom Strengths */}
        {includeMetrics && (
          <section className="report-section mb-12 print-avoid-break">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-100 text-center md:text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1">Bendras vidurkis</span>
                <div className="text-3xl font-black text-indigo-950">{overallAvg} <span className="text-xs font-bold text-indigo-400">/ 5.0</span></div>
              </div>
              <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-100 text-center md:text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1">Pasitenkinimas</span>
                <div className="text-3xl font-black text-emerald-950">
                  {aiInsights?.sentimentScore || Math.round((Number(overallAvg) / 5) * 100)}%
                </div>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 text-center md:text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">Mokinių skaičius</span>
                <div className="text-3xl font-black text-slate-900">{totalRespondents}</div>
              </div>
              <div className="bg-purple-50/70 p-5 rounded-2xl border border-purple-100 text-center md:text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block mb-1">Klausimų kiekis</span>
                <div className="text-3xl font-black text-purple-950">{summaries.length}</div>
              </div>
            </div>

            {/* Top Strengths & Opportunities Box */}
            {summaries.length >= 2 && (
              <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2">
                <div className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100/90">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-arrow-trend-up text-emerald-600"></i> Stipriausiai įvertinti aspektai
                  </h3>
                  <ul className="space-y-3">
                    {topQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-3 text-xs md:text-sm">
                        <span className="text-gray-800 font-medium leading-snug">{q.question}</span>
                        <span className="shrink-0 px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                          {q.averageScore.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/40 p-6 rounded-2xl border border-amber-100/90">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-magnifying-glass-chart text-amber-600"></i> Sritys didesniam dėmesiui
                  </h3>
                  <ul className="space-y-3">
                    {bottomQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-3 text-xs md:text-sm">
                        <span className="text-gray-800 font-medium leading-snug">{q.question}</span>
                        <span className="shrink-0 px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                          {q.averageScore.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Section 2: AI Pedagogical Analysis (Primary focus of export) */}
        {includeAI && aiInsights && (
          <section className="report-section mb-12 print-avoid-break">
            <div className="bg-indigo-950 text-white p-7 md:p-9 rounded-[2.5rem] relative overflow-hidden print:bg-white print:text-gray-900 print:border-2 print:border-indigo-100 print:p-6 print:rounded-2xl">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 print:border-indigo-100">
                <h2 className="text-sm md:text-base font-black uppercase tracking-widest text-indigo-300 print:text-indigo-900 flex items-center gap-2.5">
                  <i className="fas fa-wand-magic-sparkles text-indigo-400 print:text-indigo-600"></i> Dirbtinio intelekto pedagoginė analizė
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/10 text-indigo-200 px-3 py-1 rounded-full print:bg-indigo-50 print:text-indigo-700">
                  DI Mentoriaus įžvalgos
                </span>
              </div>

              {/* Identified Key Themes */}
              {aiInsights.themes && aiInsights.themes.length > 0 && (
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {aiInsights.themes.map((t: any, idx: number) => (
                    <div key={idx} className="bg-white/10 p-4 rounded-xl border border-white/10 print:bg-slate-50 print:border-slate-200">
                      <div className="text-xs font-black text-indigo-200 uppercase tracking-wider mb-1 print:text-indigo-800">
                        {t.label}
                      </div>
                      <p className="text-xs text-indigo-100/90 leading-relaxed print:text-gray-700">
                        {t.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Strengths & Improvements */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 print:bg-emerald-50/50 print:border print:border-emerald-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-2 print:text-emerald-800">
                    <i className="fas fa-circle-check"></i> Mokinių vertinamos stiprybės
                  </h4>
                  <p className="text-sm text-indigo-50/90 leading-relaxed print:text-gray-800 font-medium">
                    {aiInsights.strengths}
                  </p>
                </div>

                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 print:bg-rose-50/50 print:border print:border-rose-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-300 mb-2.5 flex items-center gap-2 print:text-rose-800">
                    <i className="fas fa-triangle-exclamation"></i> Tobulintinos sritys ir rekomendacijos
                  </h4>
                  <p className="text-sm text-indigo-50/90 leading-relaxed print:text-gray-800 font-medium">
                    {aiInsights.improvements}
                  </p>
                </div>
              </div>

              {/* Mentor Synthesis */}
              {aiInsights.insights && (
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 print:bg-indigo-50/40 print:border print:border-indigo-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 mb-2 print:text-indigo-900 flex items-center gap-2">
                    <i className="fas fa-comment-dots"></i> Mentoriaus apibendrinamasis komentaras
                  </h4>
                  <p className="text-sm text-indigo-50/90 leading-relaxed print:text-gray-800">
                    {aiInsights.insights}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 3: Detailed Survey Results by Category */}
        {includeCategoryDetails && (
          <section className="report-section mb-12 print-avoid-break">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <i className="fas fa-list-check text-indigo-600"></i> Rezultatai pagal ugdymo sritis
              </h2>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>

            <div className="space-y-6">
              {groupedSummaries.map((grp) => (
                <div key={grp.category} className="bg-slate-50/70 p-6 rounded-2xl border border-gray-200/80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
                      {grp.category} ({grp.items.length} klausimai)
                    </h3>
                    <span className="text-xs font-bold text-indigo-700 bg-white px-3 py-1 rounded-full border border-indigo-200 shadow-2xs">
                      Vidurkis: {grp.avg} / 5.0
                    </span>
                  </div>

                  <div className="space-y-3">
                    {grp.items.map((item, idx) => {
                      const pct = Math.min(100, Math.max(0, (item.averageScore / 5) * 100));
                      return (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200/70 shadow-2xs">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <span className="text-sm font-semibold text-gray-800 leading-snug">{item.question}</span>
                            <span className={`shrink-0 px-2.5 py-0.5 rounded-lg border text-xs font-black ${getScoreColor(item.averageScore)}`}>
                              {item.averageScore.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getBarColor(item.averageScore)}`}
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
        )}

        {/* Section 3.5: Side-by-Side Historical Records Comparison */}
        {includeHistoryComparison && (
          <HistoryComparisonSection
            history={history || []}
            currentSession={{
              id: 'current-session',
              title: reportTitle || customTitle || 'Dabartinė apklausos ataskaita',
              displayDate: new Date().toLocaleDateString('lt-LT'),
              summaries: summaries,
              aiInsights: aiInsights,
              feedback: openFeedback
            }}
          />
        )}

        {/* Section 4: Open Student Feedback */}
        {includeComments && openFeedback && openFeedback.length > 0 && (
          <section className="report-section mb-12 print-avoid-break">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <i className="fas fa-comment-dots text-indigo-600"></i> Mokinių atviri atsiliepimai ir komentarai
              </h2>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {openFeedback.map((comment, idx) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-gray-200/80 text-sm text-gray-700 italic leading-relaxed">
                  "{comment}"
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 5: Teacher Professional Reflection & Action Plan */}
        {includeReflection && hasReflectionContent && (
          <section className="report-section mb-12 print-avoid-break">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <i className="fas fa-user-pen text-indigo-600"></i> Mokytojo profesinė savirefleksija
              </h2>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {reflection.observations && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1.5">Mokytojo pastebėjimai</span>
                  <p className="text-sm text-gray-800 leading-relaxed italic">"{reflection.observations}"</p>
                </div>
              )}
              {reflection.strengths && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block mb-1.5">Identifikuotos stiprybės</span>
                  <p className="text-sm text-gray-800 leading-relaxed">{reflection.strengths}</p>
                </div>
              )}
              {reflection.improvements && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block mb-1.5">Tobulintini aspektai</span>
                  <p className="text-sm text-gray-800 leading-relaxed">{reflection.improvements}</p>
                </div>
              )}
              {reflection.surprises && (
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block mb-1.5">Kas nustebino</span>
                  <p className="text-sm text-gray-800 leading-relaxed">{reflection.surprises}</p>
                </div>
              )}
            </div>

            {/* Action Plan */}
            {(reflection.actionStop || reflection.actionStart || reflection.actionContinue) && (
              <div className="bg-indigo-900 text-white p-7 rounded-[2rem] print:bg-white print:text-gray-900 print:border-2 print:border-indigo-100 print:p-6 print:rounded-2xl">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300 print:text-indigo-900 mb-5 flex items-center gap-2">
                  <i className="fas fa-rocket text-indigo-400 print:text-indigo-600"></i> Mokytojo veiksmų planas kitam laikotarpiui
                </h3>
                <div className="grid md:grid-cols-3 gap-5 mb-4">
                  {reflection.actionStop && (
                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 print:bg-rose-50 print:border print:border-rose-200">
                      <span className="text-[10px] font-black uppercase text-rose-300 print:text-rose-800 block mb-1.5">Nustosiu</span>
                      <p className="text-xs text-white/90 print:text-gray-800 leading-relaxed">{reflection.actionStop}</p>
                    </div>
                  )}
                  {reflection.actionStart && (
                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 print:bg-emerald-50 print:border print:border-emerald-200">
                      <span className="text-[10px] font-black uppercase text-emerald-300 print:text-emerald-800 block mb-1.5">Pradėsiu</span>
                      <p className="text-xs text-white/90 print:text-gray-800 leading-relaxed">{reflection.actionStart}</p>
                    </div>
                  )}
                  {reflection.actionContinue && (
                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 print:bg-teal-50 print:border print:border-teal-200">
                      <span className="text-[10px] font-black uppercase text-teal-300 print:text-teal-800 block mb-1.5">Tęsiu</span>
                      <p className="text-xs text-white/90 print:text-gray-800 leading-relaxed">{reflection.actionContinue}</p>
                    </div>
                  )}
                </div>
                {reflection.nextSteps && (
                  <div className="pt-3 border-t border-white/10 print:border-indigo-100">
                    <span className="text-[10px] font-black uppercase text-indigo-300 print:text-indigo-800 block mb-1">Kaip matuosi sėkmę</span>
                    <p className="text-xs text-white/90 print:text-gray-800 leading-relaxed">{reflection.nextSteps}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Section 6: Official Signatures & Verification (for print) */}
        {includeSignatures && (
          <section className="report-section mt-12 pt-8 border-t-2 border-gray-200 print-avoid-break">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-gray-700">
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Ataskaitą parengė</span>
                <div className="pt-8 border-b border-gray-400/60 flex justify-between items-end">
                  <span className="font-bold text-gray-800">{teacherName || 'Mokytojas(-a)'}</span>
                  <span className="text-[10px] text-gray-400 font-medium italic">(parašas)</span>
                </div>
              </div>
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Susipažinta / Patvirtinta</span>
                <div className="pt-8 border-b border-gray-400/60 flex justify-between items-end">
                  <span className="text-gray-500 italic">Metodinė grupė / Administracija</span>
                  <span className="text-[10px] text-gray-400 font-medium italic">(parašas, data)</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Document Footer */}
        <div className="mt-12 pt-4 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest gap-2">
          <span>Ugdymo kokybė • Vilniaus Antakalnio progimnazija</span>
          <span>Dokumentas sugeneruotas su DI analize: {new Date().toLocaleDateString('lt-LT')}</span>
        </div>
      </div>
    </div>
  );
};

export default FinalReport;
