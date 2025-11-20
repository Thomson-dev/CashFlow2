import { Request, Response } from 'express';
import axios from 'axios';
import User from '../models/User';
import Transaction from '../models/Transaction';

export const chatWithBot = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { userMessage, conversationHistory } = req.body;
    const userId = req.user._id;

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user context
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent transactions for context
    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .limit(10);

    // Prepare enhanced context for AI
    const context = {
      userMessage,
      userData: {
        name: user.name,
        currentBalance: user.currentBalance,
        currency: user.currency || '$',
        businessName: user.businessSetup?.businessName,
        businessType: user.businessSetup?.businessType
      },
      recentTransactions: recentTransactions.map(t => ({
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date?.toISOString().split('T')[0]
      })),
      conversationHistory: conversationHistory || []
    };

    // Call enhanced AI service
    try {
      const aiResponse = await axios.post(
        'http://127.0.0.1:5000/ai/chat',
        context,
        { timeout: 15000 }
      );

      res.json({
        response: aiResponse.data.response,
        suggestions: aiResponse.data.suggestions || [],
        insights: aiResponse.data.insights,
        aiAvailable: true
      });

    } catch (aiError: any) {
      console.error('AI service error:', aiError.message);
      
      // Enhanced fallback response
      const fallbackResponse = getEnhancedFallbackResponse(userMessage, user, recentTransactions);
      
      res.json({
        response: fallbackResponse.message,
        suggestions: fallbackResponse.suggestions,
        insights: fallbackResponse.insights,
        aiAvailable: false
      });
    }

  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Enhanced fallback with actual data analysis
function getEnhancedFallbackResponse(message: string, user: any, transactions: any[]) {
  const lowerMessage = message.toLowerCase();

  // Calculate basic stats
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = user.currentBalance || 0;
  const currency = user.currency || '$';

  // Balance inquiry
  if (lowerMessage.includes('balance')) {
    return {
      message: `Your current balance is ${currency}${balance.toFixed(2)}. ${
        balance < 500 ? 'Consider reviewing your expenses to improve cash flow.' : 
        balance > 5000 ? 'Your balance looks healthy!' : 
        'Keep monitoring your spending.'
      }`,
      suggestions: [
        'Show my recent transactions',
        'What are my biggest expenses?',
        'Give me financial advice'
      ],
      insights: { balance, totalIncome, totalExpenses }
    };
  }

  // Spending inquiry
  if (lowerMessage.includes('spend') || lowerMessage.includes('expense')) {
    const topExpense = transactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)[0];

    return {
      message: `You've spent ${currency}${totalExpenses.toFixed(2)} recently. ${
        topExpense ? `Your largest expense was ${currency}${topExpense.amount.toFixed(2)} for ${topExpense.description || topExpense.category}.` : ''
      }`,
      suggestions: [
        'How can I reduce expenses?',
        'Show income vs expenses',
        'What\'s my cash flow status?'
      ],
      insights: { totalExpenses, topExpense: topExpense?.description }
    };
  }

  // Income inquiry
  if (lowerMessage.includes('income') || lowerMessage.includes('revenue')) {
    return {
      message: `Your recent income is ${currency}${totalIncome.toFixed(2)}. Net cash flow: ${currency}${(totalIncome - totalExpenses).toFixed(2)}.`,
      suggestions: [
        'How can I increase revenue?',
        'Show my profit margin',
        'Analyze my financial health'
      ],
      insights: { totalIncome, netCashflow: totalIncome - totalExpenses }
    };
  }

  // Help
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return {
      message: `Hi ${user.name || 'there'}! I'm your AI financial assistant. I can help you:
• Check your balance and transactions
• Analyze spending patterns
• Track income vs expenses
• Provide cash flow insights
• Give personalized financial advice

What would you like to know?`,
      suggestions: [
        'What\'s my current balance?',
        'Analyze my spending',
        'Show recent transactions',
        'Give me financial tips'
      ],
      insights: null
    };
  }

  // Default response
  return {
    message: `I'm here to help with your finances! You currently have ${currency}${balance.toFixed(2)} in your account. What would you like to know about your cash flow?`,
    suggestions: [
      'Show my balance',
      'What are my expenses?',
      'Analyze my financial health',
      'Give me advice'
    ],
    insights: { balance, transactionCount: transactions.length }
  };
}

export const getChatHistory = async (req: Request & { user?: any }, res: Response) => {
  try {
    const userId = req.user._id;

    // For now, return empty - you can implement MongoDB storage later
    res.json({
      history: [],
      message: 'Chat history stored in session'
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
