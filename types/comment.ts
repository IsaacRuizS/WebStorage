import type { ObjectId } from "mongodb";

export interface Comment {
  _id: ObjectId;
  file_id: ObjectId;
  author_id: ObjectId;
  text: string;
  created_at: Date;
  resolved: boolean;
}