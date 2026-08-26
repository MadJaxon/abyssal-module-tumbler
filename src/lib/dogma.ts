// Verbatim classification order and attribute IDs from
// old_project/src/app/abyssal-service.ts parseDogmaResponseIntoModules.
// Classifier order: DPS → NOS → neut → smartbomb → MWD → AB → battery.

import {
  AfterburnerModule,
  BatteryModule,
  DpsModule,
  MircowarpModule,
  Module,
  NeutModule,
  NosModule,
  SmartbombModule,
} from '../types';
import type { EsiItem } from './chatParser';

export function parseDogmaResponseIntoModules(updatedItems: EsiItem[]): (Module | null)[] {
  return updatedItems.map((item) => {
    const cpu = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 50)?.value;
    const pg = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 30)?.value;
    const activationTime = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 73)
      ?.value;
    const activationCost = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 6)
      ?.value;
    const optimalRange = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 54)
      ?.value;

    const dmgMultiplier = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 64)
      ?.value;
    const missileDmgMultiplier = item.dogma?.dogma_attributes.find(
      (attribute) => attribute.attribute_id === 213,
    )?.value;
    const rofBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 204)?.value;

    const gjDrained = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 90)?.value;
    const gjNeutralized = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 97)
      ?.value;

    const velocityBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 20)
      ?.value;
    const signatureModifier = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 554)
      ?.value;

    const capacitorBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 67)
      ?.value;
    const drainResistBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 2267)
      ?.value;

    const areaOfEffect = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 99)
      ?.value;
    const sbDamageEm = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 114)
      ?.value;
    const sbDamageTherm = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 118)
      ?.value;
    const sbDamageKinetic = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 117)
      ?.value;
    const sbDamageExpl = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 116)
      ?.value;
    const sbDamage = (sbDamageEm ?? 0) + (sbDamageTherm ?? 0) + (sbDamageKinetic ?? 0) + (sbDamageExpl ?? 0);

    if (!cpu || !pg) {
      return null;
    }

    const name = item.name ?? '';

    if ((dmgMultiplier || missileDmgMultiplier) && rofBonus) {
      return {
        type: 'dps',
        name,
        index: -1,
        dmgMulti: dmgMultiplier ? dmgMultiplier : missileDmgMultiplier ? missileDmgMultiplier : 0,
        rofBonus: (1 - rofBonus) * 100,
        cpu: cpu,
        pg: pg,
        typeId: item.typeId,
        itemId: item.itemId,
        estPrice: item.estPrice,
      } as DpsModule;
    } else if (activationTime && gjDrained && optimalRange) {
      return {
        name,
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
        range: optimalRange,
      } as NosModule;
    } else if (activationTime && activationCost && gjNeutralized && optimalRange) {
      return {
        name,
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
        range: optimalRange,
      } as NeutModule;
    } else if (activationCost && activationTime && areaOfEffect && sbDamage) {
      return {
        name,
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
        estPrice: item.estPrice,
      } as SmartbombModule;
    } else if (activationTime && activationCost && velocityBonus && signatureModifier) {
      return {
        type: 'mwd',
        name,
        index: -1,
        activationTime: activationTime,
        activationCost: activationCost,
        velocityBonus: velocityBonus,
        signatureRadiusModifier: signatureModifier,
        cpu: cpu,
        pg: pg,
        typeId: item.typeId,
        itemId: item.itemId,
        estPrice: item.estPrice,
      } as MircowarpModule;
    } else if (activationTime && activationCost && velocityBonus) {
      return {
        type: 'ab',
        name,
        index: -1,
        activationTime: activationTime,
        activationCost: activationCost,
        velocityBonus: velocityBonus,
        cpu: cpu,
        pg: pg,
        typeId: item.typeId,
        itemId: item.itemId,
        estPrice: item.estPrice,
      } as AfterburnerModule;
    } else if (capacitorBonus && drainResistBonus) {
      return {
        type: 'battery',
        name,
        index: -1,
        capacitorBonus: capacitorBonus,
        drainResistanceBonus: drainResistBonus,
        cpu: cpu,
        pg: pg,
        typeId: item.typeId,
        itemId: item.itemId,
        estPrice: item.estPrice,
      } as BatteryModule;
    } else {
      return null;
    }
  });
}
