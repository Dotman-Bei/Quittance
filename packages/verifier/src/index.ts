/*
 * §8.1 packages/verifier — independent re-derivation, no gate access.
 * §11 "Zero dependency on our hosted service. If verification needs us, it is not
 *      verification."
 *
 * Nothing in this package imports a client, reads an API key, or opens a socket.
 */
export { reDerive, parseReceipt } from "@quittance/reference";
export type { ReDerivation, ParsedReceipt } from "@quittance/reference";
export { verdict, isDischargeEligible } from "@quittance/reference";
export type { Receipt, VerdictState } from "@quittance/protocol-types";
