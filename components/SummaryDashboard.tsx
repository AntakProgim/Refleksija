
import React from 'react';
import { QuestionSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface SummaryDashboardProps {
  summaries: QuestionSummary[];
  feedback: string[];
  aiInsights: any;
  isAnalyzing: boolean;
  onNext: () => void;
  onFinish: () => void;
}

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const text = payload.value;
  const maxLength = 22;
  const displayValue = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-12} y={0} dy={4} textAnchor="end" fill="#64748b" fontSize={9} fontWeight={700} className="font-sans uppercase tracking-tight">
        <title>{text}</title>
        {displayValue}
      </text>
    </g>
  );
};

const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ 
  summaries, 
  feedback, 
  aiInsights, 
  isAnalyzing,
  onNext,
  onFinish
}) => {
  const categories = [
    { name: 'Įsitraukimas', icon: 'fa-bolt-lightning' },
    { name: 'Mokymas', icon: 'fa-chalkboard-user' },
    { name: 'Klimatas', icon: 'fa-sun' },
    { name: 'Grįžtamasis ryšys', icon: 'fa-comments' },
    { name: 'Kita', icon: 'fa-ellipsis' }
  ];
  
  const getBarColor = (avg: number, isReverse?: boolean) => {
    if (isReverse) return avg > 3.5 ? '#f43f5e' : '#10b981';
    if (avg >= 4.5) return '#059669';
    if (avg >= 4.0) return '#10b981';
    if (avg >= 3.0) return '#6366f1';
    return '#f59e0b';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 80) return { label: 'Itin pozityvus', color: 'text-emerald-500', icon: 'fa-laugh-beam' };
    if (score > 60) return { label: 'Pozityvus', color: 'text-green-500', icon: 'fa-smile' };
    if (score > 40) return { label: 'Neutralus', color: 'text-amber-500', icon: 'fa-meh' };
    return { label: 'Reikalaujantis dėmesio', color: 'text-rose-500', icon: 'fa-frown' };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-slide-up pb-20">
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
              <i className="fas fa-chart-pie text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Analizės apžvalga</h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">
                {summaries[0]?.total || 0} mokinių atsakymai
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
             <button onClick={onFinish} className="flex-1 md:flex-none px-6 py-4 rounded-2xl border-2 border-indigo-50 text-indigo-600 font-black text-xs uppercase tracking-widest transition-all hover:bg-indigo-50">
               Baigti čia
             </button>
             <button 
              onClick={onNext}
              className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
            >
              Tęsti refleksiją <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
          {isAnalyzing ? (
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-full mb-2"></div>
              <div className="h-2 w-12 bg-gray-100 rounded"></div>
            </div>
          ) : (
            <>
              <div className={`text-2xl mb-1 ${getSentimentLabel(aiInsights?.sentimentScore || 50).color}`}>
                <i className={`fas ${getSentimentLabel(aiInsights?.sentimentScore || 50).icon}`}></i>
              </div>
              <h4 className="font-black text-gray-900 text-[11px] leading-tight">{getSentimentLabel(aiInsights?.sentimentScore || 50).label}</h4>
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-1">{aiInsights?.sentimentScore || 50}% Balas</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full"></div>
        <h3 className="text-xl font-black flex items-center gap-4 mb-8 relative z-10 uppercase tracking-widest text-[11px]">
          <i className="fas fa-wand-magic-sparkles text-indigo-400"></i> Dirbtinio intelekto įžvalgos
        </h3>
        
        {isAnalyzing ? (
          <div className="flex items-center gap-6 py-4 relative z-10">
            <div className="w-8 h-8 border-4 border-white/20 border-t-indigo-400 rounded-full animate-spin"></div>
            <p className="font-bold text-indigo-100">Analizuojama...</p>
          </div>
        ) : aiInsights && (
          <div className="space-y-12 relative z-10">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-emerald-400 flex items-center gap-2">
                  <i className="fas fa-check-circle"></i> Stipriosios vietos
                </h4>
                <p className="text-sm leading-relaxed text-indigo-50/90 font-medium">{aiInsights.strengths}</p>
              </div>
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-rose-400 flex items-center gap-2">
                  <i className="fas fa-arrow-trend-up"></i> Kur pasitempti?
                </h4>
                <p className="text-sm leading-relaxed text-indigo-50/90 font-medium">{aiInsights.improvements}</p>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] uppercase font-black tracking-widest text-indigo-300 mb-6 flex items-center gap-2">
                <i className="fas fa-layer-group"></i> Tendencijos
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                {aiInsights.themes?.map((theme: any, idx: number) => (
                  <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <h5 className="font-black text-[11px] text-white leading-tight mb-2">{theme.label}</h5>
                    <p className="text-[10px] text-indigo-100/60 leading-normal">{theme.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 px-2">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Statistika</h3>
          <div className="h-px flex-1 bg-gray-200/60"></div>
        </div>

        <div className="grid gap-10">
          {categories.map(cat => {
            const catData = summaries
              .filter(s => s.category === cat.name)
              .map(s => ({
                name: s.question,
                avg: parseFloat(s.averageScore.toFixed(2)),
                full: 5,
                isReverse: s.isReverse
              }))
              .sort((a, b) => b.avg - a.avg);

            if (catData.length === 0) return null;
            const chartHeight = Math.max(140, catData.length * 48);

            return (
              <div key={cat.name} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-sm font-black text-gray-800 flex items-center gap-3 mb-8">
                  <i className={`fas ${cat.icon} text-indigo-500 text-xs`}></i> {cat.name}
                </h3>
                <div style={{ height: `${chartHeight}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catData} layout="vertical" margin={{ left: 0, right: 40 }}>
                      <XAxis type="number" domain={[0, 5]} hide />
                      <YAxis dataKey="name" type="category" width={140} tick={<CustomYAxisTick />} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="full" fill="#f1f5f9" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} />
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={14}>
                        {catData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.avg, entry.isReverse)} />
                        ))}
                        <LabelList dataKey="avg" position="right" offset={12} style={{ fill: '#475569', fontSize: '10px', fontWeight: '900' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center pt-8 gap-4">
        <button 
          onClick={onFinish}
          className="bg-white border-2 border-indigo-100 text-indigo-600 px-12 py-6 rounded-[2rem] font-black transition-all shadow-xl active:scale-95"
        >
          Baigti ir išsaugoti tik analizę
        </button>
        <button 
          onClick={onNext}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-16 py-6 rounded-[2rem] font-black transition-all shadow-2xl shadow-indigo-200 active:scale-95 flex items-center gap-4 text-lg"
        >
          Tęsti refleksiją <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};

export default SummaryDashboard;
