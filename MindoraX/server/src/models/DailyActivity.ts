import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyActivity extends Document {
  user: mongoose.Types.ObjectId;
  date: string; // 'YYYY-MM-DD' UTC
  tasks: {
    posted: boolean;
    liked: boolean;
    commented: boolean;
    updatedMood: boolean;
  };
  bonusAwarded: boolean;
  streakCounted: boolean;
  createdAt: Date;
}

const dailyActivitySchema = new Schema<IDailyActivity>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    tasks: {
      posted: { type: Boolean, default: false },
      liked: { type: Boolean, default: false },
      commented: { type: Boolean, default: false },
      updatedMood: { type: Boolean, default: false },
    },
    bonusAwarded: { type: Boolean, default: false },
    streakCounted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique: one record per user per day
dailyActivitySchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model<IDailyActivity>('DailyActivity', dailyActivitySchema);
