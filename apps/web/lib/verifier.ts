/*
 * DESIGN.md §4: this file RE-EXPORTS packages/reference. It never re-implements the
 * verdict function.
 *
 * §11: "Zero dependency on our hosted service in the verifier. If verification needs
 * us, it is not verification." The /verify page runs this in the browser, so the
 * function that decided the money is the same function the reader re-runs.
 */
export { verdict, isDischargeEligible, reDerive, parseReceipt } from "@quittance/reference";
export type { ReDerivation, ParsedReceipt } from "@quittance/reference";
