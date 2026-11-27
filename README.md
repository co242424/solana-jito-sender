# solana-jito-sender

Minimal TypeScript example for landing a **single** Solana transaction through the [Jito Block Engine](https://docs.jito.wtf/lowlatencytxnsend/) JSON-RPC API. It covers optional UUID auth, tip account selection, a priority fee, and confirmation on a regular Solana RPC.

## What it does

1. Loads a local keypair from `KEYPAIR_PATH`
2. Calls `getTipAccounts` on `/api/v1/getTipAccounts` and picks one account at random
3. Builds one `VersionedTransaction`: compute-budget priority fee + memo + a 1000-lamport tip
4. POSTs it as base64 to `/api/v1/transactions` (`sendTransaction`), adding the `x-jito-auth` header and `?uuid=` query parameter when `JITO_UUID` is set
5. Prints the signature and confirms it on your regular Solana RPC

Tokyo is the default Block Engine region. Without a UUID, the documented default rate limit is 1 request per second per IP per region. A 429 means you should slow down or request a UUID from the Jito Discord ticket.

This example does not submit multi-transaction bundles.

## Setup

Requires Node.js 20 or later.

```bash
git clone https://github.com/co242424/solana-jito-sender.git
cd solana-jito-sender
cp .env.example .env
npm install
npx tsc --noEmit
```

Edit `.env` using the comments in `.env.example`:

- `RPC_URL` — a Solana RPC endpoint (Helius, Triton, public, etc.)
- `KEYPAIR_PATH` — path to a local keypair file (a `solana-keygen` JSON byte array, or a base58 secret key). Never commit this file.
- `BLOCK_ENGINE_URL` — defaults to `https://tokyo.mainnet.block-engine.jito.wtf`
- `JITO_UUID` — optional whitelist UUID. Leave it empty to use the default 1 rps / IP limit.

## Usage

```bash
npm run send
```

Official references from the Jito low-latency send docs:

- Tokyo Block Engine: `https://tokyo.mainnet.block-engine.jito.wtf`
- Auth header: `x-jito-auth: <uuid>`
- Auth query: `/api/v1/transactions?uuid=<uuid>`
- Minimum documented tip: 1000 lamports (plus a priority fee during congestion)

## Safety

- Use a burner wallet with a small SOL balance for tests.
- Never commit a private key, seed phrase, `.env` file, or UUID. `.gitignore` already ignores `.env` and `*.json` keypair files (`package.json`, `package-lock.json`, and `tsconfig.json` are kept).
- Never paste a private key, seed phrase, or UUID into Discord, git, or chat.
- This example only sends a memo + tip from one wallet. It is not a launch, snipe, or bundle tool.

## Mainnet test results (2026-11-27)

Sent with `npm run send` through the Tokyo block engine (`https://tokyo.mainnet.block-engine.jito.wtf`), default unauthenticated rate limit, from a burner test wallet. Each transaction includes a Jito tip transfer (1000 lamports) to a tip account returned by `getTipAccounts`. All landed and finalized with no errors.

| # | Signature |
|---|---|
| 1 | [49TzZArZ...](https://solscan.io/tx/49TzZArZcz43caydWPMQnwVQ5KxApWPZTnBhU26FgxPv4J4esH9t8ZymKgEfY3HBpYPKMLpvP1Gv11hKdYcQeweq) |
| 2 | [kW9wV5gL...](https://solscan.io/tx/kW9wV5gL2ecimnKHGRNLAHxYR1sS5cXiTn8zaG5YqL3dANcQuN6NdaC8rhWP7RNj2dy1ohs9Hd9hmE6RsLMW8bh) |
| 3 | [2imutN8h...](https://solscan.io/tx/2imutN8hdrJx4DSwrsVpbjjBjKNdo4K8j8CiUeAkPs2r3R4AuYms1pWWVg6x4tm6mzGXmm6uNB2D2SHoc54bgYr2) |
| 4 | [BDEPH3gT...](https://solscan.io/tx/BDEPH3gTxsmJrKQ3hZ79n9YUKRMCgCEpzdoSZgSLhYbEtDNgdpphcwWR6GCN9QHXLJCzqfmRXuNGVrfEALQ9jkN) |
| 5 | [DKPNeX24...](https://solscan.io/tx/DKPNeX24JnAN8KjVfqRCHyjxsg7qmkePv6ouMdGA8eLAuuN9d58Jq2DBp9mF2w5ptLbe23FDyFvT7Zsv2Sb8Exd) |
| 6 | [svRDXkzz...](https://solscan.io/tx/svRDXkzzEhpvL2SJ5uhexpJKTwahTqV35LN8kPySk4Lfy1yPPA7Adhpo44ghMsznBhSezb8t2egL8x5KD6z1gSo) |
| 7 | [5aBG92C7...](https://solscan.io/tx/5aBG92C7Wr2wLStrYdXBuWe4DqsaZ9LtSGeS2k68Azicvtc8DhsS7AZC8V7oRj4jZbZBGsrGHVa66gCk2xudHwum) |

Test wallet history: https://solscan.io/account/6Vpc8MS89KkXBjgHipwsMkzXy1zy76BpXBahWjuF58LB

Next step: request a Jito UUID for higher rate limits (`JITO_UUID` in `.env`).

## License

MIT. See [LICENSE](LICENSE).
