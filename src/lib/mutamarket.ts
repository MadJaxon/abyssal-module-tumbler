import type { Module } from '../types';
import type { EsiItem } from './chatParser';
import { parseDogmaResponseIntoModules } from './dogma';
import { getItemInformation, updateDogmaAttributes } from './esi';

const TYPE_URL = /^https:\/\/(www\.)?mutamarket.com\/modules\/type\//i;

type MutaModule = {
  id: string | number;
  estimated_value?: number;
  contract?: { price?: number };
  type?: { id?: number; name?: string };
};

export function isMutaMarketTypeUrl(url: string): boolean {
  return TYPE_URL.test(url.trim());
}

export function unwrapMutaList(payload: unknown): MutaModule[] {
  if (Array.isArray(payload)) return payload as MutaModule[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: MutaModule[] }).data;
  }
  return [];
}

export function toProxyUrl(url: string): string {
  return url.trim().replace(TYPE_URL, '/api/mutamarket/api/modules/type/');
}

export async function getMutamarketModules(url: string): Promise<Module[] | null> {
  if (!isMutaMarketTypeUrl(url)) {
    return null;
  }
  const proxied = toProxyUrl(url);
  const mmResponse: unknown = await (await fetch(proxied, { headers: { Accept: 'application/json' } })).json();
  const list = unwrapMutaList(mmResponse);
  if (list.length === 0) {
    throw new Error('MutaMarket error');
  }

  const items: EsiItem[] = list.map((module) => {
    let price = module.estimated_value;
    if (module.contract && module.contract.price) {
      price = module.contract.price;
    }
    return {
      typeId: module.type?.id ?? 0,
      itemId: String(module.id),
      estPrice: price,
      name: module.type?.name,
    };
  });

  const updated = await updateDogmaAttributes(items);
  const classified = parseDogmaResponseIntoModules(updated);
  const modules = classified.filter((m): m is Module => m !== null);

  await Promise.all(
    modules.map(async (module) => {
      if (!module.name && module.typeId) {
        try {
          const info = await getItemInformation(module.typeId);
          if (typeof info['name'] === 'string') {
            module.name = info['name'];
          }
        } catch {
          // keep empty name
        }
      }
    }),
  );

  return modules.sort((a, b) => (b.estPrice ?? 0) - (a.estPrice ?? 0));
}
