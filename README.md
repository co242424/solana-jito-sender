# solana-jito-sender

Minimal TypeScript example for landing a **single** Solana transaction through the [Jito Block Engine](https://docs.jito.wtf/lowlatencytxnsend/) JSON-RPC API. It covers optional UUID auth, tip account selection, a priority fee, and confirmation on a regular Solana RPC.

## 한국어

Jito Block Engine로 트랜잭션 하나를 보내는 TypeScript 예제입니다. UUID 인증(`x-jito-auth` / `?uuid=`)과 `sendTransaction`만 다룹니다. 번들 경매용 멀티 트랜잭션이나 멀티 지갑 로직은 없습니다.

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

## License

MIT. See [LICENSE](LICENSE).
