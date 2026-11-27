import { Connection } from "@solana/web3.js";
import { BLOCK_ENGINE_URL, getKeypairPath, getRpcUrl } from "./config.js";
import {
  buildLandingTransaction,
  getTipAccount,
  loadKeypair,
  sendLandingTransaction,
} from "./jito.js";

async function main(): Promise<void> {
  const payer = loadKeypair(getKeypairPath());
  const connection = new Connection(getRpcUrl(), "confirmed");
  const tipAccount = await getTipAccount();
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = buildLandingTransaction({ payer, tipAccount, blockhash });
  const signature = await sendLandingTransaction(tx);

  console.log("signature:", signature);
  console.log("block engine:", BLOCK_ENGINE_URL);
  console.log("payer:", payer.publicKey.toBase58());
  console.log("tip account:", tipAccount.toBase58());

  try {
    const confirmation = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    if (confirmation.value.err) {
      throw new Error(
        `Transaction landed but failed on-chain: ${JSON.stringify(confirmation.value.err)}`,
      );
    }
    console.log("confirmed");
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TransactionExpiredBlockheightExceededError") {
      throw new Error(
        `Transaction did not confirm before blockhash expiry (signature ${signature}). ` +
          `It may have been dropped or the tip/priority fee was too low.`,
        { cause: err },
      );
    }
    throw err;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
