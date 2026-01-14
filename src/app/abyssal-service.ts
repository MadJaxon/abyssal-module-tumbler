import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {lastValueFrom} from 'rxjs';
import {
  AfterburnerModule, BatteryModule,
  DpsModule,
  MircowarpModule,
  Module,
  NeutModule,
  NosModule,
  SmartbombModule
} from './interfaces';

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
  typeId: number;
  itemId: string;
  name?: string;
  estPrice?: number;
  dogma?: EsiDogmaResponse;
}

@Injectable({
  providedIn: 'root',
})
export class AbyssalService {

  public useCacheLayer: boolean = false;
  public cacheUrl: string = 'http://localhost:3000';
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
    const dogmaResponse = await lastValueFrom(this.http.get<EsiResponse>((this.useCacheLayer ? this.cacheUrl : this.esiUrl) + `/latest/dogma/dynamic/items/${item.typeId}/${item.itemId}/?datasource=tranquility`));
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

  public async getMutamarketModules(url: string): Promise<(Module|null)[]|null> {
    const urlRegex: RegExp = new RegExp('^https:\/\/(www\.)?mutamarket.com\/modules\/type/', 'i');
    if (!urlRegex.test(url)) {
      return null;
    }
    url = url.replace(urlRegex, this. cacheUrl + '/mm/api/modules/type/');
    // Fetch dynamic item dogma from ESI
    const mmResponse = await lastValueFrom(this.http.get<EsiResponse[]>(url));
    if (!mmResponse) {
      console.error(mmResponse);
      throw new Error(`MutaMarket error`);
    }

    const updatedModules = await this.updateDogmaAttributes(
      mmResponse.map(
        (module) => {
          let price = module['estimated_value'];
          if (module['contract'] && module['contract'].price) {
            price = module['contract'].price;
          }
          return {
            typeId: module['type'].id,
            itemId: module['id'],
            estPrice: price,
            name: module['type'].name,
          };
        }
      )
    );

    const module = this.parseDogmaResponseIntoModules(updatedModules);
    debugger
    return Promise.all(
      module.filter(m => m).map(async module => {
        if (!module.name && module.typeId) {
          module.name = (await this.getItemInformation(module.typeId))['name'];
        }
        return module;
      })
    );
  }

  public parseDogmaResponseIntoModules(updatedItems: EsiItem[]) {
    return <Module[]>updatedItems.map((item) => {
      const cpu = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 50)?.value;
      const pg = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 30)?.value;
      const activationTime = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 73)?.value;
      const activationCost = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 6)?.value;
      const optimalRange = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 54)?.value;

      //dmg modules:
      const dmgMultiplier = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 64)?.value;
      const missileDmgMultiplier = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 213)?.value;
      const rofBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 204)?.value;

      // nos:
      const gjDrained = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 90)?.value;
      // neuts:
      const gjNeutralized = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 97)?.value;

      //propmods:
      const velocityBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 20)?.value;
      const signatureModifier = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 554)?.value;

      //batteries:
      const capacitorBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 67)?.value;
      const drainResistBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 2267)?.value;

      // smartbombs
      const areaOfEffect = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 99)?.value;
      const sbDamageEm = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 114)?.value;
      const sbDamageTherm = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 118)?.value;
      const sbDamageKinetic = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 117)?.value;
      const sbDamageExpl = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 116)?.value;
      const sbDamage = (sbDamageEm ?? 0) + (sbDamageTherm ?? 0) + (sbDamageKinetic ?? 0) + (sbDamageExpl ?? 0);

      // @todo:
      //shield booster
      const shieldBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 68)?.value;
      // //armor repper
      // const armorBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 68)?.value;

      if (!cpu || !pg) {
        return null;
      }

      if (
        (dmgMultiplier || missileDmgMultiplier) &&
        rofBonus
      ) {
        return <DpsModule>{
          type: 'dps',
          index: -1,
          dmgMulti: dmgMultiplier ? dmgMultiplier : (missileDmgMultiplier ? missileDmgMultiplier : 0),
          rofBonus: (1 - rofBonus) * 100,
          cpu: cpu,
          pg: pg,
          typeId: item.typeId,
          itemId: item.itemId,
          estPrice: item.estPrice
        };
      } else if (
        activationTime &&
        gjDrained &&
        optimalRange
      ) {
        return <NosModule>{
          name: '',
          type: 'nos',
          index: -1,
          activationCost: activationCost,
          activationTime: activationTime,
          drainAmount: gjDrained,
          cpu: cpu,
          pg: pg,
          typeId: item.typeId,
          itemId: item.itemId,
          estPrice: item.estPrice,
          range: optimalRange
        };
      } else if (
        activationTime &&
        activationCost &&
        gjNeutralized &&
        optimalRange
      ) {
        return <NeutModule>{
          name: '',
          type: 'neut',
          index: -1,
          activationCost: activationCost,
          activationTime: activationTime,
          neutAmount: gjNeutralized,
          cpu: cpu,
          pg: pg,
          typeId: item.typeId,
          itemId: item.itemId,
          estPrice: item.estPrice,
          range: optimalRange
        };
      } else if (
        activationCost &&
        activationTime &&
        areaOfEffect &&
        sbDamage
      ) {
        return <SmartbombModule>{
          name: '',
          type: 'sb',
          index: -1,
          activationCost: activationCost,
          activationTime: activationTime,
          range: areaOfEffect,
          damage: sbDamage,
          cpu: cpu,
          pg: pg,
          typeId: item.typeId,
          itemId: item.itemId,
          estPrice: item.estPrice
        };
      } else if (
        activationTime &&
        activationCost &&
        velocityBonus &&
        signatureModifier
      ) {
        return <MircowarpModule>{
          type: 'mwd',
          index: -1,
          activationTime: activationTime,
          activationCost: activationCost,
          velocityBonus: velocityBonus,
          signatureRadiusModifier: signatureModifier,
          cpu: cpu,
          pg: pg,
          typeId: item.typeId,
          itemId: item.itemId,
          estPrice: item.estPrice
        };
      } else if (
        activationTime &&
        activationCost &&
        velocityBonus
      ) {
        return <AfterburnerModule>{
          type: 'ab',
          index: -1,
          activationTime: activationTime,
          activationCost: activationCost,
          velocityBonus: velocityBonus,
          cpu: cpu,
          pg: pg,
          typeId: item.typeId,
          itemId: item.itemId,
          estPrice: item.estPrice
        };
      } else if (
        capacitorBonus &&
        drainResistBonus
      ) {
        return <BatteryModule>{
          type: 'battery',
          index: -1,
          capacitorBonus: capacitorBonus,
          drainResistanceBonus: drainResistBonus,
          cpu: cpu,
          pg: pg,
          typeId: item.typeId,
          itemId: item.itemId,
          estPrice: item.estPrice
        };
      } else {
        return null;
      }
    });
  }

  public async getItemInformation(typeId: number) {
    return await lastValueFrom(this.http.get<EsiResponse>((this.useCacheLayer ? this.cacheUrl : this.esiUrl) + `/universe/types/${typeId}/?datasource=tranquility`));
  }
}
