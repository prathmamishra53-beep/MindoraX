import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { EmotionTag } from '../services/aiService';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  displayName: string;
  profilePicture: string;
  profilePicturePublicId?: string;
  coverPicture?: string;
  coverPicturePublicId?: string;
  bio?: string;
  location?: string;
  website?: string;
  role: string;
  vibePoints: number;
  level: number;
  streak: number;
  lastStreakDate?: Date;
  savedPosts: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  refreshToken?: string;
  loginAttempts: number;
  lockUntil?: Date;
  currentMood?: EmotionTag;
  moodUpdatedAt?: Date;
  moodDrivenFeed: boolean;
  aiTaggingEnabled: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  isAccountLocked: boolean;
}

export interface IUserModel extends Model<IUser> {
  findByCredentials(email: string, password: string): Promise<IUser>;
}

const UserSchema = new Schema<IUser, IUserModel>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    profilePicturePublicId: { type: String },
    coverPicture: { type: String, default: '' },
    coverPicturePublicId: { type: String },
    bio: { type: String, maxlength: 200 },
    location: { type: String, maxlength: 100 },
    website: { type: String, maxlength: 200 },
    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    vibePoints: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    lastStreakDate: { type: Date },
    savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    refreshToken: {
      type: String,
      select: false,
    },
    loginAttempts: {
      type: Number,
      required: true,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    currentMood: {
      type: String,
      enum: ['happy','sad','angry','anxious','calm','excited','grateful','frustrated','motivated','relaxed','funny','inspiring','neutral'],
      default: null,
    },
    moodUpdatedAt: { type: Date },
    moodDrivenFeed: { type: Boolean, default: false },
    aiTaggingEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

UserSchema.virtual('isAccountLocked').get(function (this: IUser) {
  return this.lockUntil ? this.lockUntil.getTime() > Date.now() : false;
});

UserSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.isLocked = function (): boolean {
  return this.lockUntil ? this.lockUntil.getTime() > Date.now() : false;
};

UserSchema.statics.findByCredentials = async function (email: string, password: string): Promise<IUser> {
  const user = await this.findOne({ email }).select('+password');
  
  if (!user) {
    const error: any = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  if (user.isLocked()) {
    const error: any = new Error('Account is locked. Please try again later.');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // lock for 15 mins
    }
    await user.save();
    const error: any = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  if (user.loginAttempts > 0) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  return user;
};

const User = mongoose.model<IUser, IUserModel>('User', UserSchema);

export default User;

