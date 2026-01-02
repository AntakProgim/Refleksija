
import React, { useState, useEffect } from 'react';
import { AppStep, SurveyRow, QuestionSummary, LIKERT_VALUES, ReflectionData, CATEGORY_MAP, REVERSE_QUESTIONS } from './types';
import CSVUpload from './components/CSVUpload';
import SummaryDashboard from './components/SummaryDashboard';
import ReflectionWizard from './components/ReflectionWizard';
import { getAIInsights } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [summaries, setSummaries] = useState<QuestionSummary[]>([]);
  const [openFeedback, setOpenFeedback] = useState<string[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  
  const [reflection, setReflection] = useState<ReflectionData>({
    observations: '', strengths: '', improvements: '', surprises: '',
    bestPractices: '', heartFeelings: '', headThoughts: '',
    actionStop: '', actionStart: '', actionContinue: '', nextSteps: ''
  });

  useEffect(() => {
    const savedHistory = localStorage.getItem('teacher_reflection_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const hash = window.location.hash;
    if (hash.startsWith('#data=')) {
      try {
        const base64 = hash.replace('#data=', '');
        const decodedData = JSON.parse(decodeURIComponent(escape(atob(base64))));
        setReflection(decodedData);
        setStep(AppStep.REPORT);
        window.history.replaceState(null, '', window.location.pathname);
      } catch (e) { console.error(e); }
    }
  }, []);

  const saveToHistory = () => {
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      data: reflection,
      summary: summaries.length > 0 ? summaries[0].question.substring(0, 30) + '...' : 'Mokslo metų vertinimas'
    };
    const updated = [newEntry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem('teacher_reflection_history', JSON.stringify(updated));
  };

  const handleDataParsed = (rows: SurveyRow[]) => {
    processData(rows);
    setStep(AppStep.ANALYSIS);
  };

  const handleNewAnalysis = () => {
    if (step !== AppStep.UPLOAD) {
      if (confirm('Ar tikrai norite pradėti naują analizę? Visi nebaigti refleksijos pokyčiai gali būti prarasti.')) {
        window.location.reload();
      }
    }
  };

  const cleanHeader = (header: string): string => {
    const match = header.match(/\[(.*?)\]/);
    if (match && match[1]) return match[1].trim();
    return header.replace(/^Prašome atsakyti į klausimus nuoširdžiai, taip, kaip manote ir jaučiatės\.\s*/i, '').trim();
  };

  const processData = (rows: SurveyRow[]) => {
    if (rows.length === 0) return;
    const rawHeaders = Object.keys(rows[0]);
    const newSummaries: QuestionSummary[] = [];
    const feedback: string[] = [];

    rawHeaders.forEach(rawHeader => {
      if (rawHeader.toLowerCase().includes('laiko žymė')) return;
      const cleanedHeader = cleanHeader(rawHeader);
      const headerLower = rawHeader.toLowerCase();
      const isFeedbackField = headerLower.includes('idėja') || headerLower.includes('pasiūlymas') || headerLower.includes('komentar') || headerLower.includes('kodėl') || headerLower.includes('manote') || headerLower.includes('jaučiatės');

      let sum = 0, validCount = 0, isNumeric = false;
      const counts: { [val: string]: number } = {};

      rows.forEach(row => {
        const val = row[rawHeader]?.trim();
        if (val) {
          counts[val] = (counts[val] || 0) + 1;
          const normalizedVal = val.endsWith('.') ? val.slice(0, -1) : val;
          if (LIKERT_VALUES[normalizedVal] || LIKERT_VALUES[val]) { 
            sum += (LIKERT_VALUES[normalizedVal] || LIKERT_VALUES[val]); 
            validCount++; 
            isNumeric = true; 
          }
        }
      });

      if (isNumeric && validCount > 0) {
        const categoryKey = Object.keys(CATEGORY_MAP).find(k => cleanedHeader.toLowerCase().includes(k.toLowerCase()) || rawHeader.toLowerCase().includes(k.toLowerCase()));
        const category = categoryKey ? CATEGORY_MAP[categoryKey] : 'Kita';
        newSummaries.push({
          question: cleanedHeader,
          counts,
          total: rows.length,
          averageScore: sum / validCount,
          category,
          isReverse: REVERSE_QUESTIONS.some(q => cleanedHeader.toLowerCase().includes(q.toLowerCase()))
        });
      } else {
        rows.forEach(row => { 
          const val = row[rawHeader]?.trim();
          if (val && val.length > 5 && !LIKERT_VALUES[val] && !LIKERT_VALUES[val.slice(0, -1)]) feedback.push(val); 
        });
      }
    });
    setSummaries(newSummaries);
    setOpenFeedback(feedback);
  };

  useEffect(() => {
    if (step === AppStep.ANALYSIS && summaries.length > 0 && !aiInsights) {
      setIsAnalyzing(true);
      getAIInsights(summaries, openFeedback).then(res => {
        setAiInsights(res);
        setIsAnalyzing(false);
      });
    }
  }, [step, summaries, aiInsights, openFeedback]);

  const handleShare = () => {
    const dataString = JSON.stringify(reflection);
    const base64 = btoa(unescape(encodeURIComponent(dataString)));
    const url = `${window.location.origin}${window.location.pathname}#data=${base64}`;
    navigator.clipboard.writeText(url).then(() => {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 selection:bg-indigo-100">
      {showShareToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-2xl animate-slide-up flex items-center gap-4 border border-white/10">
          <i className="fas fa-check-circle text-emerald-400"></i> Nuoroda nukopijuota sėkmingai!
        </div>
      )}

      <header className="bg-white border-b border-gray-100 py-6 mb-8 print:hidden">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fas fa-graduation-cap"></i></div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Refleksijos pagalbininkas</h1>
          </div>
          {step !== AppStep.UPLOAD && (
            <button onClick={handleNewAnalysis} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-colors">
              Nauja analizė
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6">
        {step === AppStep.UPLOAD && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black text-gray-900 tracking-tight">Mokslo metų analizė</h2>
              <p className="text-gray-500 max-w-lg mx-auto text-lg font-medium">Įkelk apklausos rezultatus ir leisk DI mentorystei nukreipti tavo augimą.</p>
            </div>
            <CSVUpload onParsed={handleDataParsed} />
            {history.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 px-2">Ankstesnės refleksijos</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {history.map(item => (
                    <button key={item.id} onClick={() => { setReflection(item.data); setStep(AppStep.REPORT); }} className="bg-white p-6 rounded-[2rem] border border-gray-100 text-left flex items-center justify-between group hover:shadow-xl hover:border-indigo-100 transition-all">
                      <div><p className="font-black text-gray-800 text-lg">{new Date(item.date).toLocaleDateString('lt-LT')}</p><p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">{item.summary}</p></div>
                      <i className="fas fa-chevron-right text-gray-200 group-hover:text-indigo-500 transition-all"></i>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === AppStep.ANALYSIS && <SummaryDashboard summaries={summaries} feedback={openFeedback} aiInsights={aiInsights} isAnalyzing={isAnalyzing} onNext={() => setStep(AppStep.REFLECTION)} />}
        
        {step === AppStep.REFLECTION && <ReflectionWizard reflection={reflection} setReflection={setReflection} aiInsights={aiInsights} onComplete={() => { saveToHistory(); setStep(AppStep.REPORT); }} onBack={() => setStep(AppStep.ANALYSIS)} />}

        {step === AppStep.REPORT && (
          <div className="max-w-4xl mx-auto bg-white p-10 md:p-16 rounded-[4rem] shadow-2xl animate-scale-in print:shadow-none print:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 border-b border-gray-100 pb-12 print:hidden gap-6">
              <div>
                <h2 className="text-4xl font-black text-gray-900">Refleksijos rezultatas</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">{new Date().toLocaleDateString('lt-LT')}</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={handleShare} className="flex-1 px-6 py-4 rounded-2xl border-2 border-indigo-50 text-indigo-600 font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95"><i className="fas fa-share"></i> Dalintis</button>
                <button onClick={() => window.print()} className="flex-1 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-95"><i className="fas fa-file-pdf"></i> Atsisiųsti PDF</button>
              </div>
            </div>

            <div className="space-y-16">
              <section className="grid md:grid-cols-2 gap-12">
                <div className="space-y-4"><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Pastebėjimai</h4><p className="text-gray-700 italic text-xl">"{reflection.observations || '-'}"</p></div>
                <div className="space-y-4"><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Stiprybės</h4><p className="text-gray-700 text-xl font-medium">{reflection.strengths || '-'}</p></div>
              </section>

              <section className="bg-slate-900 text-white p-12 rounded-[3rem] space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full"></div>
                <h3 className="font-black text-2xl flex items-center gap-4 relative z-10"><i className="fas fa-rocket text-indigo-400"></i> Veiksmų planas kitais metais</h3>
                <div className="grid md:grid-cols-3 gap-10 relative z-10 text-indigo-50/80">
                  <div className="space-y-2"><h5 className="text-[10px] font-black uppercase tracking-widest text-rose-400 border-b border-rose-400/20 pb-2">Nustosiu</h5><p className="text-sm">{reflection.actionStop || '-'}</p></div>
                  <div className="space-y-2"><h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 border-b border-emerald-400/20 pb-2">Pradėsiu</h5><p className="text-sm">{reflection.actionStart || '-'}</p></div>
                  <div className="space-y-2"><h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 border-b border-indigo-400/20 pb-2">Tęsiu</h5><p className="text-sm">{reflection.actionContinue || '-'}</p></div>
                </div>
                <div className="pt-8 border-t border-white/5 relative z-10 text-indigo-50/80">
                  <h5 className="text-[10px] font-black uppercase text-indigo-300 mb-2">Kaip žinosiu, kad vaikams sekasi geriau?</h5>
                  <p className="text-sm">{reflection.nextSteps || '-'}</p>
                </div>
              </section>

              <section className="grid md:grid-cols-2 gap-12">
                <div className="space-y-4"><h4 className="text-[10px] font-black uppercase text-gray-400">Geroji patirtis</h4><p className="text-gray-700">{reflection.bestPractices || '-'}</p></div>
                <div className="space-y-4"><h4 className="text-[10px] font-black uppercase text-gray-400">Refleksijos emocija</h4><p className="text-gray-700">{reflection.heartFeelings} • {reflection.headThoughts}</p></div>
              </section>

              <div className="text-center pt-10 border-t border-gray-100"><p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.4em]">Refleksijos pagalbininkas • Profesinis augimas mokinio sėkmei</p></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
