/**
 * Who operates Kinjy, in one place.
 *
 * The registered address appears in the footer of every page and in the terms
 * a member accepts when they create an account. Two copies of a legal address
 * is one copy that is wrong after the company moves, so both read this.
 */
export const COMPANY = {
  name: 'Kinjy',
  /** As registered, on one line — for a footer or a meta tag. */
  address: '77 High Street, #10-12B High Street Plaza, Singapore 179433',
  /** The same address broken up, for a block that has room to breathe. */
  addressLines: ['77 High Street', '#10-12B High Street Plaza', 'Singapore 179433'],
  country: 'Singapore',
} as const
