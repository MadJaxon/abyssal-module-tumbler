import { Component } from '@angular/core';
import {AbyssalTumbler} from './abyssal-tumbler/abyssal-tumbler';

@Component({
  selector: 'app-root',
  imports: [AbyssalTumbler],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
