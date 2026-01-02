
import React, { useState } from 'react';
import { SurveyRow } from '../types';

interface CSVUploadProps {
  onParsed: (data: SurveyRow[]) => void;
}

const CSVUpload: React.FC<CSVUploadProps> = ({ onParsed }) => {
  const [isDragging, setIsDragging] = useState(false);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detektuojame skyriklį (dažniausiai , arba ;)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ';' : ',';

    const parseLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows: SurveyRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length < headers.length) continue;
      
      const rowData: SurveyRow = {};
      headers.forEach((header, idx) => {
        if (header) rowData[header] = values[idx] || '';
      });
      rows.push(rowData);
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const data = parseCSV(text);
        onParsed(data);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  return (
    <div 
      className={`border-4 border-dashed rounded-[2.5rem] p-16 text-center transition-all duration-500 ${
        isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-gray-200 bg-white'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); }}
    >
      <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
        <i className="fas fa-file-csv text-4xl text-indigo-600"></i>
      </div>
      <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Įkelkite duomenis</h2>
      <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium">
        Tinka „Google Sheets“ eksportuotas CSV failas. Mes automatiškai sutvarkysime ilgas antraštes.
      </p>
      
      <label className="group relative inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 px-10 rounded-2xl cursor-pointer transition-all shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden">
        <span className="relative z-10">Pasirinkti CSV failą</span>
        <i className="fas fa-upload relative z-10 text-sm group-hover:-translate-y-1 transition-transform"></i>
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          onChange={handleFileChange} 
        />
      </label>
      
      <div className="mt-10 flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-300">
        <span className="flex items-center gap-2"><i className="fas fa-check text-indigo-400"></i> UTF-8 palaikymas</span>
        <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
        <span className="flex items-center gap-2"><i className="fas fa-check text-indigo-400"></i> Automatinis skyriklis</span>
      </div>
    </div>
  );
};

export default CSVUpload;
