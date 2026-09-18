import { QuestionSummary } from "../types";
import { 
  generatePedagogicalInsights, 
  generateFieldDraft, 
  generateReflectionSuggestions 
} from "./pedagogicalAnalysis";

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

    if (response.ok) {
      const data = await response.json();
      if (data && data.observationSuggestions && data.observationSuggestions.length > 0) {
        return data;
      }
    }
  } catch (error) {
    console.warn("Suggestions API fallback to pedagogical generator:", error);
  }

  return generateReflectionSuggestions();
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

    if (response.ok) {
      const data = await response.json();
      if (data.draft && data.draft.trim().length > 0) {
        return data.draft;
      }
    }
  } catch (error) {
    console.warn("Draft field API fallback to pedagogical generator:", error);
  }

  return generateFieldDraft(fieldKey, fieldLabel, currentNotes, summaries, openFeedback, aiInsights);
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
