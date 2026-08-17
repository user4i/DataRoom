import { parseAiPayload } from './payload';

describe('parseAiPayload', () => {
  it('reads JSON from a markdown fence and maps unknown tones to yellow', () => {
    const raw = '```json\n{"summary":"Ok","findings":[{"tone":"green","text":"Fair"},{"tone":"nope","text":"Check"}]}\n```';
    expect(parseAiPayload(raw)).toEqual({
      summary: 'Ok',
      findings: [
        { tone: 'green', text: 'Fair' },
        { tone: 'yellow', text: 'Check' },
      ],
      table: undefined,
    });
  });

  it('throws when the model did not return JSON', () => {
    expect(() => parseAiPayload('no json here')).toThrow('The AI response was not JSON');
  });
});
