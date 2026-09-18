import { QuestionSummary } from "../types";
import { generatePedagogicalInsights } from "./pedagogicalAnalysis";

export const getAIInsights = async (summaries: QuestionSummary[], openFeedback: string[]) => {
  try {
    const response = await fetch("/api/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ summaries, openFeedback }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.strengths || data.strengths.includes("Nepavyko sugeneruoti")) {
      return generatePedagogicalInsights(summaries, openFeedback);
    }
    return data;
  } catch (error) {
    console.warn("Gemini AI API call fallback to heuristic pedagogical analysis:", error);
    return generatePedagogicalInsights(summaries, openFeedback);
  }
};

export const getReflectionSuggestions = async (
  observations: string, 
  strengths: string, 
  improvements: string, 
  surprises: string,
  aiInsights: any,
  summaries?: QuestionSummary[],
  openFeedback?: string[]
) => {
  try {
    const response = await fetch("/api/suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ observations, strengths, improvements, surprises, aiInsights, summaries, openFeedback }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Suggestions API call error:", error);
    return { 
      observationSuggestions: [
        "Pastebiu, kad mokiniai vertina aiškų temų paaiškinimą ir pagarbų bendravimą.",
        "Mokinių atsakymai rodo poreikį lankstesniam užduočių atlikimo tempui.",
        "Klasės mikroklimatas stabilus, tačiau verta stiprinti tarpusavio bendradarbiavimą."
      ], 
      analysisSuggestions: [
        "Stiprybė: mokiniai pamokoje jaučiasi saugūs ir skatinami kelti klausimus.",
        "Tobulintina sritis: atsiskaitymo reikalavimų ir vertinimo kriterijų išankstinis aptarimas.",
        "Netikėtumas: mokiniai nori aktyvesnių diskusijų ir darbo porose."
      ], 
      bestPracticeSuggestions: [
        "Trumpas formatyvus grįžtamasis ryšys iš karto po atliktos užduoties.",
        "Sėkmės kriterijų (rubrikų) vizualizavimas prieš pradedant darbą.",
        "Diferencijuotos praktinės užduotys."
      ], 
      emotionSuggestions: [
        "Jaučiu profesinį džiaugsmą matydamas mokinių atvirumą.",
        "Jaučiu atsakomybę padėti mokiniams, patiriantiems didesnį mokymosi nerimą."
      ], 
      actionSuggestions: [
        "Nustosiu skubėti tikrinant visų užduočių atlikimą – skirsiu laiko refleksijai.",
        "Pradėsiu taikyti 2 minučių 'exit ticket' grįžtamajam ryšiui.",
        "Tęsiu atvirą dialogą su mokiniais ir asmeninį palaikymą."
      ], 
      nextStepSuggestions: [
        "Atlikti trumpą tarpinę mini-apklausą po pirmojo pusmečio.",
        "Palyginti mokinių įsitraukimo rodiklius pritaikius naujus metodus."
      ]
    };
  }
};

export const getDraftFieldSuggestion = async (
  fieldKey: string,
  fieldLabel: string,
  currentNotes: string,
  summaries: QuestionSummary[],
  openFeedback: string[],
  aiInsights: any
): Promise<string> => {
  try {
    const response = await fetch("/api/draft-field", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fieldKey, fieldLabel, currentNotes, summaries, openFeedback, aiInsights }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.draft || "";
  } catch (error) {
    console.error("Draft field error:", error);
    return "";
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  try {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Audio, mimeType }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text || "";
  } catch (error) {
    console.error("Transcription API call error:", error);
    throw error;
  }
};
