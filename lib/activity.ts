import { ObjectId } from "mongodb";
import { activityLogsCollection } from "@/lib/db/collections";
import type { ActivityAction, ActivityLog } from "@/types/activity-log";

interface LogActivityInput {
  userId: ObjectId;
  action: ActivityAction;
  resourceId?: ObjectId | null;
  resourceType?: "file" | "folder" | null;
  resourceName?: string | null;
  ip?: string | null;
}

function toEntry(input: LogActivityInput): ActivityLog {
  return {
    _id: new ObjectId(),
    user_id: input.userId,
    action: input.action,
    resource_id: input.resourceId ?? null,
    resource_type: input.resourceType ?? null,
    resource_name: input.resourceName ?? null,
    ip: input.ip ?? null,
    created_at: new Date(),
  };
}

export async function logActivity(input: LogActivityInput) {
  await (await activityLogsCollection()).insertOne(toEntry(input));
}

export async function logActivityMany(inputs: LogActivityInput[]) {
  if (inputs.length === 0) return;
  await (await activityLogsCollection()).insertMany(inputs.map(toEntry));
}
