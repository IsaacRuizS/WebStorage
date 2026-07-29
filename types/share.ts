import type { ObjectId } from "mongodb";
import type { Permission, ResourceType } from "@/types/resource";

export interface Share {
  _id: ObjectId;
  resource_id: ObjectId;
  resource_type: ResourceType;
  owner_id: ObjectId;
  shared_with: ObjectId | null;
  permission: Permission;
  link_token: string | null;
  created_at: Date;
  expires_at?: Date | null;
}
