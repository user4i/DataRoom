export const MISSING_AI_KEY_ERROR = 'Add an AI API key in Settings';
export const INVALID_AI_KEY_ERROR = 'The AI API key is not valid. Check it in Settings.';

export function isInvalidApiKeyMessage(status: number, message: string) {
  if (status === 401 || status === 403) return true;
  return /api key/i.test(message) && /not valid|invalid|denied|unauthorized/i.test(message);
}
