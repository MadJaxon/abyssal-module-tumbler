import type { EsiDogmaResponse, EsiItem } from './chatParser';

const ESI_DIRECT = 'https://esi.evetech.net';
const ESI_PROXY = '/api/esi';
const USER_AGENT = 'AbyssalTumbler/1.0 (+https://github.com/MadJaxon/abyssal-tumbler)';
const CACHE_PREFIX = 'abyssal-tumbler:dogma:';

type EsiJson = Record<string, unknown>;

function cacheKey(typeId: number, itemId: string): string {
  return `${CACHE_PREFIX}${typeId}:${itemId}`;
}

function readCache(typeId: number, itemId: string): EsiDogmaResponse | null {
  try {
    const raw = localStorage.getItem(cacheKey(typeId, itemId));
    if (!raw) return null;
    return JSON.parse(raw) as EsiDogmaResponse;
  } catch {
    return null;
  }
}

function writeCache(typeId: number, itemId: string, dogma: EsiDogmaResponse): void {
  try {
    localStorage.setItem(cacheKey(typeId, itemId), JSON.stringify(dogma));
  } catch {
    // quota — ignore
  }
}

async function esiGet(path: string): Promise<EsiJson> {
  const headers: HeadersInit = {
    Accept: 'application/json',
    'X-User-Agent': USER_AGENT,
  };
  try {
    const direct = await fetch(`${ESI_DIRECT}${path}`, { headers });
    if (direct.ok) {
      return (await direct.json()) as EsiJson;
    }
  } catch {
    // CORS or network — fall through to proxy
  }
  const proxied = await fetch(`${ESI_PROXY}${path}`, { headers });
  if (!proxied.ok) {
    throw new Error(`ESI error ${proxied.status}`);
  }
  return (await proxied.json()) as EsiJson;
}

export async function getDogmaResult(item: EsiItem): Promise<EsiDogmaResponse> {
  const cached = readCache(item.typeId, item.itemId);
  if (cached) return cached;

  const dogmaResponse = await esiGet(
    `/latest/dogma/dynamic/items/${item.typeId}/${item.itemId}/?datasource=tranquility`,
  );
  if (!dogmaResponse) {
    throw new Error('ESI error');
  }

  const dogma: EsiDogmaResponse = {
    created_by: dogmaResponse['created_by'] as number,
    source_type_id: dogmaResponse['source_type_id'] as number,
    mutator_type_id: dogmaResponse['mutator_type_id'] as number,
    dogma_attributes: dogmaResponse['dogma_attributes'] as EsiDogmaResponse['dogma_attributes'],
    dogma_effects: dogmaResponse['dogma_effects'] as EsiDogmaResponse['dogma_effects'],
  };
  writeCache(item.typeId, item.itemId, dogma);
  return dogma;
}

export async function getItemInformation(typeId: number): Promise<EsiJson> {
  return esiGet(`/latest/universe/types/${typeId}/?datasource=tranquility`);
}

export async function updateDogmaAttributes(items: EsiItem[]): Promise<EsiItem[]> {
  const pool = 3;
  let cursor = 0;
  const out: EsiItem[] = items.map((item) => ({ ...item }));

  async function worker() {
    while (cursor < out.length) {
      const idx = cursor++;
      const item = out[idx];
      item.dogma = await getDogmaResult(item);
      if (!item.name && item.typeId) {
        try {
          const info = await getItemInformation(item.typeId);
          if (typeof info['name'] === 'string') {
            item.name = info['name'];
          }
        } catch {
          // name is optional
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(pool, out.length) }, () => worker()));
  return out;
}
