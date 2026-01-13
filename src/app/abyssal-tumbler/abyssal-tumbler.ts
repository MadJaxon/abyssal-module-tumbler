import {ChangeDetectorRef, Component, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AsyncPipe, DecimalPipe} from '@angular/common';
import {AbyssalService} from '../abyssal-service';
import {TableSortIcon} from './table-sort-icon/table-sort-icon';
import {
  AbyssalModuleType,
  ActiveModule,
  AfterburnerModule,
  BatteryModule,
  DpsModule,
  MircowarpModule,
  Module,
  NeutModule,
  NosModule,
  Result,
  SmartbombModule,
  TableSorter, WorkerCommand, WorkerCalcCombinationsData, WorkerSortData
} from '../interfaces';
import {BehaviorSubject} from 'rxjs';
import { CdkVirtualForOf, ScrollingModule as StandardScrollingModule} from '@angular/cdk/scrolling';
import {CdkAutoSizeVirtualScroll, ScrollingModule } from '@angular/cdk-experimental/scrolling';


@Component({
  selector: 'app-abyssal-tumbler',
  imports: [
    FormsModule,
    DecimalPipe,
    TableSortIcon,
    StandardScrollingModule,
    ScrollingModule,
    CdkVirtualForOf,
    AsyncPipe,
    CdkAutoSizeVirtualScroll
  ],
  templateUrl: './abyssal-tumbler.html',
  styleUrl: './abyssal-tumbler.scss',
})
export class AbyssalTumbler {

  @ViewChild(CdkAutoSizeVirtualScroll) viewport!: CdkAutoSizeVirtualScroll;

  public readonly abyssalModuleTypes: AbyssalModuleType[] = ['dps', 'sb', 'neut', 'nos', 'battery', 'ab', 'mwd'];
  public readonly abyssalModuleTranslations: {[key: string]: string} = {
    'dps': 'DPS-Module',
    'sb': 'Smartbombs',
    'neut': 'Neutralizer',
    'nos': 'Nosferatu',
    'battery': 'Cap Battery',
    'ab': 'Afterburner',
    'mwd': 'Microwarpdrive'
  };
  public currentAbyssalModuleType = 'dps';

  public isCalculating: boolean = false;
  public calcProgress: number = 0;
  public debug: boolean = false; // toggle for local debugging
  public debugData?: any;
  public sorts: {[key: string]: TableSorter} = {};

  public cpuBudget: number = 10000;
  public pgBudget: number = 10000;
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
  public resultLength: number = 0;
  private results: Result[] = [];
  public $tableEntries: BehaviorSubject<Result[]> = new BehaviorSubject<Result[]>([]);
  public errorMessage: string = '';
  public useCacheLayer: boolean = false;
  public cacheLayerUrl: string = 'http://localhost:3000';
  public uniqueCombinations: boolean = false;

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

  public updateUniqueCombinations(toogle: boolean) {
    this.uniqueCombinations = toogle;
    this.multiSort(this.sorts);
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
            type: 'ab',
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

  public hasCapCost() {
    const moduleTypes: AbyssalModuleType[] = [
      'neut',
      'sb',
      'ab',
      'mwd'
    ]
    return moduleTypes.some(type => this.numModules[type] > 0);
  }

  public hasModuleType(type: AbyssalModuleType): boolean {
    if (this.numModules[type] === 0) {
      return false;
    }
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

  public trackById(index: number, result: Result) {
    return result.id;
  }

  public multiSort(sorters: {[key: string]: TableSorter}): void {
    this.sorts = sorters;
    this.isCalculating = true;
    this.calcProgress = -1;
    this.cdr.detectChanges();
    this.startWorker({
      action: 'sort',
      data: {
        results: this.results,
        sorts: Object.values(this.sorts),
        makeUnique: this.uniqueCombinations
      } as WorkerSortData
    },
    (event) => {
      this.$tableEntries.next(event.data.data.results);
      this.resultLength = event.data.data.results.length;
      this.calcProgress = 0;
      this.isCalculating = false;
      this.cdr.detectChanges();
      return true;
    }
    );
  }

  public calculateCombinations() {
    this.results = [];
    this.$tableEntries.next([]);
    this.resultLength = 0;
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

    this.isCalculating = true;
    this.calcProgress = 0;
    this.cdr.detectChanges();
    this.startWorker({
      action: 'findCombinations',
      data: <WorkerCalcCombinationsData>{
        modules: {
          dps: this.dpsModules,
          sb: this.sbModules,
          neut: this.neutModules,
          nos: this.nosModules,
          battery: this.batteryModules,
          ab: this.abModules,
          mwd: this.mwdModules
        },
        sorts: Object.values(this.sorts),
        numModules: this.numModules,
        cpuBudget: this.cpuBudget,
        pgBudget: this.pgBudget
      }
    }, (event) => {
      if (event.data.error) {
        console.log(event.data.error);
        this.errorMessage = event.data.error;
        this.isCalculating = false;
        this.cdr.detectChanges();
        return true;
      } else {
        if (event.data.isUpdate) {
          this.calcProgress = event.data.data;
          this.cdr.detectChanges();
          return false;
        } else {
          this.results = event.data.data.results;
          this.resultLength = event.data.data.results.length;
          this.isCalculating = false;
          this.calcProgress = 0;
          this.multiSort(this.sorts);
          return true;
        }
      }
    })
  }

  private startWorker(command: WorkerCommand, callback: (event: MessageEvent) => boolean) {
    const worker = new Worker(new URL('./calculations.worker.ts', import.meta.url), {type: "module"});

    console.log('Starting worker:' + command.action);
    // Receive results
    worker.onmessage = (event: MessageEvent) => {
      if (callback(event)) {
        worker.terminate();
        console.log('End worker:' + command.action);
      }
    };

    // Error handling
    worker.onerror = (error) => {
      debugger
      console.error('Worker error:', error);
      this.errorMessage = 'Calculation failed.';
      this.isCalculating = false;
      this.cdr.detectChanges();
      worker.terminate();
    };
    // Send data to worker
    worker.postMessage(command);
  }
}
