export type InvitationState = 'pending' | 'used' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  /** The account created from it gets a wish list of its own. */
  withList: boolean;
  emailRestriction: string | null;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export const invitationState = (i: Invitation, now = Date.now()): InvitationState =>
  i.revokedAt
    ? 'revoked'
    : i.usedAt
      ? 'used'
      : Date.parse(i.expiresAt) <= now
        ? 'expired'
        : 'pending';
