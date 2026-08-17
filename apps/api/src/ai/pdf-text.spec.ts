import { escapeHtml, hashBuffer } from './pdf-text';

describe('pdf-text helpers', () => {
  it('escapes HTML', () => {
    expect(escapeHtml('<b>&"x"</b>')).toBe('&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
  });

  it('hashes a buffer', () => {
    expect(hashBuffer(Buffer.from('abc'))).toHaveLength(64);
  });
});
