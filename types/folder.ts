import type { ObjectId } from "mongodb";

export interface Folder {
  _id: ObjectId;
  name: string;
  owner_id: ObjectId;
  parent_id: ObjectId | null;
  path: string;
  created_at: Date;
  updated_at?: Date | null;
  in_trash: boolean;
}
