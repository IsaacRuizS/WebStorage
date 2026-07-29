import type { ObjectId } from "mongodb";
import type { Permission, ResourceType } from "@/types/resource";

export type AccessRequestStatus = "pending" | "approved" | "rejected";

export interface AccessRequest {
  _id: ObjectId;
  resource_id: ObjectId;
  resource_type: ResourceType;
  requester_id: ObjectId;
  owner_id: ObjectId;
  requested_permission: Permission;
  status: AccessRequestStatus;
  message?: string | null;
  created_at: Date;
  responded_at?: Date | null;
}
