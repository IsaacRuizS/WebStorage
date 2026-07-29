import { getDb } from "@/lib/db/mongodb";
import type { AccessRequest } from "@/types/access-request";
import type { DriveFile } from "@/types/file";
import type { FileVersion } from "@/types/file-version";
import type { Folder } from "@/types/folder";
import type { Session } from "@/types/session";
import type { Share } from "@/types/share";
import type { User } from "@/types/user";

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
