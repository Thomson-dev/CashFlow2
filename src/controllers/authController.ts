import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// Extend Express Request interface to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      currency,
      whatsappEnabled,
      isSetupComplete,
      businessName,
      businessType,
      location,
      startingCapital,
      monthlyRevenue,
      monthlyExpenses,
      primaryGoal,
      targetGrowth,
      whatsappAlerts,
      emailReports,
      currentBalance
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    if (!businessName || !startingCapital) {
      return res.status(400).json({ error: 'businessName and startingCapital are required' });
    }
    const salt = await bcrypt.genSalt(10);
    

    const user = new User({
      name,
      email,
      password,
      phoneNumber,
      currency,
      whatsappEnabled,
      isSetupComplete,
      businessSetup: {
        businessName,
        businessType,
        location,
        startingCapital,
        monthlyRevenue,
        monthlyExpenses,
        primaryGoal,
        targetGrowth,
        whatsappAlerts,
        emailReports
      },
      currentBalance: currentBalance ?? startingCapital
    });

    await user.save();
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        currency: user.currency,
        whatsappEnabled: user.whatsappEnabled,
        isSetupComplete: user.isSetupComplete,
        businessSetup: user.businessSetup,
        currentBalance: user.currentBalance
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        businessName: user.businessSetup?.businessName,
        currentBalance: user.currentBalance
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get user profile
export const getProfile = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update user profile
export const updateProfile = async (req: Request & { user?: any }, res: Response) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ message: 'Profile updated successfully', user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};