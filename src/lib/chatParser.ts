export type EsiItem = {
  typeId: number;
  itemId: string;
  name?: string;
  estPrice?: number;
  dogma?: EsiDogmaResponse;
};

export type EsiDogmaResponse = {
  created_by: number;
  dogma_attributes: { attribute_id: number; value: number }[];
  dogma_effects: { effect_id: number; is_default: boolean }[];
  mutator_type_id: number;
  source_type_id: number;
};

export function parseModulesFromChat(chatMessage: string): EsiItem[] | null {
  const regex = /<url=showinfo:(\d+)\/\/(\d+)>([^<]+)<\/url>/gi;
  const matches = chatMessage.matchAll(regex);
  const items: EsiItem[] = [];
  let match = matches.next();
  if (match && match.done) {
    return [];
  }
  do {
    if (!match) {
      console.error('No valid showinfo link found in the chat message.');
      return null;
    }
    items.push({
      name: match.value[3].trim(),
      typeId: parseInt(match.value[1], 10),
      itemId: match.value[2],
    });
    match = matches.next();
  } while (!match.done);

  return items;
}
