import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  let aiInstance: GoogleGenAI | null = null;

  function getAI(): GoogleGenAI {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY aplinkos kintamasis yra privalomas.");
      }
      aiInstance = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiInstance;
  }

  // API endpoints
  app.post("/api/insights", async (req, res) => {
    const { summaries, openFeedback } = req.body;
    
    const prompt = `
      Esi pedagoginis mentorius ir duomenų analitikas. Tau pateikiama mokslo metų pabaigos apklausos santrauka, kurią pildė MOKINIAI. 
      Tavo užduotis - analizuoti duomenis iš mokinio perspektyvos: kaip jie jaučiasi pamokose, ar jiems suprantamas turinys, koks jų santykis su mokytoju.
      
      KIEKYBINIAI DUOMENYS (Mokinių vertinimai 1-5 skalėje):
      ${JSON.stringify(summaries)}
      
      KOKYBINIAI DUOMENYS (Mokinių tekstiniai atsakymai):
      ${(openFeedback || []).join("\n")}

      Remiantis šiais duomenimas, sugeneruok išsamią analizę JSON formatu lietuvių kalba:
      1. "strengths": Mokinių labiausiai vertinamos mokytojo savybės ar metodai.
      2. "improvements": Sritys, kurias mokiniai (vaikai) indikavo kaip sunkias, neaiškias ar nemalonias.
      3. "insights": Gilios pedagoginės įžvalgos apie tai, kaip mokiniai priima mokymosi procesą.
      4. "themes": Išskirk 3-4 pagrindines temas (pvz., "Emocinis saugumas", "Grįžtamasis ryšys", "Mokymosi tempas"). Kiekvienai temai pateik aprašymą ir vyraujančią mokinių nuotaiką.
      5. "sentimentScore": Bendras mokslo metų emocinis fonas mokinio akimis (nuo 0 iki 100).
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
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

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error("Gemini AI error:", error);
      res.status(500).json({
        strengths: `Nepavyko sugeneruoti įžvalgų: ${error.message || error}`,
        improvements: "Peržiūrėkite mokinių duomenis rankiniu būdu.",
        insights: "",
        sentimentScore: 50,
        themes: []
      });
    }
  });

  app.post("/api/suggestions", async (req, res) => {
    const { observations, strengths, improvements, surprises, aiInsights } = req.body;

    const prompt = `
      Esi aukšto lygio pedagoginis mentorius. Mokytojas pildo savirefleksiją po mokinių apklausos.
      Tavo užduotis: pateikti pasiūlymus, kurie padėtų mokytojui susieti savo mintis su KONKREČIOMIS MOKINIŲ ĮVARDINTOMIS TEMOMIS IR EMOCIJOMIS.
      
      MOKINIŲ ANALIZĖ (PAGRINDAS):
      - Identifikuotos themes: ${JSON.stringify(aiInsights?.themes || [])}
      - Mokinių įvardintos stiprybės: ${aiInsights?.strengths || 'Nenurodyta'}
      - Mokinių įvardintos silpnybės: ${aiInsights?.improvements || 'Nenurodyta'}
      - Bendras sentimentas: ${aiInsights?.sentimentScore || 50}/100

      MOKYTOJO KONTEKSTAS:
      - Pastebėjimai: ${observations || 'Nepildyta'}
      - Stiprybės: ${strengths || 'Nepildyta'}
      - Tobulėjimas: ${improvements || 'Nepildyta'}
      - Netikėtumai: ${surprises || 'Nepildyta'}

      UŽDUOTIS:
      Sugeneruok po 4 itin konkrečius, praktinius pasiūlymus kiekvienai kategorijai lietuvių kalba.
      Kiekvienas pasiūlymas privalo spręsti bent vieną iš "themes" arba reaguoti į mokinių nuotaikas.
      Venk bendrų frazių ("reikia daugiau dirbti"). Siūlyk konkrečius veiksmus (pvz., "Kiekvienos pamokos pabaigoje skirk 2 min. anoniminiam 'exit ticket' grįžtamajam ryšiui apie tempo tinkamumą").

      Atsakymą pateik JSON formatu.
    `;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
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

      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("Suggestions error:", error);
      res.status(500).json({ 
        observationSuggestions: [], 
        analysisSuggestions: [], 
        bestPracticeSuggestions: [], 
        emotionSuggestions: [], 
        actionSuggestions: [], 
        nextStepSuggestions: [] 
      });
    }
  });

  app.post("/api/transcribe", async (req, res) => {
    const { base64Audio, mimeType } = req.body;

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
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

      res.json({ text: response.text || "" });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  // Vite middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
