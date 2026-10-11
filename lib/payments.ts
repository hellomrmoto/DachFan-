// Payment processor seam.
//
// Adult content is banned by Stripe/PayPal and every mainstream processor.
// Production integrates a high-risk processor (CCBill, Segpay, Epoch) here.
// The app only ever talks to this interface, so swapping providers means
// writing one adapter — no changes to dispatch, ledger, or session code.

export interface PaymentProcessor {
  /** Reserve funds on the buyer's payment method. Returns an auth id. */
  authorizeHold(amountCents: number, buyerRef: string): Promise<{ authId: string }>;
  /** Capture up to the held amount. */
  capture(authId: string, amountCents: number): Promise<{ ok: true }>;
  /** Release the uncaptured remainder of a hold. */
  release(authId: string): Promise<{ ok: true }>;
  /** Standalone charge (tips). */
  charge(amountCents: number, buyerRef: string): Promise<{ ok: true; chargeId: string }>;
}

class MockProcessor implements PaymentProcessor {
  async authorizeHold(amountCents: number, buyerRef: string) {
    console.log(`[payments:mock] hold $${(amountCents / 100).toFixed(2)} for ${buyerRef}`);
    return { authId: `mock_auth_${Date.now().toString(36)}` };
  }
  async capture(authId: string, amountCents: number) {
    console.log(`[payments:mock] capture $${(amountCents / 100).toFixed(2)} (${authId})`);
    return { ok: true as const };
  }
  async release(authId: string) {
    console.log(`[payments:mock] release (${authId})`);
    return { ok: true as const };
  }
  async charge(amountCents: number, buyerRef: string) {
    console.log(`[payments:mock] charge $${(amountCents / 100).toFixed(2)} for ${buyerRef}`);
    return { ok: true as const, chargeId: `mock_ch_${Date.now().toString(36)}` };
  }
}

// TODO(CCBill): implement PaymentProcessor against the CCBill FlexForms /
// DataLink API and return it here when CCBILL_* env vars are present.
export function getProcessor(): PaymentProcessor {
  return new MockProcessor();
}
