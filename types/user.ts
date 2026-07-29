import type { ObjectId } from "mongodb";

export type UserRole = "user" | "admin";

export interface UserStorage {
  used_bytes: number;
  limit_bytes: number;
}

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  password_hash: string;
  avatar_url?: string | null;
  role: UserRole;
  storage: UserStorage;
  must_change_password: boolean;
  created_at: Date;
  active: boolean;
}
