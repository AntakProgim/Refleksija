
import React, { useState, useEffect, useRef } from 'react';
import { ReflectionData } from '../types';
import { transcribeAudio, getReflectionSuggestions } from '../services/geminiService';

interface ReflectionWizardProps {
  reflection: ReflectionData;
  setReflection: React.Dispatch<React.SetStateAction<ReflectionData>>;
  onComplete: () => void;
  onBack: () => void;
}

const DRAFT_KEY = 'teacher_reflection_draft_v1';

const ReflectionWizard: React.FC<ReflectionWizardProps> = ({ 
  reflection, 
  setReflection, 
  onComplete,
  onBack
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(new Set());
  const [focusedFieldKey, setFocusedFieldKey] = useState<string | null>(null);
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Moods / Emotions
  const [showEmotionsMenu, setShowEmotionsMenu] = useState(false);
  const emotionsList = ['Džiaugsmas', 'Liūdesys', 'Skausmas', 'Apmąstymai', 'Nuobodulys', 'Įkvėpimas', 'Nerimas', 'Pasididžiavimas', 'Nuovargis'];

  const [aiSuggestions, setAiSuggestions] = useState<any>({
    observationSuggestions: [],
    analysisSuggestions: [],
    bestPracticeSuggestions: [],
    emotionSuggestions: [],
    actionSuggestions: [],
    nextStepSuggestions: []
  });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Auto-save effect
  useEffect(() => {
    setIsAutoSaving(true);
    const timeout = setTimeout(() => {
      const draft = { reflection, currentStep, timestamp: new Date().getTime() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSaved(new Date());
      setIsAutoSaving(false);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [reflection, currentStep]);

  // Tab close prevention
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasContent = Object.values(reflection).some(v => (v as string).trim().length > 10);
      if (hasContent) {
        e.preventDefault();
        e.returnValue = 'Ar tikrai norite išeiti? Jūsų nebaigta refleksija yra išsaugota naršyklėje kaip juodraštis.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [reflection]);

  // Resume Draft Check
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        const isCurrentlyEmpty = Object.values(reflection).every(val => (val as string).trim() === '');
        const draftHasContent = Object.values(parsed.reflection).some(val => (val as string).trim() !== '');
        if (isCurrentlyEmpty && draftHasContent) {
          setShowResumePrompt(true);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  // AI Suggestions Trigger
  useEffect(() => {
    const isTargetStep = currentStep === 2 || currentStep === 4; 
    const hasBaseData = reflection.observations.trim() && 
                        reflection.strengths.trim() && 
                        reflection.improvements.trim();

    if (isTargetStep && hasBaseData) {
      generateAIPrompts();
    }
  }, [currentStep]);

  const generateAIPrompts = async () => {
    if (isLoadingSuggestions) return;
    setIsLoadingSuggestions(true);
    try {
      const suggestions = await getReflectionSuggestions(
        reflection.observations,
        reflection.strengths,
        reflection.improvements,
        reflection.surprises
      );
      setAiSuggestions(suggestions);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsLoadingSuggestions(false); 
    }
  };

  const handleFieldFocus = (fieldKey: string) => {
    setFocusedFieldKey(fieldKey);
  };

  const startRecording = async (field: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          const transcription = await transcribeAudio(base64Audio, 'audio/webm');
          if (transcription) {
            setReflection(prevRef => ({ 
              ...prevRef, 
              [field]: prevRef[field as keyof ReflectionData] 
                ? `${prevRef[field as keyof ReflectionData].trim()}\n${transcription}` 
                : transcription 
            }));
          }
          setIsTranscribing(false);
        };
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingField(field);
    } catch (err) { alert("Nepavyko pasiekti mikrofono."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingField(null);
    }
  };

  const insertSuggestion = (field: keyof ReflectionData, suggestion: string) => {
    setReflection(prevRef => {
      const currentVal = prevRef[field];
      const newVal = currentVal && currentVal.trim().length > 0 
        ? `${currentVal.trim()}\n• ${suggestion}` 
        : `• ${suggestion}`;
      return { ...prevRef, [field]: newVal };
    });
  };

  const steps = [
    {
      title: "1. Pastebėjimai",
      description: "Kas krenta į akis žiūrint į mokinių duomenis?",
      fields: [
        { key: 'observations', label: "Objektyvūs pastebėjimai", placeholder: "Pvz.: Pastebiu, kad mokiniai nurodė...", icon: "fa-eye", suggestionsKey: 'observationSuggestions' }
      ]
    },
    {
      title: "2. Analizė",
      description: "Stiprybės, kryptys ir netikėtumai mokinio akimis",
      fields: [
        { key: 'strengths', label: "Kuo mokiniai džiaugiasi?", placeholder: "Mokiniams patiko...", icon: "fa-star", suggestionsKey: 'analysisSuggestions' },
        { key: 'improvements', label: "Ką vaikai norėtų keisti?", placeholder: "Mokiniai indikavo, kad...", icon: "fa-chart-line", suggestionsKey: 'analysisSuggestions' },
        { key: 'surprises', label: "Kas nustebino?", placeholder: "Nebuvau pagalvojęs, kad mokiniai...", icon: "fa-bolt", suggestionsKey: 'analysisSuggestions' }
      ]
    },
    {
      title: "3. Geroji patirtis",
      description: "Sėkmingi metodai, kuriuos vertina vaikai",
      fields: [
        { key: 'bestPractices', label: "Gerąsios praktikos", placeholder: "Pvz.: Mokiniai itin vertina grįžtamąjį ryšį...", icon: "fa-thumbs-up", suggestionsKey: 'bestPracticeSuggestions' }
      ]
    },
    {
      title: "4. Galva ir Širdis",
      description: "Tavo reakcija į vaikų atvirumą",
      fields: [
        { key: 'heartFeelings', label: "Kaip reaguoja ŠIRDIS?", placeholder: "Pamačius mokinių atsakymus, jaučiuosi...", icon: "fa-heart", suggestionsKey: 'emotionSuggestions', hasEmotions: true },
        { key: 'headThoughts', label: "Ką sako GALVA?", placeholder: "Racionaliai vertinant mokinių poreikius...", icon: "fa-brain", suggestionsKey: 'emotionSuggestions' }
      ]
    },
    {
      title: "5. Veiksmų planas",
      description: "Ką darysi kitaip kitais metais dėl savo mokinių?",
      fields: [
        { key: 'actionStop', label: "Ką nustosi daryti?", placeholder: "Nustosiu...", icon: "fa-circle-stop", suggestionsKey: 'actionSuggestions' },
        { key: 'actionStart', label: "Ką pradėsi daryti?", placeholder: "Pradėsiu...", icon: "fa-circle-play", suggestionsKey: 'actionSuggestions' },
        { key: 'actionContinue', label: "Ką tęsi?", placeholder: "Tęsiu...", icon: "fa-rotate", suggestionsKey: 'actionSuggestions' },
        { key: 'nextSteps', label: "Kaip matuosi sėkmę?", placeholder: "Kitąmet mokiniai turėtų pajusti...", icon: "fa-bullseye", suggestionsKey: 'nextStepSuggestions' }
      ]
    }
  ];

  const currentStepFields = steps[currentStep].fields;
  const isStepValid = currentStepFields.every(field => {
    const val = (reflection as any)[field.key];
    return val && val.trim().length > 0;
  });

  const next = () => {
    setTouchedSteps(prev => new Set(prev).add(currentStep));
    if (!isStepValid) return;

    if (currentStep < steps.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setAnimating(false);
      }, 200);
    } else {
      setShowFinalConfirm(true);
    }
  };

  const handleBackWithConfirm = () => {
    if (Object.values(reflection).some(v => (v as string).trim().length > 5)) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12 relative">
      {/* Resume Draft Prompt */}
      {showResumePrompt && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center animate-scale-in">
            <h3 className="text-2xl font-black mb-4 tracking-tight">Tęsti nebaigtą darbą?</h3>
            <p className="text-gray-500 mb-8 font-medium">Radome išsaugotą jūsų refleksijos juodraštį.</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => { 
                const d = JSON.parse(localStorage.getItem(DRAFT_KEY)!); 
                setReflection(d.reflection); 
                setCurrentStep(d.currentStep); 
                setShowResumePrompt(false); 
              }} className="bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Tęsti pildymą</button>
              <button onClick={() => { 
                localStorage.removeItem(DRAFT_KEY); 
                setShowResumePrompt(false); 
              }} className="bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all">Pradėti iš naujo</button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center">
            <h3 className="text-2xl font-black mb-4 tracking-tight text-rose-600">Išeiti iš refleksijos?</h3>
            <p className="text-gray-500 mb-8 font-medium">Jūsų progresas išsaugotas kaip juodraštis, bet grįšite į duomenų apžvalgą.</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => { setShowExitConfirm(false); onBack(); }} className="bg-gray-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Taip, išeiti</button>
              <button onClick={() => setShowExitConfirm(false)} className="bg-indigo-50 text-indigo-600 font-black py-4 rounded-2xl hover:bg-indigo-100 transition-all">Likti ir pildyti</button>
            </div>
          </div>
        </div>
      )}

      {/* Final Summary Confirmation Modal */}
      {showFinalConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-lg">
          <div className="bg-white rounded-[3rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl animate-scale-in max-h-[90vh] flex flex-col">
            <div className="mb-8 shrink-0">
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">Refleksijos santrauka</h3>
              <p className="text-gray-500 font-medium mt-2">Peržiūrėkite savo įžvalgas prieš generuojant galutinę ataskaitą.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8">
              {steps.map((step, idx) => (
                <div key={idx} className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 border-b border-indigo-50 pb-2">{step.title}</h4>
                  <div className="space-y-6">
                    {step.fields.map(field => (
                      <div key={field.key} className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-2 flex items-center gap-2">
                          <i className={`fas ${field.icon} text-[8px]`}></i> {field.label}
                        </p>
                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{(reflection as any)[field.key] || '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 shrink-0 grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowFinalConfirm(false)} 
                className="bg-gray-100 text-gray-500 font-black py-5 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 text-sm"
              >
                Grįžti ir taisyti
              </button>
              <button 
                onClick={() => { setShowFinalConfirm(false); onComplete(); }} 
                className="bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 text-sm"
              >
                Patvirtinti ir baigti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-save Status */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex items-center gap-3">
           <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${isAutoSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
           <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
             {isAutoSaving ? 'Išsaugoma...' : `Auto-išsaugota: ${lastSaved ? lastSaved.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' }) : 'Ką tik'}`}
           </span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
          Žingsnis {currentStep + 1} iš {steps.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex justify-between mb-16 relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 -z-10 rounded-full"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 -z-10 rounded-full transition-all duration-500" style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}></div>
        {steps.map((_, idx) => (
          <button key={idx} onClick={() => idx < currentStep && setCurrentStep(idx)} className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${idx === currentStep ? 'bg-indigo-600 text-white shadow-xl scale-110' : idx < currentStep ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-300 border border-gray-100'}`}>
            {idx < currentStep ? <i className="fas fa-check"></i> : idx + 1}
          </button>
        ))}
      </div>

      {/* Wizard Content Card */}
      <div className={`bg-white p-8 md:p-12 rounded-[3rem] shadow-xl transition-all duration-300 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">
            Profesinė savirefleksija
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{steps[currentStep].title}</h2>
          <p className="text-gray-500 font-medium">{steps[currentStep].description}</p>
        </header>

        <div className="space-y-12">
          {steps[currentStep].fields.map((field) => {
            const val = (reflection as any)[field.key];
            const isEmpty = !val || val.trim().length === 0;
            const showError = isEmpty && touchedSteps.has(currentStep);
            const isFocused = focusedFieldKey === field.key;
            const isThisRecording = isRecording && recordingField === field.key;

            return (
              <div key={field.key} className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-black text-gray-800 flex items-center gap-3">
                    <i className={`fas ${field.icon} ${showError ? 'text-rose-500' : 'text-indigo-500'}`}></i> 
                    {field.label}
                    {showError && <span className="text-[9px] text-rose-500 uppercase tracking-widest font-black bg-rose-50 px-2 py-0.5 rounded-full">Privaloma</span>}
                  </label>
                  
                  <div className="flex gap-2">
                    {field.hasEmotions && (
                      <div className="relative">
                        <button 
                          onClick={() => setShowEmotionsMenu(!showEmotionsMenu)} 
                          className="px-4 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center gap-2 hover:bg-rose-100 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest active:scale-95"
                        >
                          <i className="fas fa-face-smile"></i> Nuotaikos
                        </button>
                        {showEmotionsMenu && (
                          <div className="absolute right-0 top-12 z-[100] bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 w-52 animate-fade-in">
                            <div className="grid gap-1">
                              {emotionsList.map(emo => (
                                <button key={emo} onClick={() => { insertSuggestion(field.key as any, emo); setShowEmotionsMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-bold transition-all flex items-center justify-between group">
                                  {emo} <i className="fas fa-plus opacity-0 group-hover:opacity-100 text-[10px]"></i>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button 
                      onClick={() => isThisRecording ? stopRecording() : startRecording(field.key)} 
                      className={`h-10 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest active:scale-95 ${isThisRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                      title={isThisRecording ? "Sustabdyti" : "Įrašyti balsu"}
                    >
                      <i className={`fas ${isThisRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                      <span>{isThisRecording ? 'Sustabdyti' : 'Įrašyti balsu'}</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea 
                    value={val} 
                    onChange={(e) => setReflection({ ...reflection, [field.key]: e.target.value })} 
                    onFocus={() => handleFieldFocus(field.key)}
                    placeholder={field.placeholder} 
                    className={`w-full h-32 p-6 rounded-3xl border-2 transition-all outline-none resize-none font-medium text-gray-700 leading-relaxed placeholder:italic placeholder:text-gray-300 ${
                      showError ? 'border-rose-100 bg-rose-50/20 focus:border-rose-300' : 'border-gray-50 bg-gray-50/30 focus:bg-white focus:border-indigo-500/50'
                    } ${isFocused ? 'ring-4 ring-indigo-500/5' : ''}`}
                  ></textarea>
                  {isTranscribing && recordingField === field.key && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-3xl flex items-center justify-center font-black text-indigo-600 text-[10px] tracking-[0.3em] uppercase">
                      Perrašoma...
                    </div>
                  )}
                </div>

                {/* AI Suggestions Section */}
                {isFocused && field.suggestionsKey && (
                  <div className="space-y-4 animate-fade-in">
                    {aiSuggestions[field.suggestionsKey]?.length > 0 ? (
                      <div className="bg-indigo-50/40 p-6 rounded-[2rem] border border-indigo-100/30 space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                          <i className="fas fa-magic"></i> Mentoriaus įžvalgos pagal mokinius
                        </div>
                        <div className="grid gap-2">
                          {aiSuggestions[field.suggestionsKey].map((s: string, idx: number) => (
                            <button key={idx} onClick={() => insertSuggestion(field.key as any, s)} className="text-left text-[11px] bg-white p-3.5 rounded-xl border border-indigo-100/30 hover:border-indigo-400 hover:shadow-md transition-all text-gray-600 leading-relaxed group active:scale-[0.98]">
                              <i className="fas fa-plus mr-2 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity"></i> {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : isLoadingSuggestions ? (
                      <div className="h-20 bg-gray-50/50 rounded-[2rem] border border-gray-100 animate-pulse flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Ruošiame pagalbą...</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between mt-16 pt-8 border-t border-gray-50">
          <button onClick={handleBackWithConfirm} className="px-8 py-4 text-gray-400 font-black hover:text-indigo-600 transition-all flex items-center gap-2 active:scale-95">
            <i className="fas fa-chevron-left"></i> Atgal
          </button>
          
          <button 
            onClick={next} 
            disabled={!isStepValid}
            className={`font-black px-12 py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-3 ${
              isStepValid ? 'bg-indigo-600 text-white hover:shadow-indigo-100' : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
            }`}
          >
            {currentStep === steps.length - 1 ? 'Baigti ir generuoti ataskaitą' : 'Toliau'} <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReflectionWizard;
