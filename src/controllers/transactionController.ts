import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import Transaction from '../models/Transaction';
import User from '../models/User';

// Gemini API call for categorization using @google/genai
const ai = new GoogleGenAI({
  apiKey:  "AIzaSyBeNVHUQFgplVh3g2KhStR-AoAjQettd7U"// Make sure this is set in your .env
});

async function categorizeWithGemini(description: string, amount: number, type: string): Promise<string> {
  const prompt = `Categorize this transaction: Description="${description}", Amount=${amount}, Type=${type}. Respond with only the category name.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    // Extract category from Gemini response
    const category = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return category || 'Uncategorized';
  } catch (error) {
    console.error('Gemini API error:', error);
    return 'Uncategorized';
  }
}

// LangChain-like chain: categorize, then create transaction, then update balance
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
    const finalCategory = category || await categorizeWithGemini(description, amount, type);

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