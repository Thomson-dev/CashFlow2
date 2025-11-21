import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import User from '../models/User';
import axios from 'axios';





export const getCashflowStatus = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get transactions from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: thirtyDaysAgo }
    });

    // Calculate daily burn rate (average daily expenses)
    const expenses = transactions.filter(t => t.type === 'expense');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const dailyBurnRate = totalExpenses / 30;

    // Calculate days until broke
    const currentBalance = user.currentBalance ?? 0;
    const daysRemaining = dailyBurnRate > 0 
      ? Math.floor(currentBalance / dailyBurnRate) 
      : 999;

    // Determine cashflow indicator
    let indicator: 'green' | 'yellow' | 'red';
    let phrase: string;

    if (daysRemaining > 30) {
      indicator = 'green';
      phrase = `You're doing great! You have ${daysRemaining} days of runway.`;
    } else if (daysRemaining > 14) {
      indicator = 'yellow';
      phrase = `Be cautious. You'll be fine for ${daysRemaining} more days.`;
    } else {
      indicator = 'red';
      phrase = `Critical! Only ${daysRemaining} days remaining. Consider cutting expenses.`;
    }

    res.json({
      currentBalance,
      dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
      daysRemaining,
      indicator,
      phrase
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserFinancialSummary = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get transactions for the current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const transactions = await Transaction.find({
      userId,
      date: { $gte: firstDay, $lte: lastDay }
    });

    const monthlyIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      currentBalance: user.currentBalance ?? 0,
      monthlyIncome,
      monthlyExpenses
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};










export const getInsightsPanel = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch all user transactions
    const allTransactions = await Transaction.find({ userId }).sort({ date: 1 });

    // Filter current month transactions
    const currentMonthTransactions = allTransactions.filter(
      t => t.date && t.date.getTime() >= currentMonthStart.getTime() && t.date.getTime() <= currentMonthEnd.getTime()
    );

    const currentMonthIncome = currentMonthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const currentMonthExpenses = currentMonthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Historical averages (last 3 months excluding current)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const historicalTransactions = allTransactions.filter(
      t => t.date && t.date.getTime() >= threeMonthsAgo.getTime() && t.date.getTime() <= lastMonthEnd.getTime()
    );

    const historicalIncome = historicalTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const historicalExpenses = historicalTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const monthsCount = 3;
    const averageIncome = historicalIncome / monthsCount;
    const averageExpenses = historicalExpenses / monthsCount;

    // Spending / Income Analysis
    const spendingIncrease = averageExpenses > 0 ? ((currentMonthExpenses - averageExpenses) / averageExpenses) * 100 : 0;
    const isSpendingHigh = spendingIncrease > 20;

    const incomeDecrease = averageIncome > 0 ? ((averageIncome - currentMonthIncome) / averageIncome) * 100 : 0;
    const isInflowLow = incomeDecrease > 15;

    // Upcoming bills
    const expensesByDescription = new Map<string, { amount: number; dates: Date[] }>();
    allTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        const key = (typeof t.description === "string" ? t.description : "unknown").toLowerCase().trim();
        if (!expensesByDescription.has(key)) expensesByDescription.set(key, { amount: t.amount, dates: [] });
        if (t.date) expensesByDescription.get(key)!.dates.push(t.date);
      });

    const upcomingBills: Array<{ description: string; amount: number; dueInDays: number }> = [];
    expensesByDescription.forEach((data, description) => {
      if (data.dates.length >= 2) {
        const sortedDates = data.dates.sort((a, b) => a.getTime() - b.getTime());
        const lastOccurrence = sortedDates[sortedDates.length - 1];
        const intervals: number[] = [];
        for (let i = 1; i < sortedDates.length; i++) {
          intervals.push(Math.floor((sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)));
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const nextOccurrence = new Date(lastOccurrence.getTime() + avgInterval * 24 * 60 * 60 * 1000);
        const daysUntilNext = Math.floor((nextOccurrence.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilNext >= 0 && daysUntilNext <= 14) {
          upcomingBills.push({
            description: description.charAt(0).toUpperCase() + description.slice(1),
            amount: Math.round(data.amount * 100) / 100,
            dueInDays: daysUntilNext
          });
        }
      }
    });

    upcomingBills.sort((a, b) => a.dueInDays - b.dueInDays);

    // Recommendations (basic)
    const recommendations: string[] = [];
    if (isSpendingHigh) recommendations.push(`Cut discretionary spending by $${Math.round(currentMonthExpenses - averageExpenses)} to return to average.`);
    if (isInflowLow) recommendations.push("Follow up on pending invoices or consider additional income sources.");
    if (upcomingBills.length > 0) recommendations.push(`Set aside $${Math.round(upcomingBills.reduce((sum, b) => sum + b.amount, 0))} for upcoming bills.`);
    
    const currentBalance = user.currentBalance ?? 0;
    const dailyBurnRate = currentMonthExpenses / now.getDate();
    const daysRemaining = dailyBurnRate > 0 ? Math.floor(currentBalance / dailyBurnRate) : 999;
    if (daysRemaining < 30) recommendations.push("Your runway is low. Focus on increasing income or reducing expenses urgently.");
    if (recommendations.length === 0) recommendations.push("You're on track! Keep maintaining your current spending habits.");

    const insights = { spendingTooHigh: { isHigh: isSpendingHigh, currentMonthExpenses, averageExpenses, percentageIncrease: spendingIncrease }, inflowsLow: { isLow: isInflowLow, currentMonthIncome, averageIncome, percentageDecrease: incomeDecrease }, upcomingBills, recommendations };

    // Call Python/LangChain AI for enhanced insights
    try {
      const aiResponse = await axios.post("https://cashflowai-production.up.railway.app/ai/insights", { insights }, { timeout: 10000 });
      const aiData = aiResponse.data;

      res.json({
        insights,
        aiInsights: {
          ...aiData,
          recommendations: aiData.recommendations || insights.recommendations,
          cashflowTips: aiData.cashflowTips || []
        }
      });

    } catch (aiError: any) {
      console.error("AI service unavailable:", aiError.message);
      res.json({
        insights,
        aiInsights: {
          available: false,
          message: "AI insights temporarily unavailable",
          recommendations,
          cashflowTips: []
        }
      });
    }

  } catch (error: any) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
};
