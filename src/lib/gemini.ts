import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

let genAI: any = null;

export function getGemini() {
  if (!genAI) {
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will be disabled.");
      return null;
    }
    genAI = new GoogleGenAI({ apiKey: apiKey });
  }
  return genAI;
}

export async function generateOperationalInsights(records: any[]) {
  const ai = getGemini();
  if (!ai) return "AI Insights unavailable.";

  const prompt = `Analyze the following enterprise workspace records and provide a high-level operational summary for an executive dashboard. 
  Focus on activity trends and potential bottlenecks.
  
  Records:
  ${JSON.stringify(records, null, 2)}
  
  Format the response as a concise, professional paragraph.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return result.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating insights.";
  }
}
