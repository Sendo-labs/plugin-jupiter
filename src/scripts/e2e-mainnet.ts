import 'dotenv/config';
import { JupiterService } from '../service';
import type { IAgentRuntime } from '@elizaos/core';
import { Connection, VersionedTransaction, Keypair, clusterApiUrl } from '@solana/web3.js';

// Minimal runtime mock for direct usage
const runtime: IAgentRuntime = {
  logger: console as any,
  getService: (() => null) as any,
  getServiceLoadPromise: (() => Promise.resolve()) as any,
  getProvider: (() => null) as any,
  getSetting: ((key: string) => process.env[key]) as any,
  getCache: (async () => ({ exp: 0, data: null })) as any,
  setCache: (async () => {}) as any,
} as unknown as IAgentRuntime;

async function main() {
  const inputMint = process.env.TEST_INPUT_MINT || 'So11111111111111111111111111111111111111112'; // WSOL
  const outputMint = process.env.TEST_OUTPUT_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
  const amount = Number(process.env.TEST_INPUT_AMOUNT_ATOMIC || '100000'); // 0.0001 SOL
  const slippageBps = Number(process.env.TEST_SLIPPAGE_BPS || '50');

  const feeBps = Number(process.env.REFERRAL_FEE_BPS || '0');
  const mode = process.env.REFERRAL_MODE || 'smart';
  const receiver = process.env.REFERRAL_FEE_RECEIVER || '';

  console.log('E2E Mainnet - Params', { inputMint, outputMint, amount, slippageBps, feeBps, mode, receiver });

  const service = new JupiterService(runtime);

  const quote = await service.getQuote({
    inputMint,
    outputMint,
    amount,
    slippageBps,
  });
  console.log('Quote ok. outAmount=', (quote as any)?.outAmount);

  const userPublicKey = process.env.E2E_USER_PUBLIC_KEY || receiver || '11111111111111111111111111111111';

  const swap = await service.executeSwap({
    quoteResponse: quote as any,
    userPublicKey,
    slippageBps,
  });
  console.log('Swap transaction drafted. keys=', Object.keys(swap));

  // Optional simulation + signing
  const rpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
  const swapTxB64 = (swap as any)?.swapTransaction;
  if (!swapTxB64) {
    console.log('No swapTransaction in response; exiting.');
    return;
  }

  const connection = new Connection(rpcUrl, 'confirmed');
  const raw = Buffer.from(swapTxB64, 'base64');
  const tx = VersionedTransaction.deserialize(raw);

  const sim = await connection.simulateTransaction(tx, { replaceRecentBlockhash: true, sigVerify: false });
  console.log('Simulation error:', sim.value.err);
  if (sim.value.logs?.length) console.log('Simulation logs:\n' + sim.value.logs.join('\n'));

  const signerSecret = process.env.SIGNER_SECRET_KEY;
  if (signerSecret) {
    try {
      const parsed = JSON.parse(signerSecret);
      const signer = Keypair.fromSecretKey(Uint8Array.from(parsed));
      tx.sign([signer]);
      if (process.env.SEND_TX === '1') {
        const sig = await connection.sendTransaction(tx, { skipPreflight: false, preflightCommitment: 'confirmed' });
        console.log('Sent signature:', sig);
        const conf = await connection.confirmTransaction(sig, 'confirmed');
        console.log('Confirmation status:', conf.value);
      } else {
        console.log('Signed locally (SEND_TX not set).');
      }
    } catch (e) {
      console.warn('SIGNER_SECRET_KEY present but failed to sign:', (e as any)?.message || e);
    }
  }
}

main().catch((e) => {
  console.error('E2E failed:', e?.message || e);
  process.exit(1);
});
