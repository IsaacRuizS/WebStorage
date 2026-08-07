import { getDb } from "@/lib/db/mongodb";
import type { AccessRequest } from "@/types/access-request";
import type { ActivityLog } from "@/types/activity-log";
import type { DriveFile } from "@/types/file";
import type { FileVersion } from "@/types/file-version";
import type { Folder } from "@/types/folder";
import type { Notification } from "@/types/notification";
import type { Session } from "@/types/session";
import type { Share } from "@/types/share";
import type { User } from "@/types/user";
import type { Comment } from "@/types/comment";
import type { Tag } from "@/types/tag";

export async function usersCollection() {
  return (await getDb()).collection<User>("users");
}

export async function sessionsCollection() {
  return (await getDb()).collection<Session>("sessions");
}

export async function foldersCollection() {
  return (await getDb()).collection<Folder>("folders");
}

export async function filesCollection() {
  return (await getDb()).collection<DriveFile>("files");
}

export async function fileVersionsCollection() {
  return (await getDb()).collection<FileVersion>("file_versions");
}

export async function sharesCollection() {
  return (await getDb()).collection<Share>("shares");
}

export async function accessRequestsCollection() {
  return (await getDb()).collection<AccessRequest>("access_requests");
}

export async function activityLogsCollection() {
  return (await getDb()).collection<ActivityLog>("activity_logs");
}

export async function notificationsCollection() {
  return (await getDb()).collection<Notification>("notifications");
}

export async function commentsCollection() {
  return (await getDb()).collection<Comment>("comments");
}

export async function tagsCollection() {
  return (await getDb()).collection<Tag>("tags");
}
