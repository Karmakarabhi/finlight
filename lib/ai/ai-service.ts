import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const SYSTEM_PROMPT = `You are a financial domain expert. 
Your primary job is to explain portfolio findings, holdings, or analyze what-if scenarios in plain English.
Rules:
1. Zero math hallucination. Do not calculate numbers yourself.
2. Strictly adhere to the evidence numbers provided in the context.
3. Be concise, clear, and actionable.
4. Output your response as a structured JSON object where possible, or plain text for explanations.`;

export async function generateFindingExplanations(findings: any[], context: any) {
  const prompt = `${SYSTEM_PROMPT}\n\nContext:\n${JSON.stringify(context, null, 2)}\n\nFindings:\n${JSON.stringify(findings, null, 2)}
  
  Explain these findings. Return a JSON object with:
  - "portfolioSummary": A 2-3 sentence overview of the portfolio's overall health.
  - "explanations": A map of finding type to a 1-sentence plain English explanation.
  Format as strict JSON without markdown blocks.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { portfolioSummary: "Error generating summary.", explanations: {} };
  }
}

export async function explainHolding(holdingData: any, portfolioSummary: any) {
  const prompt = `${SYSTEM_PROMPT}\n\nPortfolio Summary:\n${JSON.stringify(portfolioSummary, null, 2)}\n\nHolding Data:\n${JSON.stringify(holdingData, null, 2)}
  
  Explain this holding's role in the portfolio in 2-3 sentences. Do not add numbers not present in the data.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function analyzeWhatIf(portfolioContext: any, scenario: string) {
  const prompt = `${SYSTEM_PROMPT}\n\nPortfolio Context:\n${JSON.stringify(portfolioContext, null, 2)}\n\nScenario: "${scenario}"
  
  Provide a qualitative analysis of this scenario in plain English (3-4 sentences). Discuss potential impacts on allocation, risk, and goals based on the provided context.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
