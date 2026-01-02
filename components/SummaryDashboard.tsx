
import React from 'react';
import { QuestionSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface SummaryDashboardProps {
  summaries: QuestionSummary[];
  feedback: string[];
  aiInsights: any;
  isAnalyzing: boolean;
  onNext: () => void;
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
  onNext 
}) => {
  const categories = [
    { name: 'Įsitraukimas', icon: 'fa-bolt-lightning' },
    { name: 'Mokymas', icon: 'fa-chalkboard-user' },
    { name: 'Klimatas', icon: 'fa-sun' },
    { name: 'Grįžtamasis ryšys', icon: 'fa-comments' },
    { name: 'Kita', icon: 'fa-ellipsis' }
  ];
  
  const getBarColor = (avg: number, isReverse?: boolean) => {
    if (isReverse) {
      return avg > 3.5 ? '#f43f5e' : '#10b981';
    }
    if (avg >= 4.5) return '#059669';
    if (avg >= 4.0) return '#10b981';
    if (avg >= 3.0) return '#6366f1';
    return '#f59e0b';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 80) return { label: 'Itin pozityvus', color: 'text-emerald-500', icon: 'fa-laugh-beam' };
    if (score > 60) return { label: 'Pozityvus', color: 'text-green-500', icon: 'fa-smile' };
    if (score > 40) return { label: 'Neutralus / Mišrus', color: 'text-amber-500', icon: 'fa-meh' };
    return { label: 'Reikalaujantis dėmesio', color: 'text-rose-500', icon: 'fa-frown' };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-slide-up pb-20">
      {/* Header & Main Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
              <i className="fas fa-chart-pie text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Analizės apžvalga</h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">
                {summaries[0]?.total || 0} mokinių atsakymai
              </p>
            </div>
          </div>
          <button 
            onClick={onNext}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-3"
          >
            Pradėti refleksiją <i className="fas fa-arrow-right"></i>
          </button>
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

      {/* DI Deep Analysis Section */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full"></div>
        <h3 className="text-xl font-black flex items-center gap-4 mb-8 relative z-10 uppercase tracking-widest text-[11px]">
          <i className="fas fa-wand-magic-sparkles text-indigo-400"></i> Dirbtinio intelekto įžvalgos
        </h3>
        
        {isAnalyzing ? (
          <div className="flex items-center gap-6 py-4 relative z-10">
            <div className="w-8 h-8 border-4 border-white/20 border-t-indigo-400 rounded-full animate-spin"></div>
            <p className="font-bold text-indigo-100">Analizuojami mokinių komentarai...</p>
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
                <i className="fas fa-layer-group"></i> Išskirtos tendencijos
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                {aiInsights.themes?.map((theme: any, idx: number) => (
                  <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-black text-[11px] text-white leading-tight pr-2">{theme.label}</h5>
                      <span className={`text-[7px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 ${
                        theme.sentiment.includes('teig') ? 'bg-emerald-500/20 text-emerald-400' : 
                        theme.sentiment.includes('neig') ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {theme.sentiment}
                      </span>
                    </div>
                    <p className="text-[10px] text-indigo-100/60 leading-normal">{theme.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quantitative Charts - Narrow and Refined */}
      <div className="space-y-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 px-2">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Statistinė analizė</h3>
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
              <div key={cat.name} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 transition-all hover:shadow-xl hover:translate-y-[-2px]">
                <div className="flex items-center justify-between mb-8 border-b border-gray-50 pb-4">
                  <h3 className="text-sm font-black text-gray-800 flex items-center gap-3">
                    <i className={`fas ${cat.icon} text-indigo-500 text-xs`}></i>
                    {cat.name}
                  </h3>
                  <div className="flex gap-2 items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">0-5 Skalė</span>
                  </div>
                </div>
                
                <div style={{ height: `${chartHeight}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={catData} 
                      layout="vertical" 
                      margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                      barCategoryGap={20}
                    >
                      <XAxis type="number" domain={[0, 5]} hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={140}
                        tick={<CustomYAxisTick />} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        cursor={{fill: 'rgba(99, 102, 241, 0.04)'}}
                        content={({active, payload}) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-gray-900 text-white p-5 rounded-3xl shadow-2xl text-[11px] max-w-[340px] border border-white/10 animate-scale-in backdrop-blur-xl">
                                <div className="flex items-start gap-4 mb-4">
                                  <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                                    <i className="fas fa-question text-[10px]"></i>
                                  </div>
                                  <p className="font-bold leading-relaxed text-indigo-100">{data.name}</p>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                                  <span className="text-gray-400 font-black uppercase tracking-widest text-[8px]">Įvertinimas</span>
                                  <span className="text-white font-black text-base">{data.avg} / 5</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {/* Background Bar (Track) */}
                      <Bar dataKey="full" fill="#f1f5f9" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false} />
                      {/* Actual Value Bar */}
                      <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={14} animationDuration={1000}>
                        {catData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.avg, entry.isReverse)} />
                        ))}
                        <LabelList 
                          dataKey="avg" 
                          position="right" 
                          offset={12} 
                          style={{ fill: '#475569', fontSize: '10px', fontWeight: '900', fontFamily: 'monospace' }} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw Feedback Section */}
      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-base font-black text-gray-900 flex items-center gap-3">
            <i className="fas fa-quote-left text-indigo-300"></i> 
            Mokinių komentarai
          </h3>
          <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
            {feedback.length} Atsakymai
          </span>
        </div>
        
        <div className="space-y-4">
          {feedback.length > 0 ? feedback.slice(0, 15).map((f, i) => (
            <div key={i} className="group p-6 bg-slate-50 rounded-[2rem] border border-gray-100 text-[11px] italic text-gray-600 leading-relaxed border-l-4 border-l-transparent hover:border-l-indigo-400 hover:bg-white hover:shadow-md transition-all">
              "{f}"
            </div>
          )) : (
            <div className="py-12 text-center text-gray-400 text-xs italic">Komentarų nėra.</div>
          )}
          {feedback.length > 15 && (
            <div className="text-center py-6">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Daugiau atsakymų matysite pilnoje ataskaitoje</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={onNext}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-16 py-6 rounded-[2rem] font-black transition-all shadow-2xl shadow-indigo-200 active:scale-95 flex items-center gap-4 text-lg"
        >
          Pradėti refleksiją <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
};

export default SummaryDashboard;
