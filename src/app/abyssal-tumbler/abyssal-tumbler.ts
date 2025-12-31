import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DecimalPipe} from '@angular/common';
import {AbyssalService} from '../abyssal-service';


interface Module {
  cpu: number;
  pg: number;
  dmgMulti: number;
  rofBonus: number;
  index: number;
  itemId?: string;
}

interface Result {
  id: number;
  modules: number[];
  totalCpu: number;
  totalPg: number;
  dpsIncrease: number;
}

@Component({
  selector: 'app-abyssal-tumbler',
  imports: [
    FormsModule,
    DecimalPipe
  ],
  templateUrl: './abyssal-tumbler.html',
  styleUrl: './abyssal-tumbler.css',
})
export class AbyssalTumbler {
  public cpuBudget: number = 100;
  public pgBudget: number = 100;
  public numModules: number = 3;
  public modules: Module[] = [
    // {
    //   index: 1,
    //   cpu: 25.62,
    //   pg: 1,
    //   dmgMulti: 1.109,
    //   rofBonus: 10.862
    // },
    // {
    //   index: 2,
    //   cpu: 31.25,
    //   pg: 1,
    //   dmgMulti: 1.108,
    //   rofBonus: 11.575
    // },
    // {
    //   index: 3,
    //   cpu: 29.38,
    //   pg: 1,
    //   dmgMulti: 1.105,
    //   rofBonus: 11.661
    // },
    // {
    //   index: 4,
    //   cpu: 30.01,
    //   pg: 1,
    //   dmgMulti: 1.106,
    //   rofBonus: 11.655
    // },
    // {
    //   index: 5,
    //   cpu: 30.28,
    //   pg: 1,
    //   dmgMulti: 1.11,
    //   rofBonus: 10.927
    // },
    // {
    //   index: 6,
    //   cpu: 27.69,
    //   pg: 1,
    //   dmgMulti: 1.112,
    //   rofBonus: 11.159
    // },
  ];
  public results: Result[] = [];
  public errorMessage: string = '';
  public useCacheLayer: boolean = true;

  constructor(
    private abyssalService: AbyssalService
  ) {
    // const single = '[18:35:37] Deringston Xa\'thon > <url=showinfo:78621//1050979976886>Abyssal Vorton Tuning System</url>';
    // const multiple = '[18:38:26] Deringston Xa\'thon > <url=showinfo:78621//1046894300758>Abyssal Vorton Tuning System</url>  <url=showinfo:78621//1047045201453>Abyssal Vorton Tuning System</url>  <url=showinfo:78621//1047045202498>Abyssal Vorton Tuning System</url>  <url=showinfo:78621//1047045204718>Abyssal Vorton Tuning System</url>  <url=showinfo:78621//1047045259979>Abyssal Vorton Tuning System</url>  <url=showinfo:78621//1047280310266>Abyssal Vorton Tuning System</url>\n';
    // this.abyssalService.parseAbyssalModuleFromChat(single)
  }


  public removeModule(index: number): boolean {
    const idx = this.modules.findIndex(m => m.index === index);
    if (idx >= 0) {
      this.modules.splice(idx, 1);
      return true;
    }
    return false;
  }

  public updateCacheLayer(toogle: boolean) {
    this.useCacheLayer = toogle;
    this.abyssalService.useCacheLayer = this.useCacheLayer;
  }

  public addModule(
    cpu: HTMLInputElement,
    pg: HTMLInputElement,
    dmgMulti: HTMLInputElement,
    rofBonus: HTMLInputElement,
  ): void {
    this.updateModule(-1, cpu.value, pg.value, dmgMulti.value, rofBonus.value);
    cpu.value = '';
    pg.value = '';
    dmgMulti.value = '';
    rofBonus.value = '';
  }

  public updateModule(
    index: number | string,
    cpu: number | string,
    pg: number | string,
    dmgMulti: number | string,
    rofBonus: number | string
  ): void {
    if (typeof index !== 'number') {
      index = parseInt(index, 10);
    }
    if (typeof cpu !== 'number') {
      cpu = parseFloat(cpu);
    }
    if (typeof pg !== 'number') {
      pg = parseFloat(pg);
    }
    if (typeof dmgMulti !== 'number') {
      dmgMulti = parseFloat(dmgMulti);
    }
    if (typeof rofBonus !== 'number') {
      rofBonus = parseFloat(rofBonus);
    }
    if (index === -1) {
      index = 1;
      const indizes = this.modules.map(m => m.index);
      while (indizes.includes(index)) {
        index++;
      }
      this.modules.push({
        index: index,
        cpu: cpu,
        pg: pg,
        dmgMulti: dmgMulti,
        rofBonus: rofBonus
      })
    } else {
      const module = this.modules.find(m => m.index === index);
      if (module) {
        module.cpu = cpu;
        module.pg = pg;
        module.dmgMulti = dmgMulti;
        module.rofBonus = rofBonus;
      }
    }
  }

  public async parseChatMessage(input: HTMLTextAreaElement) {
    const items = this.abyssalService.parseModulesFromChat(input.value);
    if (!items || items.length === 0) {
      return;
    }
    input.value = '';
    const moduleIds = this.modules.map(m => m.itemId);
    const updatedItems = await this.abyssalService.updateDogmaAttributes(items.filter(item => !moduleIds.includes(item.itemId)));
    updatedItems.forEach((item) => {
      const cpu = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 50)?.value;
      const pg = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 30)?.value;
      const dmgMultiplier = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 64)?.value;
      const rofBonus = item.dogma?.dogma_attributes.find((attribute) => attribute.attribute_id === 204)?.value;
      if (
        dmgMultiplier &&
        rofBonus &&
        cpu &&
        pg
      ) {
        let index = 1;
        const indizes = this.modules.map(m => m.index);
        while (indizes.includes(index)) {
          index++;
        }
        this.modules.push({
          index: index,
          dmgMulti: dmgMultiplier,
          rofBonus: (1 - rofBonus) * 100,
          cpu: cpu,
          pg: pg,
          itemId: item.itemId
        })
      }
    })
  }

  public calculateCombinations() {
    this.results = [];
    this.errorMessage = '';

    if (!this.cpuBudget || !this.pgBudget || !this.numModules || this.numModules <= 0) {
      this.errorMessage = 'Please enter valid budget and number of modules.';
      return;
    }

    // const modules = this.parseModules();
    const modules = [...this.modules];
    if (modules.length < this.numModules) {
      this.errorMessage = 'Not enough modules entered.';
      return;
    }

    const combinations = this.generateCombinations(modules, this.numModules);
    combinations.forEach((comb, index) => {
      const totalCpu = comb.reduce((sum, m) => sum + m.cpu, 0);
      const totalPg = comb.reduce((sum, m) => sum + m.pg, 0);
      if (totalCpu <= this.cpuBudget && totalPg <= this.pgBudget) {
        const dpsIncrease = this.calculateDpsIncrease(comb);
        this.results.push({
          id: index,
          modules: comb.map(m => m.index),
          totalCpu,
          totalPg,
          dpsIncrease
        });
      }
    });

    // Sort results by DPS increase descending
    this.results.sort((a, b) => b.dpsIncrease - a.dpsIncrease);
  }

  private generateCombinations(modules: Module[], k: number, start = 0, current: Module[] = []): Module[][] {
    if (current.length === k) {
      return [current.slice()];
    }
    const result: Module[][] = [];
    for (let i = start; i < modules.length; i++) {
      current.push(modules[i]);
      result.push(...this.generateCombinations(modules, k, i + 1, current));
      current.pop();
    }
    return result;
  }

  // private calculateDpsIncrease(modules: Module[]): number {
  //   const dmgBonuses: number[] = modules.map(m => m.dmgMulti - 1);
  //   const rofFractions: number[] = modules.map(m => 1 / (1 - m.rofBonus / 100) - 1);
  //
  //   const stackedDmg = this.stackedBonus(dmgBonuses);
  //   const stackedRof = this.stackedBonus(rofFractions);
  //
  //   const totalDmgMulti = 1 + stackedDmg;
  //   const totalRofMulti = 1 + stackedRof;
  //
  //   const dpsMulti = totalDmgMulti * totalRofMulti;
  //   return (dpsMulti - 1) * 100;
  // }

  private calculateDpsIncrease(modules: Module[]): number {
    let dmgBonuses: number[] = modules.map(m => m.dmgMulti - 1);
    let rofBonuses: number[] = modules.map(m => m.rofBonus / 100); // Fractional reductions

    // Sort descending for strongest first
    dmgBonuses.sort((a, b) => b - a);
    rofBonuses.sort((a, b) => b - a);

    // Damage multipliers (product of (1 + penalized bonus))
    let totalDmg = 1.0;
    for (let i = 0; i < dmgBonuses.length; i++) {
      const penalty = Math.exp( - Math.pow(i / 2.67, 2) );
      totalDmg *= (1 + dmgBonuses[i] * penalty);
    }

    // Cycle time multipliers (product of (1 - penalized reduction)), then invert for DPS from RoF
    let totalCycle = 1.0;
    for (let i = 0; i < rofBonuses.length; i++) {
      const penalty = Math.exp( - Math.pow(i / 2.67, 2) );
      totalCycle *= (1 - rofBonuses[i] * penalty);
    }
    const totalRof = (totalCycle > 0) ? 1 / totalCycle : 1; // Avoid division by zero

    const dpsMulti = totalDmg * totalRof;
    return (dpsMulti - 1) * 100;
  }
}
