import Notification, { NotificationType } from '../models/Notification';
import { getIO } from '../socket/index';

export async function createNotification({
  recipientId,
  actorId,
  type,
  message,
  relatedPost,
  relatedStory,
  relatedComment,
}: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  message: string;
  relatedPost?: string;
  relatedStory?: string;
  relatedComment?: string;
}): Promise<void> {
  // Don't notify yourself
  if (recipientId === actorId) return;

  const notification = await Notification.create({
    recipient: recipientId,
    actor: actorId,
    type,
    message,
    relatedPost: relatedPost || undefined,
    relatedStory: relatedStory || undefined,
    relatedComment: relatedComment || undefined,
  });

  await notification.populate('actor', 'username displayName profilePicture');

  // Emit in real-time to recipient's notification room
  try {
    const io = getIO();
    io.of('/notifications').to(`notif:${recipientId}`).emit('new-notification', notification);
  } catch {
    // Socket might not be initialized in tests — ignore
  }
}
