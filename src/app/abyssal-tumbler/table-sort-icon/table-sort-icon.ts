import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Result, TableSorter} from '../../interfaces';

@Component({
  selector: 'app-table-sort-icon',
  imports: [],
  templateUrl: './table-sort-icon.html',
  styleUrl: './table-sort-icon.scss',
})
export class TableSortIcon {
  @Input() type: keyof Result =  'id';
  @Input() sorts: {[key: string]: TableSorter} = {};

  @Output() onSortChange: EventEmitter<{[key: string]: TableSorter}> = new EventEmitter<{[key: string]: TableSorter}>();



  public getSortIcon() {
    const sort: TableSorter = this.sorts[this.type];
    if (!sort) {
      return '-';
    } else {
      return sort.direction === 'asc' ? '^' : 'v';
    }
  }

  public toggleSort() {
    const sort: TableSorter = this.sorts[this.type];
    if (!sort) {
      this.sorts[this.type] = <TableSorter>{
        key: this.type,
        direction: 'desc'
      };
    } else if (this.sorts[this.type].direction === 'desc') {
      this.sorts[this.type].direction = 'asc';
    } else {
      delete this.sorts[this.type];
    }
    this.onSortChange.emit(this.sorts);
    // this.results = this.multiSort(this.results, Object.values(this.sorts));
    // this.cdr.detectChanges();
  }
}
