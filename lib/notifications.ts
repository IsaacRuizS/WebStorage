import { ObjectId } from "mongodb";
import { notificationsCollection } from "@/lib/db/collections";
import type { Notification, NotificationType } from "@/types/notification";

interface CreateNotificationInput {
  userId: ObjectId;
  type: NotificationType;
  message: string;
  link?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  const notification: Notification = {
    _id: new ObjectId(),
    user_id: input.userId,
    type: input.type,
    message: input.message,
    link: input.link ?? null,
    read: false,
    created_at: new Date(),
  };

  await (await notificationsCollection()).insertOne(notification);
}
