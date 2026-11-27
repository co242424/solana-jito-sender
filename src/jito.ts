import fs from "node:fs";
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import {
  FETCH_TIMEOUT_MS,
  getKeypairPath,
  jitoHeaders,
  jitoUrl,
} from "./config.js";

export const TIP_LAMPORTS = 1_000; // Jito documented minimum tip
export const CU_LIMIT = 50_000;
export const CU_PRICE_MICRO_LAMPORTS = 50_000;
export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);
export const MEMO_TEXT = "jito-sender landing test";

export type JsonRpcBody<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
};

export type JitoRpcError = Error & {
  status?: number;
  bodyText?: string;
  rpcError?: JsonRpcBody<unknown>["error"];
};

export function loadKeypair(path = getKeypairPath()): Keypair {
  if (!fs.existsSync(path)) {
    throw new Error(
      `Keypair file not found: ${path}. Set KEYPAIR_PATH to a local keypair JSON or base58 file.`,
    );
  }
  const raw = fs.readFileSync(path, "utf8").trim();
  if (!raw) {
    throw new Error(`Keypair file is empty: ${path}`);
  }
  try {
    if (raw.startsWith("[")) {
      const bytes = Uint8Array.from(JSON.parse(raw) as number[]);
      return Keypair.fromSecretKey(bytes);
    }
    return Keypair.fromSecretKey(bs58.decode(raw));
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read keypair at ${path}: ${reason}`);
  }
}

export async function jitoRpc<T>(
  path: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const res = await fetch(jitoUrl(path), {
    method: "POST",
    headers: jitoHeaders(),
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const raw = await res.text();
  let body: JsonRpcBody<T> | undefined;
  try {
    body = raw ? (JSON.parse(raw) as JsonRpcBody<T>) : undefined;
  } catch {
    body = undefined;
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after") ?? "not set";
    throw jitoError(
      `Jito ${method} rate-limited (429). Retry-After: ${retryAfter}. ` +
        `Default limit is 1 request/sec per IP without a UUID. Body: ${clip(raw)}`,
      res.status,
      raw,
      body?.error,
    );
  }

  if (!res.ok || body?.error || body === undefined) {
    const detail = body?.error
      ? `${body.error.code} ${body.error.message}`
      : clip(raw) || `${res.status} ${res.statusText}`;
    throw jitoError(
      `Jito ${method} failed (${res.status}): ${detail}`,
      res.status,
      raw,
      body?.error,
    );
  }

  if (body.result === undefined) {
    throw jitoError(
      `Jito ${method} returned no result (${res.status}): ${clip(raw)}`,
      res.status,
      raw,
      body.error,
    );
  }
  return body.result;
}

export async function getTipAccount(): Promise<PublicKey> {
  const accounts = await getTipAccounts();
  const pick = accounts[Math.floor(Math.random() * accounts.length)]!;
  return new PublicKey(pick);
}

export async function getTipAccounts(): Promise<string[]> {
  const accounts = await jitoRpc<string[]>(
    "/api/v1/getTipAccounts",
    "getTipAccounts",
    [],
  );
  if (!accounts.length) {
    throw new Error("getTipAccounts returned an empty list");
  }
  return accounts;
}

/** Build the exact one-transaction landing payload this project sends. */
export function buildLandingTransaction(args: {
  payer: Keypair;
  tipAccount: PublicKey;
  blockhash: string;
}): VersionedTransaction {
  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: CU_LIMIT }),
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: CU_PRICE_MICRO_LAMPORTS,
    }),
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [],
      data: Buffer.from(MEMO_TEXT, "utf8"),
    }),
    SystemProgram.transfer({
      fromPubkey: args.payer.publicKey,
      toPubkey: args.tipAccount,
      lamports: TIP_LAMPORTS,
    }),
  ];

  const message = new TransactionMessage({
    payerKey: args.payer.publicKey,
    recentBlockhash: args.blockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([args.payer]);
  return tx;
}

export async function sendLandingTransaction(
  tx: VersionedTransaction,
): Promise<string> {
  const encoded = Buffer.from(tx.serialize()).toString("base64");
  return jitoRpc<string>("/api/v1/transactions", "sendTransaction", [
    encoded,
    { encoding: "base64" },
  ]);
}

function clip(raw: string, max = 300): string {
  if (!raw) return "";
  return raw.length > max ? `${raw.slice(0, max)}…` : raw;
}

function jitoError(
  message: string,
  status: number,
  bodyText: string,
  rpcError?: JsonRpcBody<unknown>["error"],
): JitoRpcError {
  const err = new Error(message) as JitoRpcError;
  err.status = status;
  err.bodyText = bodyText;
  err.rpcError = rpcError;
  return err;
}
