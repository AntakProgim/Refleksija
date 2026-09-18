import React, { useState, useEffect, useRef } from 'react';
import { ReflectionData, QuestionSummary } from '../types';
import { transcribeAudio, getReflectionSuggestions, getDraftFieldSuggestion } from '../services/geminiService';

interface ReflectionWizardProps {
  reflection: ReflectionData;
  setReflection: React.Dispatch<React.SetStateAction<ReflectionData>>;
  aiInsights: any;
  summaries?: QuestionSummary[];
  openFeedback?: string[];
  onComplete: () => void;
  onBack: () => void;
  onSaveAndExit: () => void;
}

const WIZARD_STEP_KEY = 'teacher_reflection_wizard_step_v1';

const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  observationSuggestions: [
    "Mokiniai itin pozityviai vertina aiškų temos aiškinimą ir pagarbų bendravimą.",
    "Pastebimas poreikis lankstesniam atsiskaitymų terminui ir išankstiniams vertinimo kriterijams.",
    "Dauguma mokinių jaučiasi saugiai, tačiau norėtų aktyvesnio įsitraukimo praktinėse veiklose.",
    "Grįžtamasis ryšys rodo, kad mokiniams patinka darbas porose ir grupėse."
  ],
  analysisSuggestions: [
    "Stiprybė: aiški pamokos struktūra ir pagarbus, palaikantis mikroklimatas.",
    "Tobulintina sritis: atsiskaitymo reikalavimų ir vertinimo kriterijų išankstinis aptarimas.",
    "Netikėtumas: mokiniai labiau vertina individualų mokytojo padrąsinimą nei formalius pažymius.",
    "Galimybė: įtraukti daugiau praktinių, gyvenimiškų pavyzdžių į temos aiškinimą."
  ],
  bestPracticeSuggestions: [
    "Trumpas formatyvus grįžtamasis ryšys (pvz., '2 žvaigždutės ir 1 noras') iš karto po atliktos užduoties.",
    "Sėkmės kriterijų (rubrikų) vizualizavimas lentoje prieš pradedant savarankišką darbą.",
    "Diferencijuotos užduotys pagal mokinių pasirengimo lygį.",
    "Mini refleksijos 'exit ticket' (išėjimo bilietai) pamokos pabaigoje."
  ],
  emotionSuggestions: [
    "Jaučiu profesinį džiaugsmą ir prasmę matydamas aukštą mokinių pasitikėjimą.",
    "Kyla natūralus nerimas dėl atsiskaitymų krūvio, kurį įvardijo dalis mokinių.",
    "Jaučiu įkvėpimą atnaujinti mokymo metodus ir suteikti daugiau autonomijos mokiniams."
  ],
  actionSuggestions: [
    "Nustosiu skubėti tikrinant visų užduočių atlikimą – skirsiu 5 minutes pamokos apibendrinimui.",
    "Pradėsiu taikyti aiškius vertinimo kriterijus prieš kiekvieną atsiskaitymą.",
    "Tęsiu nuolatinį padrąsinimą ir atvirą dialogą su mokiniais.",
    "Pradėsiu diferencijuoti namų darbų apimtis."
  ],
  nextStepSuggestions: [
    "Atlikti trumpą tarpinę 3 klausimų apklausą po pirmojo mėnesio.",
    "Stebėti, ar sumažėjo mokinių nerimas dėl atsiskaitymų.",
    "Aptarti pamokų taisykles kartu su klase kitos savaitės pradžioje."
  ]
};

const ReflectionWizard: React.FC<ReflectionWizardProps> = ({ 
  reflection, 
  setReflection, 
  aiInsights,
  summaries = [],
  openFeedback = [],
  onComplete,
  onBack,
  onSaveAndExit
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [expandedSuggestionsField, setExpandedSuggestionsField] = useState<string | null>(null);
  
  // AI Drafting States
  const [draftingField, setDraftingField] = useState<string | null>(null);
  const [isDraftingStep, setIsDraftingStep] = useState(false);

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
  const emotionsList = ['Džiaugsmas', 'Liūdesys', 'Apmąstymai', 'Įkvėpimas', 'Nerimas', 'Pasididžiavimas', 'Nuovargis'];
  const observationsList = ['Klasės dinamika', 'Aktyvumas pamokoje', 'Motyvacija', 'Dalyko supratimas', 'Socialiniai įgūdžiai'];

  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string[]>>(DEFAULT_SUGGESTIONS);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Restore wizard step on mount
  useEffect(() => {
    const savedStep = localStorage.getItem(WIZARD_STEP_KEY);
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10));
    }
  }, []);

  // Persist wizard step
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

  // Visual auto-save
  useEffect(() => {
    setIsAutoSaving(true);
    const timeout = setTimeout(() => {
      setLastSaved(new Date());
      setIsAutoSaving(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [reflection, currentStep]);

  // Fetch AI Suggestions on step change or when aiInsights ready
  useEffect(() => {
    let isMounted = true;
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const fetched = await getReflectionSuggestions(
          reflection.observations,
          reflection.strengths,
          reflection.improvements,
          reflection.surprises,
          aiInsights,
          summaries,
          openFeedback
        );
        if (isMounted && fetched) {
          setAiSuggestions(prev => ({
            ...prev,
            ...fetched
          }));
        }
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      } finally {
        if (isMounted) setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
    return () => { isMounted = false; };
  }, [currentStep, aiInsights]);

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
        { key: 'bestPractices', label: "Gerosios praktikos", placeholder: "Pvz.: Mokiniai itin vertina grįžtamąjį ryšį...", icon: "fa-thumbs-up", suggestionsKey: 'bestPracticeSuggestions' }
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

  const handleFieldDraft = async (fieldKey: string, fieldLabel: string) => {
    setDraftingField(fieldKey);
    try {
      const currentVal = (reflection as any)[fieldKey] || '';
      const drafted = await getDraftFieldSuggestion(
        fieldKey,
        fieldLabel,
        currentVal,
        summaries,
        openFeedback,
        aiInsights
      );
      if (drafted && drafted.trim()) {
        setReflection(prev => {
          const existing = prev[fieldKey as keyof ReflectionData] || '';
          const updated = existing.trim().length > 0
            ? `${existing.trim()}\n\n${drafted.trim()}`
            : drafted.trim();
          return { ...prev, [fieldKey]: updated };
        });
      }
    } catch (e) {
      console.error('Draft error:', e);
    } finally {
      setDraftingField(null);
    }
  };

  const handleDraftAllFieldsInStep = async () => {
    setIsDraftingStep(true);
    const fields = steps[currentStep].fields;
    try {
      const draftPromises = fields.map(async (f) => {
        const currentVal = ((reflection as any)[f.key] as string) || '';
        const drafted = await getDraftFieldSuggestion(
          f.key,
          f.label,
          currentVal,
          summaries,
          openFeedback,
          aiInsights
        );
        return { key: f.key, drafted, currentVal };
      });

      const results = await Promise.all(draftPromises);

      setReflection(prev => {
        const next = { ...prev };
        for (const r of results) {
          if (r.drafted && r.drafted.trim().length > 0) {
            const existing = (prev as any)[r.key] || '';
            if (!existing || !existing.trim()) {
              (next as any)[r.key] = r.drafted.trim();
            } else if (!existing.includes(r.drafted.trim())) {
              (next as any)[r.key] = `${existing.trim()}\n\n${r.drafted.trim()}`;
            }
          }
        }
        return next;
      });
    } catch (e) {
      console.error("Step draft error:", e);
    } finally {
      setIsDraftingStep(false);
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob);
          if (text) {
            setReflection(prev => {
              const cur = prev[field as keyof ReflectionData] || '';
              return { ...prev, [field]: cur ? `${cur} ${text}` : text };
            });
          }
        } catch (err) {
          console.error("Transcribe failed:", err);
        } finally {
          setIsTranscribing(false);
        }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const next = () => {
    if (currentStep < steps.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setAnimating(false);
      }, 200);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(p => p - 1);
        setAnimating(false);
      }, 200);
    } else {
      onBack();
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-slide-up">
      {/* Exit Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-black text-gray-900 mb-2">Grįžti į suvestinę?</h3>
            <p className="text-gray-500 text-xs mb-6">Jūsų įrašyti refleksijos duomenys yra išsaugoti naršyklėje.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-black text-xs uppercase tracking-wider">Tęsti</button>
              <button onClick={onBack} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider">Išeiti</button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-save Status & Step counter */}
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isAutoSaving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
            {isAutoSaving ? 'Išsaugoma...' : `Auto-išsaugota: ${lastSaved ? lastSaved.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' }) : 'Ką tik'}`}
          </span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
          Žingsnis {currentStep + 1} iš {steps.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex justify-between mb-12 relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200/60 -translate-y-1/2 -z-10 rounded-full"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 -z-10 rounded-full transition-all duration-300" 
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        ></div>
        {steps.map((_, idx) => (
          <button 
            key={idx} 
            onClick={() => setCurrentStep(idx)} 
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
              idx === currentStep 
                ? 'bg-indigo-600 text-white shadow-lg scale-110' 
                : idx < currentStep 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-white text-gray-400 border border-gray-200'
            }`}
          >
            {idx < currentStep ? <i className="fas fa-check text-[10px]"></i> : idx + 1}
          </button>
        ))}
      </div>

      {/* Wizard Content Card */}
      <div className={`bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl border border-gray-100 transition-all duration-200 ${animating ? 'opacity-0 translate-y-3' : 'opacity-100'}`}>
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider mb-2">
              <i className="fas fa-pencil"></i> Profesinė savirefleksija
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{steps[currentStep].title}</h2>
            <p className="text-gray-500 text-sm mt-1">{steps[currentStep].description}</p>
          </div>

          {/* Quick AI Fill Step Button */}
          <button
            onClick={handleDraftAllFieldsInStep}
            disabled={isDraftingStep}
            className="self-start md:self-center px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center gap-2 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
            title="DI suformuluos pradinius atsakymus tuštiems šio žingsnio laukeliams pagal mokinių apklausos duomenis"
          >
            <i className={`fas ${isDraftingStep ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-indigo-600`}></i>
            <span>{isDraftingStep ? 'Formuluojami atsakymai...' : 'Užpildyti šį žingsnį su DI'}</span>
          </button>
        </header>

        <div className="space-y-8">
          {steps[currentStep].fields.map((field) => {
            const val = (reflection as any)[field.key] || '';
            const isThisRecording = isRecording && recordingField === field.key;
            const isSuggestionsExpanded = expandedSuggestionsField === field.key;
            const isThisDrafting = draftingField === field.key;
            const fieldSuggestions = aiSuggestions[field.suggestionsKey || ''] || DEFAULT_SUGGESTIONS[field.suggestionsKey || ''] || [];

            return (
              <div key={field.key} className="space-y-3 bg-slate-50/40 p-5 rounded-2xl border border-gray-100/80">
                {/* Field Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-black text-gray-800 text-sm flex items-center gap-2">
                    <i className={`fas ${field.icon} text-indigo-600`}></i> 
                    {field.label}
                  </label>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Emotion Helper */}
                    {field.hasEmotions && (
                      <div className="relative">
                        <button 
                          onClick={() => setShowEmotionsMenu(!showEmotionsMenu)} 
                          className="px-3 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider hover:bg-rose-100 transition-all active:scale-95"
                        >
                          <i className="fas fa-face-smile"></i> Nuotaikos
                        </button>
                        {showEmotionsMenu && (
                          <div className="absolute right-0 top-10 z-[100] bg-white border border-gray-100 shadow-xl rounded-xl p-2 w-48 animate-fade-in">
                            {emotionsList.map(emo => (
                              <button 
                                key={emo} 
                                onClick={() => { insertSuggestion(field.key as any, emo); setShowEmotionsMenu(false); }} 
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-bold transition-all flex items-center justify-between"
                              >
                                {emo} <i className="fas fa-plus text-[9px] text-gray-400"></i>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Observation Helper */}
                    {field.key === 'observations' && (
                      <div className="relative">
                        <button 
                          onClick={() => setShowObservationsMenu(!showObservationsMenu)} 
                          className="px-3 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95"
                        >
                          <i className="fas fa-list-check"></i> Temos
                        </button>
                        {showObservationsMenu && (
                          <div className="absolute right-0 top-10 z-[100] bg-white border border-gray-100 shadow-xl rounded-xl p-2 w-48 animate-fade-in">
                            {observationsList.map(obs => (
                              <button 
                                key={obs} 
                                onClick={() => { insertSuggestion('observations', obs); setShowObservationsMenu(false); }} 
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-bold transition-all flex items-center justify-between"
                              >
                                {obs} <i className="fas fa-plus text-[9px] text-gray-400"></i>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Suggestions Toggle Button */}
                    <button
                      onClick={() => setExpandedSuggestionsField(prev => prev === field.key ? null : field.key)}
                      className={`px-3 h-8 rounded-lg flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider transition-all border ${
                        isSuggestionsExpanded
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-indigo-50/80 text-indigo-700 border-indigo-100 hover:bg-indigo-100'
                      }`}
                      title="Peržiūrėti DI mentoriaus pasiūlymus šiam laukeliui"
                    >
                      <i className={`fas ${isLoadingSuggestions ? 'fa-circle-notch fa-spin' : 'fa-lightbulb'}`}></i>
                      <span>DI idėjos ({fieldSuggestions.length})</span>
                    </button>

                    {/* Direct AI Draft Button */}
                    <button
                      onClick={() => handleFieldDraft(field.key, field.label)}
                      disabled={isThisDrafting}
                      className="px-3 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                      title="DI automatiškai suformuluos atsakymą pagal mokinių duomenis"
                    >
                      <i className={`fas ${isThisDrafting ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'} text-emerald-600`}></i>
                      <span>{isThisDrafting ? 'Formuluoja...' : 'DI suformuluoti'}</span>
                    </button>

                    {/* Voice Recording */}
                    <button 
                      onClick={() => isThisRecording ? stopRecording() : startRecording(field.key)} 
                      disabled={isTranscribing}
                      className={`px-3 h-8 rounded-lg flex items-center gap-1.5 transition-all font-bold text-[10px] uppercase tracking-wider active:scale-95 border ${
                        isThisRecording 
                          ? 'bg-rose-500 text-white border-rose-500 shadow-rose-200' 
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                      title={isThisRecording ? "Sustabdyti" : "Įrašyti balsu"}
                    >
                      <i className={`fas ${isThisRecording ? 'fa-stop' : 'fa-microphone'} ${isThisRecording ? 'animate-pulse text-white' : 'text-indigo-600'}`}></i>
                      <span>{isThisRecording ? formatTime(recordingTime) : 'Balsu'}</span>
                    </button>
                  </div>
                </div>

                {/* Suggestions Pills Drawer */}
                {isSuggestionsExpanded && (
                  <div className="p-4 bg-white border border-indigo-100 rounded-2xl shadow-xs space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 border-b border-gray-100 pb-2">
                      <span className="flex items-center gap-1.5">
                        <i className="fas fa-wand-magic-sparkles text-indigo-500"></i> Spustelėkite idėją, kad įterptumėte į laukelį:
                      </span>
                      <button 
                        onClick={() => setExpandedSuggestionsField(null)}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                      >
                        <i className="fas fa-xmark"></i>
                      </button>
                    </div>

                    <div className="grid gap-2">
                      {fieldSuggestions.map((s: string, idx: number) => (
                        <button 
                          key={idx} 
                          onClick={() => insertSuggestion(field.key as any, s)} 
                          className="text-left text-xs bg-slate-50 hover:bg-indigo-50/70 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 transition-all text-gray-700 leading-relaxed group flex items-start gap-2.5 active:scale-[0.99]"
                        >
                          <i className="fas fa-plus mt-0.5 text-indigo-500 text-[10px] shrink-0"></i>
                          <span>{s}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Textarea */}
                <div className="relative">
                  <textarea 
                    value={val} 
                    onChange={(e) => setReflection({ ...reflection, [field.key]: e.target.value })} 
                    placeholder={field.placeholder} 
                    className="w-full h-32 p-4 md:p-5 rounded-2xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none font-medium text-gray-800 text-sm leading-relaxed placeholder:italic placeholder:text-gray-400 transition-all"
                  ></textarea>

                  {isTranscribing && recordingField === field.key && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2 animate-fade-in">
                      <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      <span className="font-bold text-indigo-700 text-xs uppercase tracking-wider">Perrašoma kalba...</span>
                    </div>
                  )}

                  {isThisDrafting && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2 animate-fade-in">
                      <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                      <span className="font-bold text-emerald-700 text-xs uppercase tracking-wider">DI analizuoja duomenis ir formuluoja atsakymą...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-12 pt-6 border-t border-gray-100">
          <div className="flex gap-3">
            <button 
              onClick={prev} 
              className="px-5 py-3 text-gray-500 font-bold hover:text-gray-800 rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              <i className="fas fa-chevron-left"></i> {currentStep === 0 ? 'Grįžti į suvestinę' : 'Atgal'}
            </button>
            <button 
              onClick={onSaveAndExit} 
              className="px-5 py-3 text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              <i className="fas fa-bookmark"></i> Išsaugoti
            </button>
          </div>
          
          <button 
            onClick={next} 
            className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-md shadow-indigo-100 transition-all flex items-center gap-2 active:scale-95"
          >
            <span>{currentStep === steps.length - 1 ? 'Baigti ir peržiūrėti ataskaitą' : 'Kitas žingsnis'}</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReflectionWizard;
