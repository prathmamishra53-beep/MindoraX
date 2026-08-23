import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'reply'
  | 'friend_request'
  | 'friend_accepted'
  | 'message'
  | 'story_view';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  type: NotificationType;
  relatedPost?: mongoose.Types.ObjectId;
  relatedStory?: mongoose.Types.ObjectId;
  relatedComment?: mongoose.Types.ObjectId;
  message: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['like', 'comment', 'reply', 'friend_request', 'friend_accepted', 'message', 'story_view'],
      required: true,
    },
    relatedPost: { type: Schema.Types.ObjectId, ref: 'Post' },
    relatedStory: { type: Schema.Types.ObjectId, ref: 'Story' },
    relatedComment: { type: Schema.Types.ObjectId, ref: 'Comment' },
    message: { type: String, required: true, maxlength: 300 },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
