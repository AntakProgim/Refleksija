
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionSummary } from "../types";

// Init Gemini API with key from environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIInsights = async (summaries: QuestionSummary[], openFeedback: string[]) => {
  const prompt = `
    Esi pedagoginis mentorius ir duomenų analitikas. Tau pateikiama mokslo metų pabaigos apklausos santrauka, kurią pildė MOKINIAI (kartais padedami tėvų). 
    Tavo užduotis - analizuoti duomenis iš mokinio perspektyvos: kaip jie jaučiasi pamokose, ar jiems suprantamas turinys, koks jų santykis su mokytoju.
    
    KIEKYBINIAI DUOMENYS (Mokinių vertinimai 1-5 skalėje):
    ${JSON.stringify(summaries)}
    
    KOKYBINIAI DUOMENYS (Mokinių tekstiniai atsakymai, jų mintys ir jausmai):
    ${openFeedback.join("\n")}

    Remiantis šiais duomenimas, sugeneruok išsamią analizę JSON formatu lietuvių kalba:
    1. "strengths": Mokinių labiausiai vertinamos mokytojo savybės ar metodai.
    2. "improvements": Sritys, kurias mokiniai (vaikai) indikavo kaip sunkias, neaiškias ar nemalonias.
    3. "insights": Gilios pedagoginės įžvalgos apie tai, kaip mokiniai priima mokymosi procesą.
    4. "themes": Išskirk 3-4 pagrindines temas iš tekstinių atsakymų (pvz., "Emocinis saugumas", "Namų darbų krūvis"). Kiekvienai temai pateik aprašymą ir vyraujančią mokinių nuotaiką.
    5. "sentimentScore": Bendras mokslo metų emocinis fonas mokinio akimis (nuo 0 iki 100).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.STRING },
            improvements: { type: Type.STRING },
            insights: { type: Type.STRING },
            sentimentScore: { type: Type.NUMBER },
            themes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  sentiment: { type: Type.STRING }
                },
                required: ["label", "description", "sentiment"]
              }
            }
          },
          required: ["strengths", "improvements", "insights", "themes", "sentimentScore"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini AI error:", error);
    return {
      strengths: "Nepavyko sugeneruoti įžvalgų.",
      improvements: "Peržiūrėkite mokinių duomenis rankiniu būdu.",
      insights: "",
      sentimentScore: 50,
      themes: []
    };
  }
};

export const getReflectionSuggestions = async (
  observations: string, 
  strengths: string, 
  improvements: string, 
  surprises: string,
  aiInsights: any
) => {
  const prompt = `
    Esi pedagoginis mentorius. Mokytojas atlieka mokslo metų savirefleksiją.
    Tavo užduotis: padėti mokytojui suformuluoti gilias įžvalgas, kurios tiesiogiai atlieptų MOKINIŲ lūkesčius ir jausmus.
    
    STUDENTŲ APŽVALGOS DUOMENYS (DI Analizė):
    - Mokinių matomos stiprybės: ${aiInsights?.strengths || 'Nenurodyta'}
    - Mokinių nurodyti sunkumai: ${aiInsights?.improvements || 'Nenurodyta'}
    - Pagrindinės temos: ${JSON.stringify(aiInsights?.themes || [])}
    - Emocinis balas: ${aiInsights?.sentimentScore || 50}/100

    DABARTINIAI MOKYTOJO PASTEBĖJIMAI:
    - Pastebėjimai: ${observations}
    - Mokytojo įžvelgtos stiprybės: ${strengths}
    - Mokytojo įžvelgtos tobulintinos sritys: ${improvements}
    - Netikėtumai: ${surprises}

    Sugeneruok trumpus (1-2 sakiniai), konkrečius pasiūlymus, kurie padėtų mokytojui dar geriau suprasti mokinius:
    1. "observationSuggestions": Pasiūlymai, kaip mokytojas galėtų giliau interpretuoti mokinių duomenis (atsižvelgiant į temas).
    2. "analysisSuggestions": Įžvalgos apie tai, kaip mokytojo veiksmai koreliuoja su mokinių nurodytais sunkumais.
    3. "bestPracticeSuggestions": Ką tęsti, kad išlaikyti teigiamą mokinių sentimentą.
    4. "emotionSuggestions": Padėk mokytojui įvardinti jausmą (profesinę empatiją), atitinkantį mokinių grįžtamąjį ryšį.
    5. "actionSuggestions": Konkretūs pokyčiai (start/stop/continue), kurie tiesiogiai spręstų mokinių įvardintas problemas.
    6. "nextStepSuggestions": Kaip pamatuoti pokytį mokinio akimis.
    
    Atsakymą pateik JSON formatu lietuvių kalba. Būk empatiškas, bet objektyvus.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            observationSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            analysisSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            bestPracticeSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            emotionSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextStepSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            "observationSuggestions", 
            "analysisSuggestions", 
            "bestPracticeSuggestions", 
            "emotionSuggestions", 
            "actionSuggestions", 
            "nextStepSuggestions"
          ]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Suggestions error:", error);
    return { 
      observationSuggestions: [], 
      analysisSuggestions: [], 
      bestPracticeSuggestions: [], 
      emotionSuggestions: [], 
      actionSuggestions: [], 
      nextStepSuggestions: [] 
    };
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          { text: "Tiksliai perrašyk šį garso įrašą į tekstą lietuvių kalba. Pateik tik patį perrašytą tekstą." }
        ]
      }
    });

    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};
