import { toCredits } from '../state/wallet.ts';

const twoDp = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** Credits with 2 decimals, e.g. "1,234.50". */
export const formatCredits = (cents: number): string => twoDp.format(toCredits(cents));

/** Credits without decimals when whole, e.g. "15" or "0.80". */
export const formatCreditsShort = (cents: number): string =>
  cents % 100 === 0 ? whole.format(toCredits(cents)) : twoDp.format(toCredits(cents));
