import { describe, expect, it } from 'vitest';
import { isProductHash } from './entry';
describe('website and product entry boundary', () => {
  it('keeps all existing product deep links in the product', () => {
    for (const hash of ['#/', '#/today', '#/growth/rewards', '#/settings', '#/focus']) expect(isProductHash(hash)).toBe(true);
  });
  it('keeps the domain homepage and marketing anchors outside the hash router', () => {
    for (const hash of ['', '#method', '#companions', '#contact', '#content']) expect(isProductHash(hash)).toBe(false);
  });
});
