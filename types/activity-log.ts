import type { ObjectId } from "mongodb";

export type ActivityAction =
  | "login"
  | "logout"
  | "upload"
  | "download"
  | "delete"
  | "share"
  | "rename"
  | "move"
  | "restore";

export interface ActivityLog {
  _id: ObjectId;
  user_id: ObjectId;
  action: ActivityAction;
  resource_id: ObjectId | null;
  resource_type: "file" | "folder" | null;
  resource_name: string | null;
  ip: string | null;
  created_at: Date;
}
