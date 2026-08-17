import { decryptSecret, encryptSecret, last4 } from './crypto';

describe('AI key crypto', () => {
  it('returns the last four characters', () => {
    expect(last4('abcd1234')).toBe('1234');
    expect(last4('ab')).toBe('ab');
  });

  it('round-trips a secret', () => {
    const secret = 'unit-test-secret';
    const cipher = encryptSecret('gemini-key', secret);
    expect(cipher).not.toContain('gemini-key');
    expect(decryptSecret(cipher, secret)).toBe('gemini-key');
  });
});
