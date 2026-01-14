import {ChangeDetectorRef, Component, EventEmitter, Input, Output} from '@angular/core';
import {DecimalPipe, NgTemplateOutlet} from '@angular/common';
import {AbyssalService} from '../../abyssal-service';
import {Module} from '../../interfaces';
import {TypeIcon} from '../type-icon/type-icon';

@Component({
  selector: 'app-module-browser',
  imports: [
    NgTemplateOutlet,
    TypeIcon,
    DecimalPipe
  ],
  templateUrl: './module-browser.html',
  styleUrl: './module-browser.scss',
})
export class ModuleBrowser {

  @Input() cacheUrl: string = '';
  @Output() addModules: EventEmitter<Module[]> = new EventEmitter<Module[]>();

  public activeTab: 'mutamarket'|'esi' = 'mutamarket';
  public mutaLoading: boolean = false;
  public modules: {[key: string]: Module[]} = {
    mutamarket: [],
    esi: []
  };

  constructor(
    private abyssalService: AbyssalService,
    private cdr: ChangeDetectorRef
  ) {
  }

  // https://mutamarket.com/modules/type/abyssal-vorton-tuning-system/attributes/dpsincreaseturrets/1.26726-1.31215
  // https://mutamarket.com/api/modules/type/abyssal-vorton-tuning-system/attributes/dpsincreaseturrets/1.26726-1.31215

  public async parseMutaUrl(url: HTMLInputElement) {
    if (
      this.mutaLoading ||
      !url.value.startsWith('https://mutamarket.com/modules/type/')
    ) {
      return;
    }
    this.mutaLoading = true;
    this.modules['mutamarket'] = [];
    this.cdr.detectChanges();
    const success = await this.abyssalService.getMutamarketModules(url.value);
    if (success !== null) {
      url.value = '';
      this.modules['mutamarket'] = success.filter(module => module !== null).sort((a, b) => (b?.estPrice ?? 0) - (a?.estPrice ?? 0));
    }
    this.mutaLoading = false;
    this.cdr.detectChanges();
  }

  public addAllToSelection(type: string): void {
    this.addModules.emit(this.modules[type]);
  }

  public addToSelection(module: Module) {
    this.addModules.emit([module]);
  }
}
