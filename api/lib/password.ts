import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): boolean {
  // bcrypt hashes start with $2; anything else is a legacy/unknown format
  if (!hash.startsWith("$2")) return false;
  return bcrypt.compareSync(plain, hash);
}
