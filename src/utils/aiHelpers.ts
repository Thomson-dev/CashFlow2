const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

interface Transaction {
  type: 'income' | 'expense' | string;
  amount: number;
  [key: string]: any;
}

interface Insight {
  category: 'Cash Flow' | 'Expense Tracking' | 'Growth Opportunity' | 'Investment' | string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low' | string;
  impact: string;
  timeframe: 'short term' | 'medium term' | 'long term' | string;
}

exports.generateInsights = async (userId: string, transactions: Transaction[]): Promise<Insight[]> => {
  try {
    // Compute summary values
    const totalIncome: number = transactions
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const totalExpenses: number = transactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const netCashFlow: number = totalIncome - totalExpenses;

    // Build structured prompt
    const prompt: string = `
You are a financial analysis assistant that returns JSON-formatted, actionable insights.

Analyze the user's financial summary:
- Total Income: ${totalIncome}
- Total Expenses: ${totalExpenses}
- Net Cash Flow: ${netCashFlow}

Generate 3–5 concise insight objects in JSON format, each containing:
[
  {
    "category": "Cash Flow | Expense Tracking | Growth Opportunity | Investment",
    "title": "Short actionable headline",
    "description": "Clear explanation of what to do or improve",
    "priority": "high | medium | low",
    "impact": "text showing possible financial impact (e.g., '💰 Potential Impact: 5–10% of monthly expenses')",
    "timeframe": "short term | medium term | long term"
  }
]

Make insights sound realistic, professional, and data-driven.
`;

    const model: any = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result: any = await model.generateContent(prompt);
    const text: string = result.response.text();

    // Try parsing Gemini response safely
    let insights: Insight[] = [];
    try {
      insights = JSON.parse(text) as Insight[];
      
    } catch {
      // fallback in case Gemini returns non-pure JSON
      const jsonMatch = text.match(/\[([\s\S]*)\]/);
      insights = jsonMatch ? (JSON.parse(jsonMatch[0]) as Insight[]) : [];
    }

    return insights;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return [];
  }
};
