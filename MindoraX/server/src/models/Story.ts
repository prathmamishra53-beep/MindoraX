import mongoose, { Document, Schema } from 'mongoose';

export interface IStory extends Document {
  author: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaPublicId: string;
  mediaType: 'image' | 'video';
  text?: string;
  privacy: 'public' | 'friends';
  viewers: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaUrl: { type: String, required: true },
    mediaPublicId: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    text: { type: String, maxlength: 200, trim: true },
    privacy: { type: String, enum: ['public', 'friends'], default: 'friends' },
    viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes documents when expiresAt is reached
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ author: 1, createdAt: -1 });

export default mongoose.model<IStory>('Story', storySchema);
