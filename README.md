# @elizaos/plugin-jupiter

Jupiter DEX integration plugin for ElizaOS with referral fee support.

## Features

- **Token Swaps**: Execute swaps via Jupiter aggregator
- **Referral Fees**: Collect platform fees on swaps (0-10%)
- **Fee Modes**: 
  - `sol_only`: Collect fees only in SOL/WSOL
  - `smart`: Prefer SOL, fallback to input mint
- **Automatic Fee Account**: Derives ATA for fee collection
- **Rate Limiting**: Built-in queue system respecting Jupiter API limits

## Installation

```bash
npm install @elizaos/plugin-jupiter
```

## Configuration

### Basic Setup

Add the plugin to your ElizaOS character:

```typescript
import { jupiterPlugin } from '@elizaos/plugin-jupiter';

export const character = {
  name: 'MyAgent',
  plugins: [jupiterPlugin],
  // ... other config
};
```

### Referral Fees (Optional)

Enable platform fees by setting environment variables:

```bash
# Platform fee in basis points (20 = 0.2%)
REFERRAL_FEE_BPS=20

# Fee collection mode: sol_only | smart (default: smart)
REFERRAL_MODE=smart

# Public key that will receive the fees (fee receiver)
# An ATA will be derived for the chosen mint
REFERRAL_FEE_RECEIVER=REPLACE_WITH_FEE_RECEIVER_PUBKEY
```

#### Fee Modes

**`sol_only`**: Collect fees only when SOL/WSOL is in the swap pair
- SOL → USDC: ✅ Fees collected in SOL
- USDC → JUP: ❌ No fees (no SOL in pair)

**`smart`**: Prefer SOL, otherwise use input mint
- SOL → USDC: ✅ Fees in SOL
- USDC → JUP: ✅ Fees in USDC

### Complete Example

```bash
# .env
REFERRAL_FEE_BPS=20
REFERRAL_MODE=smart
```

## How It Works

### Fee Collection

1. **Quote**: Plugin adds `platformFeeBps` parameter to Jupiter quote request
2. **Swap**: Plugin derives fee account (ATA) for the selected mint
3. **Execution**: Jupiter deducts fees and sends to your fee account

### Fee Account

The fee account is automatically derived as an Associated Token Account (ATA):
- Owner: Fee receiver (env `REFERRAL_FEE_RECEIVER`)
- Mint: Selected based on fee mode (SOL or input mint)

⚠️ **Important**: The fee account must exist before the swap. If it doesn't exist:
- The swap will proceed **without fees**
- A warning will be logged

To create fee accounts, users can:
- Use any Solana wallet (Phantom, Solflare, etc.)
- Call `createAssociatedTokenAccount` from `@solana/spl-token`

### Recommended backend endpoint (optional)

For production setups, we recommend a backend endpoint to ensure the fee receiver has the required ATA before swaps:

```ts
// Minimal Express endpoint to ensure fee ATA exists
// npm i express @solana/web3.js @solana/spl-token
import express from 'express';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

const app = express();
app.use(express.json());

const RPC_URL = process.env.SOLANA_RPC_URL ?? clusterApiUrl('mainnet-beta');
const FEE_PAYER = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.FEE_PAYER_SECRET_KEY!))
);

app.post('/api/fee-ata/ensure', async (req, res) => {
  try {
    const { receiver, mint } = req.body;
    if (!receiver || !mint) return res.status(400).json({ error: 'receiver and mint are required' });

    const connection = new Connection(RPC_URL, 'confirmed');
    const receiverPk = new PublicKey(receiver);
    const mintPk = new PublicKey(mint);

    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      FEE_PAYER,
      mintPk,
      receiverPk
    );

    res.json({ feeAccount: ata.address.toBase58() });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'unknown error' });
  }
});

app.listen(3000, () => console.log('fee-ata endpoint ready on :3000'));
```

Call it from your ops/scripts prior to swaps, e.g.:

```bash
curl -X POST http://localhost:3000/api/fee-ata/ensure \
  -H 'Content-Type: application/json' \
  -d '{
    "receiver": "'$REFERRAL_FEE_RECEIVER'",
    "mint": "So11111111111111111111111111111111111111112"
  }'
```

## API Reference

### JupiterService

```typescript
import { JupiterService } from '@elizaos/plugin-jupiter';

const service = new JupiterService(runtime);

// Get quote
const quote = await service.getQuote({
  inputMint: 'So11111111111111111111111111111111111111112', // WSOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: 100000, // 0.0001 SOL (in lamports)
  slippageBps: 50, // 0.5%
});

// Execute swap
const swap = await service.executeSwap({
  quoteResponse: quote,
  userPublicKey: 'USER_WALLET_ADDRESS',
  slippageBps: 50,
});
```

## Testing

```bash
# Unit tests
bun test src/__tests__/referral.test.ts

# Integration tests (mocked API)
bun test src/__tests__/integration.test.ts

# All tests
bun test

# Live E2E (example using .env.example), with optional simulation/signing
# 1) Copy .env.example to .env and set:
#    REFERRAL_FEE_BPS=20
#    REFERRAL_MODE=sol_only
#    REFERRAL_FEE_RECEIVER=<FEE_RECEIVER_PUBKEY>
#    TEST_INPUT_MINT=So11111111111111111111111111111111111111112
#    TEST_OUTPUT_MINT=Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk
#    TEST_INPUT_AMOUNT_ATOMIC=5000000   # 0.005 SOL
#    TEST_SLIPPAGE_BPS=150
#    # Optional (simulation/signing)
#    HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
#    SIGNER_SECRET_KEY=[1,2,3,...,64]
#    # SEND_TX=1  # uncomment to broadcast
# 2) Build and run E2E:
npm run build && node dist/scripts/e2e-mainnet.js
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Lint
npm run lint
```

## References

- [Jupiter Swap API](https://station.jup.ag/docs/apis/swap-api)
- [Jupiter - Add Fees To Swap](https://dev.jup.ag/docs/swap/add-fees-to-swap)
- [ElizaOS Plugin Development](https://docs.elizaos.ai/guides/create-a-plugin)

## License

MIT
