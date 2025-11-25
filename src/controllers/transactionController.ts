import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import Transaction from '../models/Transaction';
import User from '../models/User';





export const createTransaction = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { type, amount, description, category, date, tags } = req.body;

    // Input validation
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Invalid or missing transaction type' });
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Chain step 1: Categorize (Gemini or manual)
    const finalCategory = category ;

    // Chain step 2: Create and save the transaction
    const transaction = new Transaction({
      userId: req.user._id,
      type,
      amount,
      description,
      category: finalCategory,
      date: date ? new Date(date) : new Date(),
      tags: tags || [],
      source: 'manual'
    });

    await transaction.save();

    // Chain step 3: Update user's current balance
    const balanceChange = type === 'income' ? amount : -amount;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { currentBalance: balanceChange } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(201).json({
      message: 'Transaction added successfully',
      transaction,
      currentBalance: user.currentBalance
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTransactions = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { limit = 20, skip = 0, type, category } = req.query;
    
    const filter: any = { userId: req.user._id };
    if (type) filter.type = type;
    if (category) filter.category = category;

    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    const total = await Transaction.countDocuments(filter);

    res.json({
      transactions,
      total,
      limit: Number(limit),
      skip: Number(skip)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTransactionById = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTransaction = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { id } = req.params;
    const { type, amount, description, category, date, tags } = req.body;

    const oldTransaction = await Transaction.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!oldTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Calculate balance adjustment
    const oldChange = oldTransaction.type === 'income' ? oldTransaction.amount : -oldTransaction.amount;
    const newChange = type === 'income' ? amount : -amount;
    const balanceAdjustment = newChange - oldChange;

    // Update transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { type, amount, description, category, date: date ? new Date(date) : undefined, tags },
      { new: true }
    );

    // Update user balance
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { currentBalance: balanceAdjustment } },
      { new: true }
    );

    res.json({
      message: 'Transaction updated successfully',
      transaction: updatedTransaction
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTransaction = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Reverse balance change
    const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { currentBalance: balanceChange } },
      { new: true }
    );

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTransactionsByCategory = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { category } = req.params;

    const transactions = await Transaction.find({
      userId: req.user._id,
      category
    }).sort({ date: -1 });

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTransactionsByDateRange = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const transactions = await Transaction.find({
      userId: req.user._id,
      date: { $gte: new Date(startDate as string), $lte: new Date(endDate as string) }
    }).sort({ date: -1 });

    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTransactionStats = async (req: Request & { user?: any }, res: Response) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id });

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc: any, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    res.json({
      totalIncome,
      totalExpenses,
      netCashflow: totalIncome - totalExpenses,
      expensesByCategory,
      transactionCount: transactions.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};