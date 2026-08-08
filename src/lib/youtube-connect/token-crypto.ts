import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Derives the 32-byte AES key used to encrypt OAuth tokens at rest. The key is
 * sourced from `YOUTUBE_TOKEN_ENCRYPTION_KEY` and falls back to the auth secret
 * so the app stays functional without extra configuration. The derived value is
 * never persisted and never exposed.
 */
function getEncryptionKey(): Buffer {
  const source = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY ?? process.env.AUTH_SECRET ?? "dev";
  return createHash("sha256").update(source).digest();
}

/**
 * Encrypts a token payload (e.g. `{ accessToken, refreshToken }`) using
 * AES-256-GCM. Returns a base64 blob of `iv || authTag || ciphertext`.
 */
export function encryptTokens(payload: unknown): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Decrypts a blob produced by `encryptTokens`. Throws when the payload has been
 * tampered with or the key has changed.
 */
export function decryptTokens<T>(blob: string): T {
  const raw = Buffer.from(blob, "base64");
  if (raw.length < IV_BYTES + TAG_BYTES) {
    throw new Error("Invalid encrypted token payload.");
  }

  const iv = raw.subarray(0, IV_BYTES);
  const authTag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
