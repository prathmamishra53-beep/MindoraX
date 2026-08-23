import mongoose, { Document, Schema } from 'mongoose';

export type RelationshipStatus = 'pending' | 'accepted' | 'blocked';

export interface IRelationship extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: RelationshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const relationshipSchema = new Schema<IRelationship>(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
  },
  { timestamps: true }
);

// Prevent duplicate relationships — compound unique index
relationshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Static helpers
relationshipSchema.statics.areFriends = async function (userAId: string, userBId: string): Promise<boolean> {
  const rel = await this.findOne({
    $or: [
      { requester: userAId, recipient: userBId },
      { requester: userBId, recipient: userAId },
    ],
    status: 'accepted',
  });
  return !!rel;
};

relationshipSchema.statics.getFriendIds = async function (userId: string): Promise<string[]> {
  const rels = await this.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: 'accepted',
  });
  return rels.map((r: IRelationship) => {
    const rid = r.requester.toString();
    const uid = userId.toString();
    return rid === uid ? r.recipient.toString() : rid;
  });
};

interface IRelationshipModel extends mongoose.Model<IRelationship> {
  areFriends(userAId: string, userBId: string): Promise<boolean>;
  getFriendIds(userId: string): Promise<string[]>;
}

export default mongoose.model<IRelationship, IRelationshipModel>('Relationship', relationshipSchema);
