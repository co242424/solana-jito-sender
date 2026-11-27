import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Load .env from the project root, not from whatever the current working directory is. */
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: resolve(projectRoot, ".env") });

/** Tokyo Block Engine (docs.jito.wtf, Low Latency Transaction Send). */
export const DEFAULT_BLOCK_ENGINE_URL =
  "https://tokyo.mainnet.block-engine.jito.wtf";

export const BLOCK_ENGINE_URL = (
  process.env.BLOCK_ENGINE_URL?.trim() || DEFAULT_BLOCK_ENGINE_URL
).replace(/\/$/, "");

/** Optional UUID from a Jito whitelist ticket. Never hardcode a key here. */
export const JITO_UUID = process.env.JITO_UUID?.trim() || undefined;

export const FETCH_TIMEOUT_MS = 15_000;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

/** Lazy so getTipAccounts-only calls do not require a wallet or RPC. */
export function getRpcUrl(): string {
  return requiredEnv("RPC_URL");
}

export function getKeypairPath(): string {
  return requiredEnv("KEYPAIR_PATH");
}

/** JSON-RPC headers. Adds x-jito-auth when a UUID is set. */
export function jitoHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (JITO_UUID) {
    headers["x-jito-auth"] = JITO_UUID;
  }
  return headers;
}

/** Block Engine URL + path, with ?uuid= when a UUID is set. */
export function jitoUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${BLOCK_ENGINE_URL}${normalized}`);
  if (JITO_UUID) {
    url.searchParams.set("uuid", JITO_UUID);
  }
  return url.toString();
}
