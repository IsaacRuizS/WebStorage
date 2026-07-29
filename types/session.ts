import type { ObjectId } from "mongodb";
import type { UserRole } from "@/types/user";

export interface Session {
  _id: ObjectId;
  user_id: ObjectId;
  refresh_token: string;
  user_agent?: string | null;
  ip?: string | null;
  created_at: Date;
  last_seen_at?: Date | null;
  expires_at: Date;
  active: boolean;
}

// Datos que viajan firmados dentro del JWT de la cookie
export interface SessionPayload {
  sub: string;
  sid: string;
  email: string;
  name: string;
  role: UserRole;
  must_change_password: boolean;
}
