import {ChangeDetectorRef, Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DecimalPipe, JsonPipe} from '@angular/common';
import {AbyssalService} from '../abyssal-service';

type AbyssalModuleType = 'dps'|'sb'|'neut'|'nos'|'battery'|'ab'|'mwd';

interface Module {
  type: AbyssalModuleType;
  cpu: number;
  pg: number;
  index: number;
  itemId?: string;
}
interface ActiveModule extends Module {
  activationCost: number;
  activationTime: number;
}

interface DpsModule extends Module {
  dmgMulti: number;
  rofBonus: number;
}

interface NosModule extends Module {
  activationTime: number;
  range: number;
  drainAmount: number;
}

interface NeutModule extends ActiveModule {
  range: number;
  neutAmount: number;
}

interface SmartbombModule extends ActiveModule {
  range: number;
  damage: number;
}

interface BatteryModule extends Module {
  capacitorBonus: number;
  drainResistanceBonus: number;
}

interface AfterburnerModule extends ActiveModule {
  velocityBonus: number;
}

interface MircowarpModule extends AfterburnerModule {
  signatureRadiusModifier: number;
}

interface Result {
  id: number;
  modules: {
    type: AbyssalModuleType;
    index: number;
  }[];
  totalCpu: number;
  totalPg: number;
  dpsIncrease: number;
  smartbombDps: number;
  smartbombGjs: number;
  neutAmount: number;
  neutGjs: number;
  neutRange: number;
  nosAmount: number;
  nosRange: number;
}


@Component({
  selector: 'app-abyssal-tumbler',
  imports: [
    FormsModule,
    DecimalPipe,
    JsonPipe
  ],
  templateUrl: './abyssal-tumbler.html',
  styleUrl: './abyssal-tumbler.scss',
})
export class AbyssalTumbler {

  public readonly abyssalModuleTypes: AbyssalModuleType[] = ['dps', 'sb', 'neut', 'nos', 'battery', 'ab', 'mwd'];
  public readonly abyssalModuleTranslations: {[key: string]: string} = {
    'dps': 'DPS-Module',
    'sb': 'Smartbombs',
    'neut': 'Cap-Neutralizer',
    'nos': 'Cap-Nosferatu',
    'battery': 'Cap Battery',
    'ab': 'Afterburner',
    'mwd': 'Microwarpdrive'
  };
  public currentAbyssalModuleType = 'dps';

  public debug: boolean = true; // toggle for local debugging
  public debugData?: any;

  public cpuBudget: number = 100;
  public pgBudget: number = 100;
  public numModules:  {[key: string]: number} = {
    'dps': 0,
    'sb': 0,
    'neut': 0,
    'nos': 0,
    'battery': 0,
    'ab': 0,
    'mwd': 0,
  };
  public dpsModules: DpsModule[] = [];
  public sbModules: SmartbombModule[] = [];
  public neutModules: NeutModule[] = [];
  public nosModules: NosModule[] = [];
  public batteryModules: BatteryModule[] = [];
  public abModules: AfterburnerModule[] = [];
  public mwdModules: MircowarpModule[] = [];
  // public modules: Module[] = [];
  public results: Result[] = [];
  public errorMessage: string = '';
  public useCacheLayer: boolean = false;
  public cacheLayerUrl: string = 'http://localhost:3000';

  constructor(
    private abyssalService: AbyssalService,
    private cdr: ChangeDetectorRef
  ) {
    if (this.debug) {
      this.useCacheLayer = true;
      this.abyssalService.useCacheLayer = true;
    }
  }


  public removeModule(collection: Module[], index: number): boolean {
    const idx = collection.findIndex(m => m.index === index);
    if (idx >= 0) {
      collection.splice(idx, 1);
      return true;
    }
    return false;
  }

  public updateCacheLayer(toogle: boolean) {
    this.useCacheLayer = toogle;
    this.abyssalService.useCacheLayer = this.useCacheLayer;
  }

  public updateCacheLayerUrl(url: string): void {
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch (_) {
      return;
    }
    if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
      this.cacheLayerUrl = url;
      this.abyssalService.esiCacheUrl = url;
    }
  }

  public addDpsModule(
    cpu: HTMLInputElement,
    pg: HTMLInputElement,
    dmgMulti: HTMLInputElement,
    rofBonus: HTMLInputElement,
  ): void {
    this.updateDpsModule(-1, cpu.value, pg.value, dmgMulti.value, rofBonus.value);
    cpu.value = '';
    pg.value = '';
    dmgMulti.value = '';
    rofBonus.value = '';
  }

  public addNeutModule(
    cpu: HTMLInputElement,
    pg: HTMLInputElement,
    activationTime: HTMLInputElement,
    activationCost: HTMLInputElement,
    neutAmount: HTMLInputElement,
    range: HTMLInputElement,
  ) {
    this.updateNeutModule(-1, cpu.value, pg.value, activationTime.value, activationCost.value, neutAmount.value, range.value);
    cpu.value = '';
    pg.value = '';
    activationCost.value = '';
    neutAmount.value = '';
    range.value = '';
  }

  public addNosModule(
    cpu: HTMLInputElement,
    pg: HTMLInputElement,
    activationTime: HTMLInputElement,
    drainAmount: HTMLInputElement,
    range: HTMLInputElement,
  ) {
    this.updateNosModule(-1, cpu.value, pg.value, activationTime.value, drainAmount.value, range.value);
    cpu.value = '';
    pg.value = '';
    drainAmount.value = '';
    range.value = '';
  }

  public addBatteryModule(
    cpu: HTMLInputElement,
    pg: HTMLInputElement,
    capacitorBonus: HTMLInputElement,
    drainResistanceBonus: HTMLInputElement,
  ) {
    this.updateBatteryModule(-1, cpu.value, pg.value, capacitorBonus.value, drainResistanceBonus.value);
    cpu.value = '';
    pg.value = '';
    capacitorBonus.value = '';
    drainResistanceBonus.value = '';
  }

  public addAfterburnerModule(
    cpu: HTMLInputElement,
    pg: HTMLInputElement,
    activationCost: HTMLInputElement,
    velocityBonus: HTMLInputElement,
  ) {
    this.updateAbModule(-1, cpu.value, pg.value, activationCost.value, velocityBonus.value);
    cpu.value = '';
    pg.value = '';
    activationCost.value = '';
    velocityBonus.value = '';
  }

  public addMwdModule(
    cpu: HTMLInputElement,
    pg: HTMLInputElement,
    activationCost: HTMLInputElement,
    velocityBonus: HTMLInputElement,
    signatureRadiusModifier: HTMLInputElement,
  ) {
    this.updateMwdModule(-1, cpu.value, pg.value, activationCost.value, velocityBonus.value, signatureRadiusModifier.value);
    cpu.value = '';
    pg.value = '';
    activationCost.value = '';
    velocityBonus.value = '';
    signatureRadiusModifier.value = '';
  }

  public addSmartbombModule(
    cpu: HTMLInputElement,
    pg: HTMLInputElement,
    activationCost: HTMLInputElement,
    activationTime: HTMLInputElement,
    range: HTMLInputElement,
    damage: HTMLInputElement,
  ) {
    this.updateSmartbombModule(-1, cpu.value, pg.value, activationCost.value, activationTime.value, range.value, damage.value);
    cpu.value = '';
    pg.value = '';
    activationCost.value = '';
    activationTime.value = '';
    range.value = '';
    damage.value = '';
  }

  private parseModule(
    type: AbyssalModuleType,
    index: number | string,
    cpu: number | string,
    pg: number | string,
    activationCost: number | string = 0,
    activationTime: number | string = 0
  ): Module|ActiveModule {
    if (typeof index !== 'number') {
      index = parseInt(index, 10);
    }
    if (typeof cpu !== 'number') {
      cpu = parseFloat(cpu);
    }
    if (typeof pg !== 'number') {
      pg = parseFloat(pg);
    }
    if (typeof activationCost !== 'number') {
      activationCost = parseFloat(activationCost);
    }
    if (typeof activationTime !== 'number') {
      activationTime = parseFloat(activationTime);
    }

    if (activationCost !== 0) {
      return <ActiveModule>{
        type: type,
        index: index,
        pg: pg,
        cpu: cpu,
        activationCost: activationCost,
        activationTime: activationTime
      };
    } else {
      return <Module>{
        type: type,
        index: index,
        pg: pg,
        cpu: cpu,
      };
    }
  }

  public updateDpsModule(
    index: number | string,
    cpu: number | string,
    pg: number | string,
    dmgMulti: number | string,
    rofBonus: number | string
  ): void {
    if (typeof dmgMulti !== 'number') {
      dmgMulti = parseFloat(dmgMulti);
    }
    if (typeof rofBonus !== 'number') {
      rofBonus = parseFloat(rofBonus);
    }
    const module: DpsModule = {
      ...<Module>this.parseModule(
        'dps',
        index,
        cpu,
        pg,
      ),
      dmgMulti: dmgMulti,
      rofBonus: rofBonus
    };
    this.updateModuleCollection(module, this.dpsModules);
  }

  public updateNeutModule(
    index: number | string,
    cpu: number | string,
    pg: number | string,
    activationTime: number | string,
    activationCost: number | string,
    neutAmount: number | string,
    range: number | string,
  ): void {
    if (typeof neutAmount !== 'number') {
      neutAmount = parseFloat(neutAmount);
    }
    if (typeof range !== 'number') {
      range = parseFloat(range);
    }
    const module: NeutModule = {
      ...<ActiveModule>this.parseModule(
        'sb',
        index,
        cpu,
        pg,
        activationCost,
        activationTime,
      ),
      range: range,
      neutAmount: neutAmount
    };
    this.updateModuleCollection(module, this.neutModules);
  }

  public updateNosModule(
    index: number | string,
    cpu: number | string,
    pg: number | string,
    activationTime: number | string,
    drainAmount: number | string,
    range: number | string,
  ): void {
    if (typeof drainAmount !== 'number') {
      drainAmount = parseFloat(drainAmount);
    }
    if (typeof range !== 'number') {
      range = parseFloat(range);
    }
    if (typeof activationTime !== 'number') {
      activationTime = parseFloat(activationTime);
    }
    const module: NosModule = {
      ...<Module>this.parseModule(
        'sb',
        index,
        cpu,
        pg,
      ),
      activationTime: activationTime,
      range: range,
      drainAmount: drainAmount
    };
    this.updateModuleCollection(module, this.nosModules);
  }

  public updateBatteryModule(
    index: number | string,
    cpu: number | string,
    pg: number | string,
    capacitorBonus: number | string,
    drainResistanceBonus: number | string,
  ): void {
    if (typeof capacitorBonus !== 'number') {
      capacitorBonus = parseFloat(capacitorBonus);
    }
    if (typeof drainResistanceBonus !== 'number') {
      drainResistanceBonus = parseFloat(drainResistanceBonus);
    }
    const module: BatteryModule = {
      ...<Module>this.parseModule(
        'sb',
        index,
        cpu,
        pg,
      ),
      capacitorBonus: capacitorBonus,
      drainResistanceBonus: drainResistanceBonus
    };
    this.updateModuleCollection(module, this.batteryModules);
  }

  public updateAbModule(
    index: number | string,
    cpu: number | string,
    pg: number | string,
    activationCost: number | string,
    velocityBonus: number | string,
  ): void {
    if (typeof activationCost !== 'number') {
      activationCost = parseFloat(activationCost);
    }
    if (typeof velocityBonus !== 'number') {
      velocityBonus = parseFloat(velocityBonus);
    }
    const module: AfterburnerModule = {
      ...<ActiveModule>this.parseModule(
        'sb',
        index,
        cpu,
        pg,
        activationCost
      ),
      velocityBonus: velocityBonus
    };
    this.updateModuleCollection(module, this.batteryModules);
  }

  public updateMwdModule(
    index: number | string,
    cpu: number | string,
    pg: number | string,
    activationCost: number | string,
    velocityBonus: number | string,
    signatureRadiusModifier: number | string,
  ): void {
    if (typeof activationCost !== 'number') {
      activationCost = parseFloat(activationCost);
    }
    if (typeof velocityBonus !== 'number') {
      velocityBonus = parseFloat(velocityBonus);
    }
    if (typeof signatureRadiusModifier !== 'number') {
      signatureRadiusModifier = parseFloat(signatureRadiusModifier);
    }
    const module: MircowarpModule = {
      ...<ActiveModule>this.parseModule(
        'sb',
        index,
        cpu,
        pg,
        activationCost
      ),
      velocityBonus: velocityBonus,
      signatureRadiusModifier: signatureRadiusModifier
    };
    this.updateModuleCollection(module, this.batteryModules);
  }

  public updateSmartbombModule(
    index: number | string,
    cpu: number | string,
    pg: number | string,
    activationCost: number | string,
    activationTime: number | string,
    range: number | string,
    damage: number | string,
  ): void {
    if (typeof activationTime !== 'number') {
      activationTime = parseFloat(activationTime);
    }
    if (typeof damage !== 'number') {
      damage = parseFloat(damage);
    }
    if (typeof range !== 'number') {
      range = parseFloat(range);
    }
    const module: SmartbombModule = {
      ...<ActiveModule>this.parseModule(
        'sb',
        index,
        cpu,
        pg,
        activationCost,
      ),
      activationTime: activationTime,
      range: range,
      damage: damage
    };
    this.updateModuleCollection(module, this.sbModules);
  }

  private updateModuleCollection(module: Module, collection: Module[]): void {
    if (module.index === -1) {
      module.index = 1;
      const indizes = collection.map(m => m.index);
      while (indizes.includes(module.index)) {
        module.index++;
      }
      collection.push(module);
    } else {
      const oldModule = collection.find(m => m.index === module.index);
      if (oldModule) {
        // @ts-ignore
        Object.keys(module).forEach((key: string) => oldModule[key] = module[key]);
      } // else shouldnt be needed
    }
  }

  public async parseChatMessage(input: HTMLTextAreaElement) {
    const items = this.abyssalService.parseModulesFromChat(input.value);
    if (!items || items.length === 0) {
      return;
    }
    input.value = '';
    const moduleIds = [
      ...this.dpsModules.map((m) => m.itemId ?? '0'),
      ...this.sbModules.map((m) => m.itemId ?? '0'),
      ...this.neutModules.map((m) => m.itemId ?? '0'),
      ...this.nosModules.map((m) => m.itemId ?? '0'),
      ...this.batteryModules.map((m) => m.itemId ?? '0'),
      ...this.abModules.map((m) => m.itemId ?? '0'),
      ...this.mwdModules.map((m) => m.itemId ?? '0')
    ];
    // const moduleIds = Object.keys(this.modules).map(key => this.modules[key]).reduce(
    //   (ids: string[], modules) => ids.concat(modules.map(m => m.itemId ?? '')),
    //   []
    // );

    this.errorMessage = '';
    try {
      const updatedItems = await this.abyssalService.updateDogmaAttributes(items.filter(item => !moduleIds.includes(item.itemId)));
      if (this.debug) {
        this.debugData = updatedItems;
      }
      updatedItems.forEach((item) => {
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

        if (!cpu || !pg) {
          return;
        }

        if (
          (dmgMultiplier || missileDmgMultiplier) &&
          rofBonus
        ) {
          this.addNewModuleWithIndex(<DpsModule>{
              type: 'dps',
              index: -1,
              dmgMulti: dmgMultiplier ? dmgMultiplier : (missileDmgMultiplier ? missileDmgMultiplier : 0),
              rofBonus: (1 - rofBonus) * 100,
              cpu: cpu,
              pg: pg,
              itemId: item.itemId
            }, this.dpsModules);
        } else if (
          activationTime &&
          gjDrained &&
          optimalRange
        ) {
          this.addNewModuleWithIndex(<NosModule>{
            type: 'nos',
            index: -1,
            activationCost: activationCost,
            activationTime: activationTime,
            drainAmount: gjDrained,
            cpu: cpu,
            pg: pg,
            itemId: item.itemId,
            range: optimalRange
          }, this.nosModules);
        } else if (
          activationTime &&
          activationCost &&
          gjNeutralized &&
          optimalRange
        ) {
          this.addNewModuleWithIndex(<NeutModule>{
            type: 'neut',
            index: -1,
            activationCost: activationCost,
            activationTime: activationTime,
            neutAmount: gjNeutralized,
            cpu: cpu,
            pg: pg,
            itemId: item.itemId,
            range: optimalRange
          }, this.neutModules);
        } else if (
          activationCost &&
          activationTime &&
          areaOfEffect &&
          sbDamage
        ) {
          this.addNewModuleWithIndex(<SmartbombModule>{
            type: 'sb',
            index: -1,
            activationCost: activationCost,
            activationTime: activationTime,
            range: areaOfEffect,
            damage: sbDamage,
            cpu: cpu,
            pg: pg,
            itemId: item.itemId
          }, this.sbModules);
        } else if (
          activationTime &&
          activationCost &&
          velocityBonus &&
          signatureModifier
        ) {
          this.addNewModuleWithIndex(<MircowarpModule>{
            type: 'mwd',
            index: -1,
            activationTime: activationTime,
            activationCost: activationCost,
            velocityBonus: velocityBonus,
            signatureRadiusModifier: signatureModifier,
            cpu: cpu,
            pg: pg,
            itemId: item.itemId
          }, this.mwdModules);
        } else if (
          activationTime &&
          activationCost &&
          velocityBonus
        ) {
          this.addNewModuleWithIndex(<AfterburnerModule>{
            type: 'mwd',
            index: -1,
            activationTime: activationTime,
            activationCost: activationCost,
            velocityBonus: velocityBonus,
            cpu: cpu,
            pg: pg,
            itemId: item.itemId
          }, this.abModules);
        } else if (
          capacitorBonus &&
          drainResistBonus
        ) {
          this.addNewModuleWithIndex(<BatteryModule>{
            type: 'battery',
            index: -1,
            capacitorBonus: capacitorBonus,
            drainResistanceBonus: drainResistBonus,
            cpu: cpu,
            pg: pg,
            itemId: item.itemId
          }, this.batteryModules);
        }
      });
    } catch (e: any) {
      console.error('Error fetching from ESI:', e);
      this.errorMessage = '' + e.message;
    }
    this.cdr.detectChanges();
  }

  private addNewModuleWithIndex(module: Module, collection: Module[]) {
    let index = 1;
    const indizes = collection.map(m => m.index);
    while (indizes.includes(index)) {
      index++;
    }
    module.index = index;
    collection.push(module);
  }

  public hasModuleType(type: string): boolean {
    switch (type) {
      case 'dps':
        return this.dpsModules.length > 0;
      case 'neut':
        return this.neutModules.length > 0;
      case 'nos':
        return this.nosModules.length > 0;
      case 'sb':
        return this.sbModules.length > 0;
      case 'battery':
        return this.batteryModules.length > 0;
      case 'ab':
        return this.abModules.length > 0;
      case 'mwd':
        return this.mwdModules.length > 0;
      default:
        return false;
    }
  }

  public calculateCombinations() {
    this.results = [];
    this.errorMessage = '';

    const totalModules = Object.keys(this.numModules).reduce((sum: number, type) => {
          sum += this.numModules[type];
          return sum;
        },
      0
    );

    if (!this.cpuBudget || !this.pgBudget || !this.numModules || totalModules <= 0) {
      this.errorMessage = 'Please enter valid budget and number of modules.';
      return;
    }

    // const combinations = this.generateCombinations(allModules);
    const combinations = this.generateLimitedCombinations({
        'dps': this.dpsModules,
        'sb': this.sbModules,
        'neut': this.neutModules,
        'nos': this.nosModules,
        'battery': this.batteryModules,
        'ab': this.abModules,
        'mwd': this.mwdModules
      },
      this.numModules
    );
    combinations.forEach((comb, index) => {
      const totalCpu = comb.reduce((sum, m) => sum + m.cpu, 0);
      const totalPg = comb.reduce((sum, m) => sum + m.pg, 0);
      if (totalCpu <= this.cpuBudget && totalPg <= this.pgBudget) {
        const dpsIncrease = this.calculateDpsIncrease(comb.filter(m => m.type === 'dps') as DpsModule[]);

        const smartbombs = comb.filter(m => m.type === 'sb') as SmartbombModule[];
        const smartbombDps = smartbombs.reduce((carry: number, current)=> {
          return carry + (current.damage / (current.activationTime / 1000));
        }, 0);
        const smartbombGjs = smartbombs.reduce((carry: number, current)=> {
          return carry + (current.activationCost / (current.activationTime / 1000));
        }, 0);

        const neuts = comb.filter(m => m.type === 'neut') as NeutModule[];
        const neutAmount = neuts.reduce((carry: number, current)=> {
          return carry + (current.neutAmount / (current.activationTime / 1000));
        }, 0);
        const neutGjs = neuts.reduce((carry: number, current)=> {
          return carry + (current.activationCost / (current.activationTime / 1000));
        }, 0);
        const neutRange = neuts.length === 0 ? 0 : neuts.reduce((carry: number, current)=> {
          return carry + current.range;
        }, 0) / neuts.length;

        const noses = comb.filter(m => m.type === 'nos') as NosModule[];
        const nosAmount = noses.reduce((carry: number, current)=> {
          return carry + (current.drainAmount / (current.activationTime / 1000));
        }, 0);
        const nosRange = noses.length === 0 ? 0 : noses.reduce((carry: number, current)=> {
          return carry + current.range;
        }, 0) / noses.length;

        this.results.push({
          id: index,
          modules: comb.map(m => ({type: m.type, index: m.index})) as {type: AbyssalModuleType, index: number}[],
          totalCpu,
          totalPg,
          dpsIncrease,
          smartbombDps,
          smartbombGjs,
          neutAmount,
          neutGjs,
          neutRange,
          nosAmount,
          nosRange
        });
      }
    });

    this.results.sort((a, b) => b.dpsIncrease - a.dpsIncrease);
  }

  // private generateCombinations(modules: Module[], start = 0, current: Module[] = []): Module[][] {
  //   // if (current.length === minimumCount) {
  //   //   return [current.slice()];
  //   // }
  //   const result: Module[][] = [];
  //   for (let i = start; i < modules.length; i++) {
  //     current.push(modules[i]);
  //     result.push(...this.generateCombinations(modules, i + 1, current));
  //     current.pop();
  //   }
  //   return result;
  // }
  //
  // private addModuleToCombination(module: Module, combination: Module[]): Module[] {
  //   if (combination.filter(m => m.type === module.type).length < this.numModules[module.type]) {
  //     combination.push(module);
  //   }
  //   return combination;
  // }



  // First, define a function to generate all combinations of size r from an array
  private combinations(arr: Module[], r: number): Module[][] {
    if (r === 0) {
      return [[]];
    }
    if (arr.length < r) {
      return [];
    }
    const result: Module[][] = [];
    for (let i = 0; i <= arr.length - r; i++) {
      const head = arr[i];
      const tails = this.combinations(arr.slice(i + 1), r - 1);
      for (const tail of tails) {
        result.push([head, ...tail]);
      }
    }
    return result;
  }

// Then, define a function for the Cartesian product that concatenates subsets
  private cartesianProduct(subsetLists: Module[][][]): Module[][] {
    return subsetLists.reduce((acc: Module[][], curr: Module[][]) => {
      const res: Module[][] = [];
      for (const a of acc) {
        for (const b of curr) {
          res.push([...a, ...b]);
        }
      }
      return res;
    }, [[]]);
  }

// Now, the main function to generate all limited combinations
  public generateLimitedCombinations(data: Record<string, Module[]>, limits: Record<string, number>): Module[][] {
    const allSubsets: Record<string, any[][]> = {};
    const keys = Object.keys(data);

    for (const key of keys) {
      const arr = data[key];
      const limit = limits[key] ?? 0; // Default to 0 if no limit specified
      const subsets: any[][] = [];
      for (let r = 0; r <= Math.min(limit, arr.length); r++) {
        subsets.push(...this.combinations(arr, r));
      }
      allSubsets[key] = subsets;
    }

    const subsetLists = keys.map(key => allSubsets[key]);
    const maxFilteredCombinations = this.cartesianProduct(subsetLists);
    return maxFilteredCombinations.filter(set => {
      return !Object.keys(this.numModules).some(type => set.filter(set => set.type === type).length !== this.numModules[type]);
    });
  }

  private calculateDpsIncrease(modules: DpsModule[]): number {
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
