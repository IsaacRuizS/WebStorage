import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;
const TEMPORARY_PASSWORD_LENGTH = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateTemporaryPassword() {
  return randomBytes(TEMPORARY_PASSWORD_LENGTH).toString("base64url").slice(0, TEMPORARY_PASSWORD_LENGTH);
}
