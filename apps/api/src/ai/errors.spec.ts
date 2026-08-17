import { isInvalidApiKeyMessage } from './errors';

describe('isInvalidApiKeyMessage', () => {
  it('detects Gemini invalid-key errors', () => {
    expect(isInvalidApiKeyMessage(400, 'API key not valid. Please pass a valid API key.')).toBe(true);
  });

  it('detects 401/403', () => {
    expect(isInvalidApiKeyMessage(401, 'Unauthorized')).toBe(true);
    expect(isInvalidApiKeyMessage(403, 'Permission denied')).toBe(true);
  });

  it('does not treat other 400s as an invalid key', () => {
    expect(isInvalidApiKeyMessage(400, 'Invalid JSON payload')).toBe(false);
  });
});
