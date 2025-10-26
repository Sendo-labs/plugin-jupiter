export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps: number;
}

export interface JupiterSwapParams {
  quoteResponse: { [key: string]: unknown };
  userPublicKey: string;
  slippageBps: number;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: unknown[];
  contextSlot: number;
  timeTaken: number;
}

export interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

export type FeeMode = 'sol_only' | 'smart';

export interface ReferralConfig {
  enabled: boolean;
  feeBps: number;
  mode: FeeMode;
}

export interface FeeMintSelection {
  mint: string;
  feeAccount?: string;
}
