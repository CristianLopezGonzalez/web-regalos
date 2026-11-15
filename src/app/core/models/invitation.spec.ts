import { invitationState } from './invitation';

describe('invitationState', () => {
  it('derives invitation state', () => {
    const base = {
      id: '1',
      withList: false,
      emailRestriction: null,
      createdAt: '',
      usedAt: null,
      revokedAt: null,
    };
    const future = new Date(Date.now() + 1e7).toISOString();
    expect(invitationState({ ...base, expiresAt: future })).toBe('pending');
    expect(invitationState({ ...base, expiresAt: '2000-01-01T00:00:00Z' })).toBe('expired');
    expect(invitationState({ ...base, expiresAt: future, usedAt: future })).toBe('used');
    expect(invitationState({ ...base, expiresAt: future, revokedAt: future })).toBe('revoked');
  });
});
