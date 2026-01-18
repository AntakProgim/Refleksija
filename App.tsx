
import React, { useState, useEffect } from 'react';
import { AppStep, SurveyRow, QuestionSummary, LIKERT_VALUES, ReflectionData, CATEGORY_MAP, REVERSE_QUESTIONS } from './types';
import CSVUpload from './components/CSVUpload';
import SummaryDashboard from './components/SummaryDashboard';
import ReflectionWizard from './components/ReflectionWizard';
import { getAIInsights } from './services/geminiService';

const SESSION_DRAFT_KEY = 'teacher_reflection_session_v1';
const EXTERNAL_LINK = "https://sites.google.com/antakalnio.lt/ugdymokokybe/pagrindinis-puslapis";

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [summaries, setSummaries] = useState<QuestionSummary[]>([]);
  const [openFeedback, setOpenFeedback] = useState<string[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  
  const [reflection, setReflection] = useState<ReflectionData>({
    observations: '', strengths: '', improvements: '', surprises: '',
    bestPractices: '', heartFeelings: '', headThoughts: '',
    actionStop: '', actionStart: '', actionContinue: '', nextSteps: ''
  });

  useEffect(() => {
    const savedHistory = localStorage.getItem('teacher_reflection_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const draft = localStorage.getItem(SESSION_DRAFT_KEY);
    if (draft) setHasDraft(true);
  }, []);

  useEffect(() => {
    if (step !== AppStep.UPLOAD && step !== AppStep.REPORT) {
      const stateToSave = {
        step, summaries, openFeedback, aiInsights, reflection, timestamp: Date.now()
      };
      localStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(stateToSave));
    }
  }, [step, summaries, openFeedback, aiInsights, reflection]);

  const handleResumeSession = () => {
    const draftJson = localStorage.getItem(SESSION_DRAFT_KEY);
    if (draftJson) {
      try {
        const draft = JSON.parse(draftJson);
        setSummaries(draft.summaries || []);
        setOpenFeedback(draft.openFeedback || []);
        setAiInsights(draft.aiInsights || null);
        setReflection(draft.reflection);
        setStep(draft.step);
        setHasDraft(false);
      } catch (e) {
        localStorage.removeItem(SESSION_DRAFT_KEY);
      }
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem(SESSION_DRAFT_KEY);
    setHasDraft(false);
  };

  const saveToHistory = (title: string) => {
    const dateStr = new Date().toLocaleDateString('lt-LT');
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      displayDate: dateStr,
      title: title || `Refleksija ${dateStr}`,
      data: reflection,
      aiInsights: aiInsights,
      summaries: summaries,
      feedback: openFeedback
    };
    const updated = [newEntry, ...history].slice(0, 30);
    setHistory(updated);
    localStorage.setItem('teacher_reflection_history', JSON.stringify(updated));
    localStorage.removeItem(SESSION_DRAFT_KEY);
    setStep(AppStep.REPORT);
  };

  const deleteFromHistory = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Ar tikrai norite ištrinti šį įrašą?')) {
      const updated = history.filter(item => item.id !== id);
      setHistory(updated);
      localStorage.setItem('teacher_reflection_history', JSON.stringify(updated));
    }
  };

  const handleDataParsed = (rows: SurveyRow[]) => {
    processData(rows);
    setStep(AppStep.ANALYSIS);
  };

  const processData = (rows: SurveyRow[]) => {
    if (rows.length === 0) return;
    const rawHeaders = Object.keys(rows[0]);
    const newSummaries: QuestionSummary[] = [];
    const feedback: string[] = [];

    rawHeaders.forEach(rawHeader => {
      if (rawHeader.toLowerCase().includes('laiko žymė')) return;
      const cleanedHeader = rawHeader.match(/\[(.*?)\]/)?.[1] || rawHeader.trim();
      
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
        const categoryKey = Object.keys(CATEGORY_MAP).find(k => cleanedHeader.toLowerCase().includes(k.toLowerCase()));
        newSummaries.push({
          question: cleanedHeader,
          counts,
          total: rows.length,
          averageScore: sum / validCount,
          category: categoryKey ? CATEGORY_MAP[categoryKey] : 'Kita',
          isReverse: REVERSE_QUESTIONS.some(q => cleanedHeader.toLowerCase().includes(q.toLowerCase()))
        });
      } else {
        rows.forEach(row => { 
          const val = row[rawHeader]?.trim();
          if (val && val.length > 5 && !LIKERT_VALUES[val]) feedback.push(val); 
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

  // Fix: Explicitly cast value to string to resolve trim() error on unknown type
  const hasReflectionContent = Object.values(reflection).some(v => (v as string).trim().length > 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-scale-in">
            <h3 className="text-2xl font-black mb-2 tracking-tight">Išsaugoti įrašą</h3>
            <p className="text-gray-500 mb-6 text-sm">Suteikite pavadinimą šiai analizei. Data bus pridėta automatiškai.</p>
            <input 
              type="text" 
              placeholder="Pvz.: 8A klasės apklausa" 
              className="w-full p-4 bg-gray-50 border-2 border-indigo-50 rounded-2xl mb-6 outline-none focus:border-indigo-500 transition-all font-bold"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 py-4 rounded-2xl bg-gray-100 font-black text-xs uppercase tracking-widest transition-all">Atšaukti</button>
              <button 
                onClick={() => { saveToHistory(customTitle); setShowSaveModal(false); }} 
                className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all"
              >
                Išsaugoti
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-100 py-6 mb-8 print:hidden">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fas fa-graduation-cap"></i></div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Refleksijos pagalbininkas</h1>
          </div>
          <div className="flex items-center gap-6">
            <a href={EXTERNAL_LINK} target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-all">
              <i className="fas fa-external-link-alt"></i> Ugdymo kokybė
            </a>
            {step !== AppStep.UPLOAD && (
              <button onClick={() => window.location.reload()} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-colors">
                Nauja analizė
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 print:px-0">
        {step === AppStep.UPLOAD && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black text-gray-900 tracking-tight">Mokslo metų analizė</h2>
              <p className="text-gray-500 max-w-lg mx-auto text-lg font-medium">Įkelk apklausos rezultatus ir leisk DI mentorystei nukreipti tavo augimą.</p>
            </div>

            {hasDraft && (
              <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl animate-scale-in flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md"><i className="fas fa-rotate-left"></i></div>
                  <div>
                    <h3 className="text-xl font-black">Tęsti nebaigtą sesiją?</h3>
                    <p className="text-indigo-100/80 text-sm font-medium">Radome jūsų paskutinį nebaigtą darbą.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleClearDraft} className="px-6 py-4 rounded-2xl bg-white/10 font-black text-xs uppercase tracking-widest">Ištrinti</button>
                  <button onClick={handleResumeSession} className="px-10 py-4 rounded-2xl bg-white text-indigo-600 font-black text-xs uppercase tracking-widest shadow-xl">Tęsti</button>
                </div>
              </div>
            )}

            <CSVUpload onParsed={handleDataParsed} />
            
            {history.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 px-2">Išsaugotos refleksijos</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {history.map(item => (
                    <div key={item.id} className="relative group">
                      <button 
                        onClick={() => { 
                          setReflection(item.data); 
                          setAiInsights(item.aiInsights); 
                          setSummaries(item.summaries);
                          setStep(AppStep.REPORT); 
                        }} 
                        className="w-full bg-white p-6 rounded-[2rem] border border-gray-100 text-left flex items-center justify-between hover:shadow-xl hover:border-indigo-100 transition-all pr-16"
                      >
                        <div>
                          <p className="font-black text-gray-800 text-lg leading-tight">{item.title}</p>
                          <p className="text-[10px] text-indigo-500 mt-1 uppercase font-black tracking-widest">{item.displayDate}</p>
                        </div>
                        <i className="fas fa-chevron-right text-gray-200 group-hover:text-indigo-500 transition-all"></i>
                      </button>
                      <button 
                        onClick={(e) => deleteFromHistory(item.id, e)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-gray-200 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      ><i className="fas fa-trash-can text-sm"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === AppStep.ANALYSIS && (
          <SummaryDashboard 
            summaries={summaries} 
            feedback={openFeedback} 
            aiInsights={aiInsights} 
            isAnalyzing={isAnalyzing} 
            onNext={() => setStep(AppStep.REFLECTION)} 
            onFinish={() => { setCustomTitle(''); setShowSaveModal(true); }}
          />
        )}
        
        {step === AppStep.REFLECTION && (
          <ReflectionWizard 
            reflection={reflection} 
            setReflection={setReflection} 
            aiInsights={aiInsights} 
            onComplete={() => { setCustomTitle(''); setShowSaveModal(true); }} 
            onBack={() => setStep(AppStep.ANALYSIS)} 
            onSaveAndExit={() => { setCustomTitle(''); setShowSaveModal(true); }} 
          />
        )}

        {step === AppStep.REPORT && (
          <div className="max-w-4xl mx-auto bg-white p-10 md:p-16 rounded-[4rem] shadow-2xl report-container print:shadow-none print:p-0 print:m-0 print:rounded-none print:max-w-none">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 border-b border-gray-100 pb-12 print:pb-8 print:mb-10 gap-6">
              <div>
                <h2 className="text-4xl font-black text-gray-900 print:text-2xl">Ataskaitos santrauka</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">{new Date().toLocaleDateString('lt-LT')}</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto print:hidden">
                <button onClick={() => window.print()} className="flex-1 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 transition-all active:scale-95"><i className="fas fa-file-pdf"></i> Atsisiųsti PDF</button>
              </div>
            </div>

            <div className="space-y-16 print:space-y-10">
              {/* Only show AI Insights if they exist */}
              {aiInsights && (
                <section className="report-section bg-slate-50 p-8 rounded-[2rem] border border-gray-100 print:bg-white">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 mb-6"><i className="fas fa-microchip"></i> DI Duomenų įžvalgos</h3>
                  <div className="grid md:grid-cols-2 gap-8 print:grid-cols-1">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-emerald-600 mb-2">Stiprybės</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{aiInsights.strengths}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-rose-600 mb-2">Tobulėtinos sritys</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{aiInsights.improvements}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Only show teacher reflection if fields are not empty */}
              {hasReflectionContent && (
                <>
                  <section className="report-section grid md:grid-cols-2 gap-12 print:grid-cols-1 print:gap-8">
                    {reflection.observations && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Mokytojo pastebėjimai</h4>
                        <p className="text-gray-700 italic text-xl print:text-base leading-relaxed">"{reflection.observations}"</p>
                      </div>
                    )}
                    {reflection.strengths && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Identifikuotos stiprybės</h4>
                        <p className="text-gray-700 text-xl font-medium print:text-base leading-relaxed">{reflection.strengths}</p>
                      </div>
                    )}
                  </section>

                  <section className="report-section bg-slate-900 text-white p-12 rounded-[3rem] space-y-10 relative overflow-hidden print:bg-white print:text-black print:border print:rounded-2xl print:p-8">
                    <h3 className="font-black text-2xl flex items-center gap-4 relative z-10 print:text-xl"><i className="fas fa-rocket text-indigo-400"></i> Veiksmų planas</h3>
                    <div className="grid md:grid-cols-3 gap-10 relative z-10 print:grid-cols-1 print:gap-6">
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-rose-400 pb-2 border-b border-rose-400/20">Nustosiu</h5>
                        <p className="text-sm">{reflection.actionStop || '-'}</p>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 pb-2 border-b border-emerald-400/20">Pradėsiu</h5>
                        <p className="text-sm">{reflection.actionStart || '-'}</p>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 pb-2 border-b border-indigo-400/20">Tęsiu</h5>
                        <p className="text-sm">{reflection.actionContinue || '-'}</p>
                      </div>
                    </div>
                  </section>
                </>
              )}

              <div className="text-center pt-10 border-t border-gray-100 print:pt-6 print:mt-10">
                <a href={EXTERNAL_LINK} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.4em] hover:text-indigo-600 transition-all">
                  ugdymo kokybė • Antakalnio progimnazija
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <footer className="mt-20 py-10 text-center border-t border-gray-100 print:hidden">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">
           Sukurta remiantis <a href={EXTERNAL_LINK} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-500 transition-all underline">ugdymo kokybės metodika</a>
         </p>
      </footer>
    </div>
  );
};

export default App;
