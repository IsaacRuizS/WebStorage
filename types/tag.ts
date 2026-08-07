import type { ObjectId } from "mongodb";

export interface Tag {
  _id: ObjectId;
  owner_id: ObjectId;
  name: string;
  color: string;
}