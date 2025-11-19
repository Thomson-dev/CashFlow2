import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Business setup subdocument interface
export interface IBusinessSetup {
  businessName: string;
  businessType?: string;
  location?: string;
  startingCapital: number;
  monthlyRevenue?: number;
  monthlyExpenses?: number;
  primaryGoal?: string;
  targetGrowth?: string;
  whatsappAlerts?: boolean;
  emailReports?: boolean;
}

// User document interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  currency?: string;
  whatsappEnabled?: boolean;
  isSetupComplete?: boolean;
  businessSetup?: IBusinessSetup;
  currentBalance?: number;
  transactions?: mongoose.Types.ObjectId[];
  createdAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Business setup schema
const businessSetupSchema = new Schema<IBusinessSetup>({
  businessName: { type: String, required: true },
  businessType: String,
  location: String,
  startingCapital: { type: Number, required: true },
  monthlyRevenue: Number,
  monthlyExpenses: Number,
  primaryGoal: String,
  targetGrowth: String,
  whatsappAlerts: { type: Boolean, default: false },
  emailReports: { type: Boolean, default: false }
}, { _id: false });

// User schema
const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phoneNumber: String,
  currency: { type: String, default: '₦' },
  whatsappEnabled: { type: Boolean, default: false },
  isSetupComplete: { type: Boolean, default: false },
  businessSetup: businessSetupSchema,
  currentBalance: { type: Number, default: 0 },
  transactions: [{ type: Schema.Types.ObjectId, ref: 'Transaction' }],
  createdAt: { type: Date, default: Date.now }
});

// Password hashing middleware
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Password comparison method
userSchema.methods.comparePassword = function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;