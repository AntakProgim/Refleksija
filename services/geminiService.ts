import { QuestionSummary } from "../types";

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

    return await response.json();
  } catch (error) {
    console.error("Gemini AI API call error:", error);
    return {
      strengths: "Nepavyko sugeneruoti įžvalgų per serverį.",
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
  try {
    const response = await fetch("/api/suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ observations, strengths, improvements, surprises, aiInsights }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Suggestions API call error:", error);
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
