import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-type-icon',
  imports: [],
  templateUrl: './type-icon.html',
  styleUrl: './type-icon.scss',
})
export class TypeIcon {
  @Input() height: number = 3;
  @Input() id?: number;
  @Input() title: string = '';
}
