
import { GoogleGenAI, Type } from "@google/genai";
import { QuestionSummary } from "../types";

// Init Gemini API with key from environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIInsights = async (summaries: QuestionSummary[], openFeedback: string[]) => {
  const prompt = `
    Esi pedagoginis mentorius ir duomenų analitikas. Tau pateikiama mokslo metų pabaigos apklausos santrauka, kurią pildė MOKINIAI. 
    Tavo užduotis - analizuoti duomenis iš mokinio perspektyvos: kaip jie jaučiasi pamokose, ar jiems suprantamas turinys, koks jų santykis su mokytoju.
    
    KIEKYBINIAI DUOMENYS (Mokinių vertinimai 1-5 skalėje):
    ${JSON.stringify(summaries)}
    
    KOKYBINIAI DUOMENYS (Mokinių tekstiniai atsakymai):
    ${openFeedback.join("\n")}

    Remiantis šiais duomenimas, sugeneruok išsamią analizę JSON formatu lietuvių kalba:
    1. "strengths": Mokinių labiausiai vertinamos mokytojo savybės ar metodai.
    2. "improvements": Sritys, kurias mokiniai (vaikai) indikavo kaip sunkias, neaiškias ar nemalonias.
    3. "insights": Gilios pedagoginės įžvalgos apie tai, kaip mokiniai priima mokymosi procesą.
    4. "themes": Išskirk 3-4 pagrindines temas (pvz., "Emocinis saugumas", "Grįžtamasis ryšys", "Mokymosi tempas"). Kiekvienai temai pateik aprašymą ir vyraujančią mokinių nuotaiką.
    5. "sentimentScore": Bendras mokslo metų emocinis fonas mokinio akimis (nuo 0 iki 100).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
    Esi aukšto lygio pedagoginis mentorius. Mokytojas pildo savirefleksiją po mokinių apklausos.
    Tavo užduotis: pateikti pasiūlymus, kurie padėtų mokytojui susieti savo mintis su KONKREČIOMIS MOKINIŲ ĮVARDINTOMIS TEMOMIS.
    
    DUOMENŲ ANALIZĖS REZULTATAI (MOKINIŲ BALSAS):
    - Pagrindinės temos (themes): ${JSON.stringify(aiInsights?.themes || [])}
    - Mokinių pastebėtos stiprybės: ${aiInsights?.strengths || 'Nenurodyta'}
    - Mokinių įvardintos silpnybės: ${aiInsights?.improvements || 'Nenurodyta'}

    MOKYTOJO DABARTINĖS MINTYS:
    - Pastebėjimai: ${observations || 'Dar nepildyta'}
    - Stiprybės: ${strengths || 'Dar nepildyta'}
    - Tobulėjimas: ${improvements || 'Dar nepildyta'}
    - Netikėtumai: ${surprises || 'Dar nepildyta'}

    INSTRUKCIJA:
    Sugeneruok po 3-4 itin konkrečius pasiūlymus kiekvienai kategorijai. 
    KIEKVIENAS pasiūlymas privalo būti TIESIOGIAI pririštas prie bent vienos iš aukščiau nurodytų temų (themes). 
    Pvz., jei tema yra „Emocinis saugumas“, pasiūlymas pastebėjimams turi padėti mokytojui rasti priežastis duomenyse, kodėl vaikai taip jaučiasi. 
    Pasiūlymas veiksmams turi siūlyti konkretų metodą, kaip tą saugumą didinti.

    Atsakymą pateik JSON formatu lietuvių kalba.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            observationSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Pasiūlymai ką dar pastebėti duomenyse per temų prizmę" },
            analysisSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Kaip susieti metodus su temomis" },
            bestPracticeSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Konkretūs metodai stiprinantys pozityvias temas" },
            emotionSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Kaip jaustis dėl specifinių mokinių atsiliepimų" },
            actionSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Veiksmai sprendžiantys temų problemas" },
            nextStepSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Indikatoriai specifinių temų pokyčiui matuoti" }
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
