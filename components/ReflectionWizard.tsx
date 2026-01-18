
import React, { useState, useEffect, useRef } from 'react';
import { ReflectionData } from '../types';
import { transcribeAudio, getReflectionSuggestions } from '../services/geminiService';

interface ReflectionWizardProps {
  reflection: ReflectionData;
  setReflection: React.Dispatch<React.SetStateAction<ReflectionData>>;
  aiInsights: any;
  onComplete: () => void;
  onBack: () => void;
  onSaveAndExit: () => void;
}

const WIZARD_STEP_KEY = 'teacher_reflection_wizard_step_v1';

const ReflectionWizard: React.FC<ReflectionWizardProps> = ({ 
  reflection, 
  setReflection, 
  aiInsights,
  onComplete,
  onBack,
  onSaveAndExit
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(new Set());
  const [focusedFieldKey, setFocusedFieldKey] = useState<string | null>(null);
  const [expandedSuggestionsField, setExpandedSuggestionsField] = useState<string | null>(null);
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Menus / Options
  const [showEmotionsMenu, setShowEmotionsMenu] = useState(false);
  const [showObservationsMenu, setShowObservationsMenu] = useState(false);
  const emotionsList = ['Džiaugsmas', 'Liūdesys', 'Skausmas', 'Apmąstymai', 'Nuobodulys', 'Įkvėpimas', 'Nerimas', 'Pasididžiavimas', 'Nuovargis'];
  const observationsList = ['Klasės dinamika', 'Aktyvumas pamokoje', 'Motyvacija', 'Dalyko supratimas', 'Socialiniai įgūdžiai'];

  const [aiSuggestions, setAiSuggestions] = useState<any>({
    observationSuggestions: [],
    analysisSuggestions: [],
    bestPracticeSuggestions: [],
    emotionSuggestions: [],
    actionSuggestions: [],
    nextStepSuggestions: []
  });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Restore wizard step on mount
  useEffect(() => {
    const savedStep = localStorage.getItem(WIZARD_STEP_KEY);
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10));
    }
  }, []);

  // Persist wizard step whenever it changes
  useEffect(() => {
    localStorage.setItem(WIZARD_STEP_KEY, currentStep.toString());
  }, [currentStep]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // Visual auto-save feedback
  useEffect(() => {
    setIsAutoSaving(true);
    const timeout = setTimeout(() => {
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
        e.returnValue = 'Ar tikrai norite išeiti? Jūsų progresas yra išsaugotas.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [reflection]);

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

  // AI Suggestions Trigger - triggers automatically on step change or focus
  useEffect(() => {
    const currentFields = steps[currentStep].fields;
    const focusedField = currentFields.find(f => f.key === focusedFieldKey);
    const shouldGenerate = aiInsights && (currentStep >= 1 || focusedField?.suggestionsKey);

    if (shouldGenerate) {
      const timer = setTimeout(() => {
        generateAIPrompts();
      }, 800); 
      return () => clearTimeout(timer);
    }
  }, [
    currentStep, 
    focusedFieldKey, 
    reflection.observations, 
    reflection.strengths, 
    reflection.improvements, 
    reflection.surprises,
    aiInsights
  ]);

  const generateAIPrompts = async () => {
    if (isLoadingSuggestions) return;
    setIsLoadingSuggestions(true);
    try {
      const suggestions = await getReflectionSuggestions(
        reflection.observations,
        reflection.strengths,
        reflection.improvements,
        reflection.surprises,
        aiInsights
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

  const toggleSuggestions = (fieldKey: string) => {
    setExpandedSuggestionsField(prev => prev === fieldKey ? null : fieldKey);
  };

  const startRecording = async (field: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => { 
        if (event.data.size > 0) audioChunksRef.current.push(event.data); 
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setIsTranscribing(true);
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];
            const transcription = await transcribeAudio(base64Audio, audioBlob.type);
            if (transcription && transcription.trim()) {
              setReflection(prevRef => ({ 
                ...prevRef, 
                [field]: prevRef[field as keyof ReflectionData] 
                  ? `${prevRef[field as keyof ReflectionData].trim()}\n${transcription.trim()}` 
                  : transcription.trim() 
              }));
            }
          } catch (err) {
            console.error("Transcription failed", err);
            alert("Nepavyko perrašyti garso. Bandykite dar kartą.");
          } finally {
            setIsTranscribing(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingField(field);
    } catch (err) { 
      alert("Nepavyko pasiekti mikrofono."); 
    }
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
        setExpandedSuggestionsField(null);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleWizardComplete = () => {
    localStorage.removeItem(WIZARD_STEP_KEY);
    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-12 relative">
      {/* Exit Confirmation */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center">
            <h3 className="text-2xl font-black mb-4 tracking-tight text-rose-600">Išeiti iš refleksijos?</h3>
            <p className="text-gray-500 mb-8 font-medium">Jūsų progresas yra automatiškai išsaugotas.</p>
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
                onClick={handleWizardComplete} 
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

        <div className="space-y-10">
          {steps[currentStep].fields.map((field) => {
            const val = (reflection as any)[field.key];
            const isEmpty = !val || val.trim().length === 0;
            const showError = isEmpty && touchedSteps.has(currentStep);
            const isFocused = focusedFieldKey === field.key;
            const isThisRecording = isRecording && recordingField === field.key;
            const isSuggestionsExpanded = expandedSuggestionsField === field.key;
            const fieldSuggestions = aiSuggestions[field.suggestionsKey || ''];

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
                    
                    {field.key === 'observations' && (
                      <div className="relative">
                        <button 
                          onClick={() => setShowObservationsMenu(!showObservationsMenu)} 
                          className="h-10 px-4 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest active:scale-95"
                        >
                          <i className="fas fa-list-check"></i> Komentuoti
                        </button>
                        {showObservationsMenu && (
                          <div className="absolute right-0 top-12 z-[100] bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 w-52 animate-fade-in">
                            <div className="grid gap-1">
                              {observationsList.map(obs => (
                                <button key={obs} onClick={() => { insertSuggestion('observations', obs); setShowObservationsMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-bold transition-all flex items-center justify-between group">
                                  {obs} <i className="fas fa-plus opacity-0 group-hover:opacity-100 text-[10px]"></i>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button 
                      onClick={() => isThisRecording ? stopRecording() : startRecording(field.key)} 
                      disabled={isTranscribing}
                      className={`h-10 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm font-black text-[10px] uppercase tracking-widest active:scale-95 ${
                        isThisRecording 
                          ? 'bg-rose-500 text-white shadow-rose-200' 
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={isThisRecording ? "Sustabdyti" : "Įrašyti balsu"}
                    >
                      <i className={`fas ${isThisRecording ? 'fa-stop' : 'fa-microphone'} ${isThisRecording ? 'animate-pulse' : ''}`}></i>
                      <span>{isThisRecording ? `Sustabdyti (${formatTime(recordingTime)})` : 'Įrašyti balsu'}</span>
                    </button>
                  </div>
                </div>

                {/* Concised AI Suggestions Bar - Always visible above textarea if focused */}
                {isFocused && field.suggestionsKey && (
                  <div className="animate-fade-in">
                    <button 
                      onClick={() => toggleSuggestions(field.key)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        isSuggestionsExpanded 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-indigo-50/50 border-indigo-50 text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`fas ${isLoadingSuggestions ? 'fa-circle-notch fa-spin' : 'fa-magic'} text-sm`}></i>
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {isLoadingSuggestions 
                            ? 'Generuojami pasiūlymai...' 
                            : isSuggestionsExpanded ? 'Slėpti mentoriaus įžvalgas' : `DI Mentoriaus įžvalgos (${fieldSuggestions?.length || 0})`
                          }
                        </span>
                      </div>
                      <i className={`fas fa-chevron-${isSuggestionsExpanded ? 'up' : 'down'} text-xs opacity-60`}></i>
                    </button>

                    {/* Expandable Suggestions Body */}
                    {isSuggestionsExpanded && (
                      <div className="mt-3 p-6 bg-white border-2 border-indigo-100/50 rounded-[2rem] shadow-xl animate-scale-in space-y-6">
                        <div className="flex flex-wrap gap-2">
                          {aiInsights?.themes?.map((theme: any, tIdx: number) => (
                            <span key={tIdx} className="text-[8px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                              {theme.label}
                            </span>
                          ))}
                        </div>

                        {fieldSuggestions?.length > 0 ? (
                          <div className="grid gap-3">
                            {fieldSuggestions.map((s: string, idx: number) => (
                              <button 
                                key={idx} 
                                onClick={() => { insertSuggestion(field.key as any, s); setExpandedSuggestionsField(null); }} 
                                className="text-left text-[11px] bg-slate-50 p-4 rounded-xl border border-transparent hover:border-indigo-400 hover:bg-white transition-all text-gray-700 leading-relaxed group active:scale-[0.98] flex items-start gap-3"
                              >
                                <i className="fas fa-plus mt-0.5 opacity-0 group-hover:opacity-100 text-indigo-600 transition-opacity"></i>
                                <span>{s}</span>
                              </button>
                            ))}
                          </div>
                        ) : !isLoadingSuggestions && (
                          <p className="text-center text-[10px] text-gray-400 italic py-4">Pasiūlymų kol kas nėra. Užpildykite ankstesnius žingsnius, kad DI suprastų jūsų kontekstą.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="relative">
                  <textarea 
                    value={val} 
                    onChange={(e) => setReflection({ ...reflection, [field.key]: e.target.value })} 
                    onFocus={() => handleFieldFocus(field.key)}
                    placeholder={field.placeholder} 
                    className={`w-full h-32 p-6 rounded-3xl border-2 transition-all outline-none resize-none font-medium text-gray-700 leading-relaxed placeholder:italic placeholder:text-gray-300 ${
                      showError ? 'border-rose-100 bg-rose-50/20 focus:border-rose-300' : 'border-gray-100 bg-gray-50/30 focus:bg-white focus:border-indigo-500/50'
                    } ${isFocused ? 'ring-4 ring-indigo-500/5' : ''}`}
                  ></textarea>
                  {isTranscribing && recordingField === field.key && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-3 animate-fade-in">
                      <div className="w-6 h-6 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <span className="font-black text-indigo-600 text-[9px] tracking-[0.3em] uppercase">Perrašoma...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between items-center mt-16 pt-8 border-t border-gray-50">
          <div className="flex gap-4">
            <button onClick={handleBackWithConfirm} className="px-6 py-4 text-gray-400 font-black hover:text-indigo-600 transition-all flex items-center gap-2 active:scale-95">
              <i className="fas fa-chevron-left"></i> Atgal
            </button>
            <button onClick={onSaveAndExit} className="px-6 py-4 text-indigo-400 font-black hover:text-indigo-600 transition-all flex items-center gap-2 active:scale-95 text-xs uppercase tracking-widest">
              <i className="fas fa-save"></i> Išsaugoti ir išeiti
            </button>
          </div>
          
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
