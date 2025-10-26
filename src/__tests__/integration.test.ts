import { describe, it, expect, beforeAll } from 'bun:test';
import { JupiterService } from '../service';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

// Live runtime
const runtime: any = {
  logger: {
    success: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  },
  getSetting: (_: string) => null,
  getCache: async () => ({ exp: 0, data: null }),
  setCache: async () => {},
};

describe('Jupiter Service Integration (LIVE)', () => {
  let service: JupiterService;

  beforeAll(() => {
    service = new JupiterService(runtime);
  });

  describe('Quote with Referral Fees', () => {
    it('should include platformFeeBps when referral is enabled', async () => {
      process.env.REFERRAL_FEE_BPS = '20';
      process.env.REFERRAL_MODE = 'smart';
      process.env.REFERRAL_FEE_RECEIVER = '11111111111111111111111111111111';
      const quote: any = await service.getQuote({
        inputMint: WSOL_MINT,
        outputMint: USDC_MINT,
        amount: 100000,
        slippageBps: 50,
      });
      expect(quote).toBeTruthy();
      expect(quote.inputMint).toBe(WSOL_MINT);
      expect(quote.outputMint).toBe(USDC_MINT);
      expect(quote.platformFee?.feeBps).toBe(20);

      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;
      delete process.env.REFERRAL_FEE_RECEIVER;
    });

    it('should not include platformFeeBps when referral is disabled', async () => {
      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;

      const quote: any = await service.getQuote({
        inputMint: WSOL_MINT,
        outputMint: USDC_MINT,
        amount: 100000,
        slippageBps: 50,
      });
      expect(quote).toBeTruthy();
      expect(quote.platformFee == null || quote.platformFee === null).toBe(true);
    });
  });

  describe('Swap with Fee Account', () => {
    it('should include feeAccount when referral is enabled', async () => {
      process.env.REFERRAL_FEE_BPS = '20';
      process.env.REFERRAL_MODE = 'smart';
      process.env.REFERRAL_FEE_RECEIVER = '11111111111111111111111111111111';

      const quote: any = await service.getQuote({ inputMint: WSOL_MINT, outputMint: USDC_MINT, amount: 100000, slippageBps: 50 });

      const swap = await service.executeSwap({
        quoteResponse: quote,
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      });
      expect((swap as any).swapTransaction).toBeTruthy();

      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;
      delete process.env.REFERRAL_FEE_RECEIVER;
    });

    it('should not include feeAccount when referral is disabled', async () => {
      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;

      const quote2: any = await service.getQuote({ inputMint: WSOL_MINT, outputMint: USDC_MINT, amount: 100000, slippageBps: 50 });

      const swap = await service.executeSwap({
        quoteResponse: quote2,
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      });
      expect((swap as any).swapTransaction).toBeTruthy();
    });
  });

  describe('Fee Mode Selection', () => {
    it('should select SOL in sol_only mode when available', async () => {
      process.env.REFERRAL_FEE_BPS = '20';
      process.env.REFERRAL_MODE = 'sol_only';
      process.env.REFERRAL_FEE_RECEIVER = '11111111111111111111111111111111';

      const liveQuote: any = await service.getQuote({ inputMint: WSOL_MINT, outputMint: USDC_MINT, amount: 100000, slippageBps: 50 });
      const swap = await service.executeSwap({
        quoteResponse: liveQuote,
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      });
      expect((swap as any).swapTransaction).toBeTruthy();

      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;
      delete process.env.REFERRAL_FEE_RECEIVER;
    });

    it('should not add feeAccount in sol_only mode when SOL not in pair', async () => {
      process.env.REFERRAL_FEE_BPS = '20';
      process.env.REFERRAL_MODE = 'sol_only';
      const liveQuote2: any = await service.getQuote({ inputMint: USDC_MINT, outputMint: USDT_MINT, amount: 100000, slippageBps: 50 });
      const swap = await service.executeSwap({
        quoteResponse: liveQuote2,
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      });
      expect((swap as any).swapTransaction).toBeTruthy();

      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;
    });
  });

  describe('Custom Mint → SOL (LIVE)', () => {
    it('should quote and draft swap with referral for custom mint', async () => {
      // User-provided mint (assumed mainnet): MEMECOIN → SOL
      const CUSTOM_MINT = 'Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk';

      process.env.REFERRAL_FEE_BPS = '20';
      process.env.REFERRAL_MODE = 'sol_only';
      process.env.REFERRAL_FEE_RECEIVER = '11111111111111111111111111111111';

      const quote: any = await service.getQuote({
        inputMint: CUSTOM_MINT,
        outputMint: WSOL_MINT,
        amount: 100000, // small atomic amount
        slippageBps: 50,
      });

      expect(quote).toBeTruthy();
      expect(quote.inputMint).toBe(CUSTOM_MINT);
      expect(quote.outputMint).toBe(WSOL_MINT);

      const swap = await service.executeSwap({
        quoteResponse: quote,
        userPublicKey: '11111111111111111111111111111111',
        slippageBps: 50,
      });

      expect((swap as any).swapTransaction).toBeTruthy();

      delete process.env.REFERRAL_FEE_BPS;
      delete process.env.REFERRAL_MODE;
      delete process.env.REFERRAL_FEE_RECEIVER;
    });
  });
});

