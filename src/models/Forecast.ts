import mongoose, { Document, Schema, Types } from 'mongoose';

interface IScenarioChange {
  type: string;
  amount: number;
  description?: string;
}

interface IScenario {
  name: string;
  changes: IScenarioChange[];
  resultingBalance: number;
}

export interface IForecast extends Document {
  userId: Types.ObjectId;
  period: string;
  predictedIncome: number;
  predictedExpenses: number;
  predictedBalance: number;
  confidence?: number;
  scenarios?: IScenario[];
  createdAt?: Date;
}

const scenarioChangeSchema = new Schema<IScenarioChange>({
  type: { type: String },
  amount: { type: Number },
  description: { type: String }
}, { _id: false });

const scenarioSchema = new Schema<IScenario>({
  name: { type: String },
  changes: [scenarioChangeSchema],
  resultingBalance: { type: Number }
}, { _id: false });

const forecastSchema = new Schema<IForecast>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  period: { type: String, required: true },
  predictedIncome: { type: Number, required: true },
  predictedExpenses: { type: Number, required: true },
  predictedBalance: { type: Number, required: true },
  confidence: { type: Number, min: 0, max: 100 },
  scenarios: [scenarioSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IForecast>('Forecast', forecastSchema);