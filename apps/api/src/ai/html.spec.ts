import { payloadToHtml } from './html';

describe('payloadToHtml', () => {
  it('renders a summary and finding tones', () => {
    const html = payloadToHtml({
      summary: 'Hello <x>',
      findings: [{ tone: 'red', text: 'Bad' }],
    });
    expect(html).toContain('Hello &lt;x&gt;');
    expect(html).toContain('ai-red');
    expect(html).toContain('Bad');
  });
});
