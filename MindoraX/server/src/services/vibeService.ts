import User from '../models/User';
import DailyActivity from '../models/DailyActivity';

// ── Level thresholds ────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, name: 'Newbie',     minPoints: 0 },
  { level: 2, name: 'Explorer',   minPoints: 100 },
  { level: 3, name: 'Active',     minPoints: 300 },
  { level: 4, name: 'Engaged',    minPoints: 600 },
  { level: 5, name: 'Vibrant',    minPoints: 1000 },
  { level: 6, name: 'Influencer', minPoints: 1500 },
  { level: 7, name: 'Legend',     minPoints: 2500 },
];

export const POINT_REWARDS = {
  CREATE_POST:    10,
  LIKE_POST:       2,
  COMMENT:         5,
  UPDATE_MOOD:     3,
  DAILY_BONUS:    25,
};

export function getLevelFromPoints(points: number) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (points >= lvl.minPoints) current = lvl;
  }
  const nextIndex = LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = LEVELS[nextIndex] || null;
  const progress = next
    ? Math.round(((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100)
    : 100;
  return { ...current, next, progress };
}

// ── Get or create today's DailyActivity record ────────────────────────────
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD' UTC
}

async function getOrCreateDaily(userId: string): Promise<IDailyActivityDoc> {
  const date = getTodayDate();
  let activity = await DailyActivity.findOne({ user: userId, date });
  if (!activity) {
    activity = await DailyActivity.create({ user: userId, date });
  }
  return activity as any;
}

// ── Award points and update user level ───────────────────────────────────
async function awardPoints(userId: string, points: number): Promise<void> {
  const user = await User.findById(userId).select('vibePoints level');
  if (!user) return;
  user.vibePoints = (user.vibePoints || 0) + points;
  const lvl = getLevelFromPoints(user.vibePoints);
  user.level = lvl.level;
  await user.save();
}

// ── Check if all tasks done → award daily bonus ──────────────────────────
async function checkDailyBonus(userId: string, activity: any): Promise<void> {
  if (activity.bonusAwarded) return;
  const { posted, liked, commented, updatedMood } = activity.tasks;
  if (posted && liked && commented && updatedMood) {
    activity.bonusAwarded = true;
    // Update streak
    const user = await User.findById(userId).select('streak lastStreakDate vibePoints level');
    if (user) {
      const today = getTodayDate();
      const lastDate = user.lastStreakDate ? new Date(user.lastStreakDate).toISOString().split('T')[0] : null;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastDate === yesterday) {
        user.streak = (user.streak || 0) + 1;
      } else if (lastDate !== today) {
        user.streak = 1;
      }
      user.lastStreakDate = new Date();
      user.vibePoints = (user.vibePoints || 0) + POINT_REWARDS.DAILY_BONUS;
      const lvl = getLevelFromPoints(user.vibePoints);
      user.level = lvl.level;
      await user.save();
    }
    activity.streakCounted = true;
    await activity.save();
  }
}

// ── Public task completion functions (call from controllers) ──────────────

export async function onPostCreated(userId: string): Promise<void> {
  const activity = await getOrCreateDaily(userId);
  if (!activity.tasks.posted) {
    activity.tasks.posted = true;
    await activity.save();
    await awardPoints(userId, POINT_REWARDS.CREATE_POST);
    await checkDailyBonus(userId, activity);
  }
}

export async function onPostLiked(userId: string): Promise<void> {
  const activity = await getOrCreateDaily(userId);
  if (!activity.tasks.liked) {
    activity.tasks.liked = true;
    await activity.save();
    await awardPoints(userId, POINT_REWARDS.LIKE_POST);
    await checkDailyBonus(userId, activity);
  }
}

export async function onCommented(userId: string): Promise<void> {
  const activity = await getOrCreateDaily(userId);
  if (!activity.tasks.commented) {
    activity.tasks.commented = true;
    await activity.save();
    await awardPoints(userId, POINT_REWARDS.COMMENT);
    await checkDailyBonus(userId, activity);
  }
}

export async function onMoodUpdated(userId: string): Promise<void> {
  const activity = await getOrCreateDaily(userId);
  if (!activity.tasks.updatedMood) {
    activity.tasks.updatedMood = true;
    await activity.save();
    await awardPoints(userId, POINT_REWARDS.UPDATE_MOOD);
    await checkDailyBonus(userId, activity);
  }
}

type IDailyActivityDoc = any; // avoid circular import issue
