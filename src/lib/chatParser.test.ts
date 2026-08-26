import { describe, expect, it } from 'vitest';
import { parseModulesFromChat } from './chatParser';

describe('parseModulesFromChat', () => {
  it('returns an empty list when there are no showinfo links', () => {
    expect(parseModulesFromChat('just chatting')).toEqual([]);
  });

  it('parses a single showinfo link', () => {
    const items = parseModulesFromChat(
      '<url=showinfo:78621//1048013997699>Abyssal Vorton Tuning System</url>',
    );
    expect(items).toEqual([
      {
        name: 'Abyssal Vorton Tuning System',
        typeId: 78621,
        itemId: '1048013997699',
      },
    ]);
  });

  it('parses multiple links out of a chat line', () => {
    const items = parseModulesFromChat(
      '[21:01:12] Mad Jaxon > <url=showinfo:78621//1048013997699>Abyssal Vorton Tuning System</url>  <url=showinfo:78621//1051772316207>Abyssal Vorton Tuning System</url>',
    );
    expect(items).toHaveLength(2);
    expect(items![1].itemId).toBe('1051772316207');
  });
});
