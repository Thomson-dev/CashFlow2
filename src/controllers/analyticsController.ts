import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import User from '../models/User';





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