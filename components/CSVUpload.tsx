
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { SurveyRow } from '../types';

interface CSVUploadProps {
  onParsed: (data: SurveyRow[]) => void;
}

const CSVUpload: React.FC<CSVUploadProps> = ({ onParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parseCSV = (text: string): SurveyRow[] => {
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
      if (values.length < 2) continue;
      
      const rowData: SurveyRow = {};
      headers.forEach((header, idx) => {
        if (header) rowData[header] = values[idx] || '';
      });
      rows.push(rowData);
    }

    return rows;
  };

  const processFile = (file: File) => {
    setErrorMessage(null);
    setLoading(true);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            setErrorMessage("Excel faile nerasta lapų.");
            setLoading(false);
            return;
          }
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json<SurveyRow>(worksheet, { defval: '', raw: false });
          if (rawRows.length === 0) {
            setErrorMessage("Excel faile nerasta duomenų eilučių.");
            setLoading(false);
            return;
          }
          onParsed(rawRows);
        } catch (err: any) {
          console.error("Excel parse error:", err);
          setErrorMessage("Nepavyko nuskaityti Excel failo. Patikrinkite formatą arba pabandykite išsaugoti kaip CSV.");
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setErrorMessage("Failo nuskaitymo klaida.");
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const rows = parseCSV(text);
          if (rows.length === 0) {
            setErrorMessage("CSV faile nerasta tinkamų eilučių arba antraščių.");
            setLoading(false);
            return;
          }
          onParsed(rows);
        } catch (err: any) {
          console.error("CSV parse error:", err);
          setErrorMessage("Nepavyko nuskaityti CSV failo.");
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setErrorMessage("Failo nuskaitymo klaida.");
        setLoading(false);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div 
      className={`border-4 border-dashed rounded-[2.5rem] p-12 md:p-16 text-center transition-all duration-500 ${
        isDragging ? 'border-indigo-500 bg-indigo-50/70 scale-[1.02]' : 'border-gray-200 bg-white shadow-sm'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner text-indigo-600">
        <i className="fas fa-file-excel text-4xl"></i>
      </div>
      <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Įkelkite apklausos duomenis</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium text-sm leading-relaxed">
        Tinka <strong>Excel (.xlsx, .xls)</strong> arba <strong>CSV (.csv)</strong> failai, eksportuoti iš „Google Forms“, „Microsoft Forms“ ar „Google Sheets“.
      </p>

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-semibold flex items-center justify-center gap-2 max-w-md mx-auto">
          <i className="fas fa-exclamation-circle text-rose-500"></i>
          <span>{errorMessage}</span>
        </div>
      )}
      
      <label className={`group relative inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl cursor-pointer transition-all shadow-xl shadow-indigo-100 active:scale-95 overflow-hidden ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
        {loading ? (
          <>
            <i className="fas fa-circle-notch fa-spin text-sm"></i>
            <span className="relative z-10">Apdorojami duomenys...</span>
          </>
        ) : (
          <>
            <span className="relative z-10">Pasirinkti Excel arba CSV failą</span>
            <i className="fas fa-upload relative z-10 text-sm group-hover:-translate-y-0.5 transition-transform"></i>
          </>
        )}
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <input 
          type="file" 
          accept=".xlsx,.xls,.csv" 
          className="hidden" 
          onChange={handleFileChange} 
        />
      </label>
      
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        <span className="flex items-center gap-2"><i className="fas fa-check text-emerald-500"></i> Excel (.xlsx, .xls)</span>
        <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
        <span className="flex items-center gap-2"><i className="fas fa-check text-emerald-500"></i> CSV (UTF-8)</span>
        <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
        <span className="flex items-center gap-2"><i className="fas fa-check text-emerald-500"></i> Auto-analizė</span>
      </div>
    </div>
  );
};

export default CSVUpload;
