import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {lastValueFrom} from 'rxjs';

type EsiResponse = {
  [key: string]: any;
}

type EsiDogmaResponse = {
  created_by: number;
  dogma_attributes: {attribute_id: number; value: number}[];
  dogma_effects: {effect_id: number; is_default: boolean}[];
  mutator_type_id: number;
  source_type_id: number;
};

type EsiItem = {
  name: string;
  typeId: number;
  itemId: string;
  dogma?: EsiDogmaResponse;
}

@Injectable({
  providedIn: 'root',
})
export class AbyssalService {

  public useCacheLayer: boolean = false;
  public esiCacheUrl: string = 'http://localhost:3000';
  private readonly esiUrl: string = 'https://esi.evetech.net';

  constructor(private http: HttpClient) {
  }

  public parseModulesFromChat(chatMessage: string): EsiItem[]|null {
    const regex = /<url=showinfo:(\d+)\/\/(\d+)>([^<]+)<\/url>/ig;
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

  public async updateDogmaAttributes(items: EsiItem[]): Promise<EsiItem[]> {
    for (const item of items) {
      const dogma = await this.getDogmaResult(item);
      if (dogma) {
        item.dogma = dogma;
      }
    }
    return items;
  }

  private async getDogmaResult(item: EsiItem): Promise<EsiDogmaResponse|null> {
    // Fetch dynamic item dogma from ESI
    const dogmaResponse = await lastValueFrom(this.http.get<EsiResponse>((this.useCacheLayer ? this.esiCacheUrl : this.esiUrl) + `/latest/dogma/dynamic/items/${item.typeId}/${item.itemId}/?datasource=tranquility`));
    if (!dogmaResponse) {
      console.error(dogmaResponse);
      throw new Error(`ESI error`);
    }

    const creatorId = dogmaResponse['created_by'];
    const sourceTypeId = dogmaResponse['source_type_id'];
    const mutatorTypeId = dogmaResponse['mutator_type_id'];

    const attributes: {attribute_id: number; value: number}[] = dogmaResponse['dogma_attributes'];
    const effects: {effect_id: number; is_default: boolean}[] = dogmaResponse['dogma_effects'];

    return {
      created_by: creatorId,
      source_type_id: sourceTypeId,
      mutator_type_id: mutatorTypeId,
      dogma_attributes: attributes,
      dogma_effects: effects
    };
  }
}
