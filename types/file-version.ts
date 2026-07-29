import type { ObjectId } from "mongodb";

export interface FileVersion {
  _id: ObjectId;
  file_id: ObjectId;
  version: number;
  size_bytes: number;
  storage_key: string;
  author_id: ObjectId;
  created_at: Date;
}
