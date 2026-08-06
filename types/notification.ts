import type { ObjectId } from "mongodb";

export type NotificationType = "share" | "comment" | "system" | "storage" | "access_request";

export interface Notification {
  _id: ObjectId;
  user_id: ObjectId;
  type: NotificationType;
  message: string;
  link?: string | null;
  read: boolean;
  created_at: Date;
}
