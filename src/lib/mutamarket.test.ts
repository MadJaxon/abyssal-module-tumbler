import { describe, expect, it } from 'vitest';
import { isMutaMarketTypeUrl, toProxyUrl, unwrapMutaList } from './mutamarket';

describe('mutamarket', () => {
  it('rewrites type-search URLs through the local proxy', () => {
    const url =
      'https://mutamarket.com/modules/type/abyssal-vorton-tuning-system/attributes/dpsincreaseturrets/1.2-1.3';
    expect(isMutaMarketTypeUrl(url)).toBe(true);
    expect(toProxyUrl(url)).toBe(
      '/api/mutamarket/api/modules/type/abyssal-vorton-tuning-system/attributes/dpsincreaseturrets/1.2-1.3',
    );
  });

  it('unwraps both raw arrays and the current { data } envelope', () => {
    expect(unwrapMutaList([{ id: 1 }])).toHaveLength(1);
    expect(unwrapMutaList({ data: [{ id: 1 }, { id: 2 }] })).toHaveLength(2);
    expect(unwrapMutaList({ detail: 'nope' })).toEqual([]);
  });
});
