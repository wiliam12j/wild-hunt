// Money is held as integer cents (hundredths of a credit) so sums never drift.
// Engine wins are multiples of the total bet; at bet 1 a line can pay 0.8 credits.

export const CENTS_PER_CREDIT = 100;

export const toCents = (credits: number): number => Math.round(credits * CENTS_PER_CREDIT);
export const toCredits = (cents: number): number => cents / CENTS_PER_CREDIT;

/** Credits won for a win of `multiple` × `betCredits`, in cents. */
export const winCents = (multiple: number, betCredits: number): number => toCents(multiple * betCredits);

export class Wallet {
  private cents: number;

  constructor(cents: number) {
    this.cents = cents;
  }

  get balanceCents(): number {
    return this.cents;
  }

  canAfford(cents: number): boolean {
    return cents <= this.cents;
  }

  debit(cents: number): void {
    if (!this.canAfford(cents)) throw new Error('Insufficient balance');
    this.cents -= cents;
  }

  credit(cents: number): void {
    this.cents += cents;
  }

  reset(cents: number): void {
    this.cents = cents;
  }
}
