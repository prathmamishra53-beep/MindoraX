import mongoose, { Document, Schema } from 'mongoose';

export type PostPrivacy = 'public' | 'friends' | 'private';

export interface IPost extends Document {
  author: mongoose.Types.ObjectId;
  content: string;
  mediaUrls: string[];
  mediaPublicIds: string[];
  privacy: PostPrivacy;
  tags: string[];
  likes: mongoose.Types.ObjectId[];
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
  emotionTags: string[];
  sentiment: string;
  sentimentScore: number;
  summary: string;
  aiProcessed: boolean;
}

const postSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: [2000, 'Content cannot exceed 2000 characters'] },
    mediaUrls: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 4,
        message: 'Maximum 4 media items allowed',
      },
    },
    mediaPublicIds: {
      type: [String],
      default: [],
    },
    privacy: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 10,
        message: 'Maximum 10 tags allowed',
      },
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    emotionTags: {
      type: [String],
      enum: ['happy','sad','angry','anxious','calm','excited','grateful','frustrated','motivated','relaxed','funny','inspiring','neutral'],
      default: [],
    },
    sentiment: { type: String, enum: ['positive','negative','neutral'], default: 'neutral' },
    sentimentScore: { type: Number, default: 0 },
    summary: { type: String, default: '' },
    aiProcessed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for efficient feed queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ privacy: 1, createdAt: -1 });
postSchema.index({ emotionTags: 1, createdAt: -1 });

export default mongoose.model<IPost>('Post', postSchema);
