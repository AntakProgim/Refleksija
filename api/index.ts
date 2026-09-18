import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
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
    Esi profesionalus pedagoginis mentorius ir švietimo duomenų analitikas. Tau pateikiama mokslo metų pabaigos apklausos santrauka, kurią pildė MOKINIAI. 
    Tavo užduotis - atlikti gilią, konstruktyvią ir objektyvią analizę iš mokinio perspektyvos: kaip mokiniai jaučiasi pamokose, koks emocinis klimatas, ar jiems suprantamas turinys, koks jų santykis su mokytoju ir grįžtamasis ryšys.
    
    KIEKYBINIAI DUOMENYS (Mokinių vertinimai 1-5 balų skalėje, pasiskirstymas ir kategorijos):
    ${JSON.stringify(summaries)}
    
    KOKYBINIAI DUOMENYS (Mokinių atviri tekstiniai atsakymai ir pastebėjimai):
    ${(openFeedback || []).join("\n")}

    Remiantis šiais duomenimis, sugeneruok išsamią analizę JSON formatu lietuvių kalba:
    1. "strengths": Mokinių labiausiai vertinamos mokytojo stiprybės, aiškumas, palaikymas ar metodai (išskirk 2-3 konkrečius aspektus).
    2. "improvements": Sritys, kurias mokiniai nurodė kaip sunkias, keliančias įtampą ar tobulintinas (konkrečiai, be kaltinimo, su pedagogine perspektyva).
    3. "insights": Gilios pedagoginės įžvalgos apie mokinių motyvaciją, mokymosi įsitraukimą ir klasės klimatą.
    4. "themes": Išskirk 3-4 pagrindines temas (pvz., "Emocinis saugumas ir pagarba", "Grįžtamojo ryšio kokybė", "Diferencijuotas tempas", "Aktyvus įsitraukimas"). Kiekvienai temai pateik aprašymą ir vyraujančią mokinių nuotaiką.
    5. "sentimentScore": Bendras mokslo metų emocinio fono ir pasitenkinimo balas mokinio akimis (nuo 0 iki 100).
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
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
      improvements: "Peržiūrėkite mokinių duomenis suvestinės lentelėje.",
      insights: "",
      sentimentScore: 50,
      themes: []
    });
  }
});

app.post("/api/suggestions", async (req, res) => {
  const { observations, strengths, improvements, surprises, aiInsights, summaries, openFeedback } = req.body;

  const prompt = `
    Esi patyręs mokyklos pedagoginis mentorius. Mokytojas pildo savirefleksiją po mokinių apklausos.
    Tavo užduotis: pateikti itin konkrečius, praktiškus ir profesionalius pasiūlymus kiekvienai refleksijos skilčiai pagal mokinių apklausos duomenis.

    MOKINIŲ ANALIZĖS REZULTATAI:
    - Identifikuotos temos: ${JSON.stringify(aiInsights?.themes || [])}
    - Mokinių stiprybės: ${aiInsights?.strengths || 'Vertinama teigiamai'}
    - Mokinių pastebėjimai tobulėjimui: ${aiInsights?.improvements || 'Nenurodyta'}
    - Įvertinimų vidurkiai ir klausimai: ${JSON.stringify(summaries?.map((s: any) => ({ klausimas: s.question, vidurkis: s.averageScore, kategorija: s.category })) || [])}
    - Mokinių atviri komentarai: ${(openFeedback || []).slice(0, 10).join("; ")}

    MOKYTOJO ESAMAS KONTEKSTAS:
    - Mokytojo pastebėjimai: ${observations || 'Dar neužpildyta'}
    - Mokytojo nurodytos stiprybės: ${strengths || 'Dar neužpildyta'}
    - Mokytojo nurodytas tobulėjimas: ${improvements || 'Dar neužpildyta'}
    - Mokytojo nurodyti netikėtumai: ${surprises || 'Dar neužpildyta'}

    UŽDUOTIS:
    Sugeneruok po 3-4 praktiškus, konkrečius ir profesionalius sakinius/idėjas kiekvienai iš 6 kategorijų:
    1. observationSuggestions: objektyvūs pastebėjimai apie mokinių atsakymus ir tendencijas.
    2. analysisSuggestions: stiprybių ir iššūkių analizė mokinio akimis.
    3. bestPracticeSuggestions: pasiteisinę mokymo metodai, kuriais remiantis verta dirbti toliau.
    4. emotionSuggestions: emocinė reakcija į mokinių atvirumą (ramybė, profesinis pasitenkinimas, noras padėti, susirūpinimas tempu).
    5. actionSuggestions: konkretūs veiksmai (ką nustoti, ką pradėti, ką tęsti) – pvz., pradėti trumpą grįžtamojo ryšio minutėlę pamokos pabaigoje, diferencijuoti užduotis.
    6. nextStepSuggestions: kaip pamatuoti sėkmę kitais mokslo metais.

    Pasiūlymai turi būti natūralia lietuvių kalba, parašyti pirmuoju asmeniu ("Pastebiu, kad...", "Ketinu pradėti...") arba aiškia rekomendacijos forma.
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
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
      observationSuggestions: [
        "Pastebiu, kad mokiniai labiausiai vertina aiškų temų paaiškinimą ir pagarbų bendravimą.",
        "Mokinių atsakymai rodo, kad verta atkreipti dėmesį į užduočių apimtį ir atsiskaitymų terminus.",
        "Klasės klimato klausimai vertinami stabiliai, tačiau išryškėja poreikis individualesniam dėmesiui."
      ], 
      analysisSuggestions: [
        "Stiprybė: mokiniai pamokose jaučiasi saugūs ir skatinami kelti klausimus.",
        "Tobulintina sritis: mokiniams kartais pritrūksta aiškumo dėl vertinimo kriterijų prieš atsiskaitymą.",
        "Netikėtumas: vaikai nori dažniau dirbti grupėse su aiškiai paskirstytomis atsakomybėmis."
      ], 
      bestPracticeSuggestions: [
        "Formatyvus grįžtamasis ryšys iš karto po praktinės užduoties atlikimo.",
        "Aiškūs pamokos tikslai ir sėkmės kriterijai pamokos pradžioje.",
        "Diferencijuotos užduotys pagal mokinių tempą."
      ], 
      emotionSuggestions: [
        "Jaučiu profesinį pasitenkinimą matydamas mokinių atvirumą ir pasitikėjimą.",
        "Jaučiu atsakomybę padėti tiems mokiniams, kurie patiria didesnį mokymosi nerimą.",
        "Esu įkvėptas mokinių idėjų pamokų tobulinimui kitais metais."
      ], 
      actionSuggestions: [
        "Nustosiu skubėti tikrinant visų užduočių atlikimą pamokoje – skirsiu laiko refleksijai.",
        "Pradėsiu taikyti 2 minučių išėjimo bilietus ('exit tickets') supratimui įsivertinti.",
        "Tęsiu atvirą dialogą su mokiniais ir individualių klausimų aptarimą po pamokos."
      ], 
      nextStepSuggestions: [
        "Atlikti trumpą tarpinę mini-apklausą po pirmojo pusmečio.",
        "Palyginti mokinių įsitraukimo rodiklius pritaikius naujus metodus.",
        "Aptarti pažangą su mokiniais individualių pokalbių metu."
      ]
    });
  }
});

// Dedicated endpoint to draft a specific field with AI
app.post("/api/draft-field", async (req, res) => {
  const { fieldKey, fieldLabel, currentNotes, summaries, openFeedback, aiInsights } = req.body;

  const prompt = `
    Esi pedagoginis mentorius. Mokytojas atlieka savirefleksiją po mokinių apklausos.
    Mokytojas prašo tavęs padėti suformuluoti profesionalų, asmenišką ir gilų įrašą konkrečiam laukui: "${fieldLabel}" (lauko kodas: ${fieldKey}).

    MOKINIŲ DUOMENŲ KONTEKSTAS:
    - Įžvalgos apie stiprybes: ${aiInsights?.strengths || 'Nenurodyta'}
    - Įžvalgos apie tobulintinas sritis: ${aiInsights?.improvements || 'Nenurodyta'}
    - Temos: ${JSON.stringify(aiInsights?.themes || [])}
    - Mokinių atsiliepimai: ${(openFeedback || []).slice(0, 8).join("; ")}
    - Apklausos vidurkiai: ${JSON.stringify((summaries || []).slice(0, 6).map((s: any) => ({ q: s.question, avg: s.averageScore })))}
    
    ESAMI MOKYTOJO UŽRAŠAI / MINTYS ŠIAME LAUKE:
    ${currentNotes || 'Tuščia (mokytojas prašo sugeneruoti pradinį pasiūlymą)'}

    REIKALAVIMAI:
    1. Parašyk 2-4 rišlius, profesionalius sakinius lietuvių kalba pirmuoju asmeniu ("Aš", "Mano pamokose...").
    2. Tekstas turi būti konkretus, empatiškas, pedagogiškai motyvuotas ir atspindėti pateiktus mokinių duomenis.
    3. Venk tuščiažodžiavimo. Jei tai veiksmų planas ("actionStop", "actionStart", "actionContinue"), pateik aiškius, įgyvendinamus veiksmus.
    4. Pateik TIK patį tekstą be jokių įžangų ar kabučių.
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });

    res.json({ draft: response.text?.trim() || "" });
  } catch (error) {
    console.error("Draft field error:", error);
    res.status(500).json({ error: "Failed to generate draft", draft: "" });
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

export default app;
