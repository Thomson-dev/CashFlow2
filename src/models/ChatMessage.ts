import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IChatMessage extends Document {
  userId: Types.ObjectId;
  role: 'user' | 'assistant';
  message: string;
  context?: any;
  createdAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  message: { type: String, required: true },
  context: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
