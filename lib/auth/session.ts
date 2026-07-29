import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { sessionsCollection } from "@/lib/db/collections";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  verifySessionToken,
} from "@/lib/auth/token";
import type { SessionPayload } from "@/types/session";
import type { User } from "@/types/user";

// Deja registrado el ingreso del usuario y devuelve el id de la sesión creada
export async function createSession(user: User, request: Request) {
  const sessions = await sessionsCollection();
  const now = new Date();
  const _id = new ObjectId();

  await sessions.insertOne({
    _id,
    user_id: user._id,
    refresh_token: randomBytes(32).toString("hex"),
    user_agent: request.headers.get("user-agent"),
    ip: getClientIp(request),
    created_at: now,
    last_seen_at: now,
    expires_at: new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000),
    active: true,
  });

  return _id;
}

export function buildSessionPayload(user: User, sessionId: ObjectId): SessionPayload {
  return {
    sub: user._id.toString(),
    sid: sessionId.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    must_change_password: user.must_change_password,
  };
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

// La sesión se marca inactiva en vez de borrarse para conservar el historial de ingresos
export async function revokeSession(sessionId: string) {
  const sessions = await sessionsCollection();
  await sessions.updateOne({ _id: new ObjectId(sessionId) }, { $set: { active: false } });
}

// Al restablecer la contraseña se cierran todas las sesiones abiertas del usuario
export async function revokeUserSessions(userId: ObjectId) {
  const sessions = await sessionsCollection();
  await sessions.updateMany({ user_id: userId, active: true }, { $set: { active: false } });
}

// La cookie solo vale si su sesión sigue activa en base de datos
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const payload = await verifySessionToken(token);
    return (await isSessionActive(payload.sid)) ? payload : null;
  } catch {
    return null;
  }
}

async function isSessionActive(sessionId: string) {
  const sessions = await sessionsCollection();
  const session = await sessions.findOne({ _id: new ObjectId(sessionId), active: true });
  return Boolean(session && session.expires_at > new Date());
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}
