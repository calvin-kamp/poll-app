import { Component, input } from '@angular/core';

@Component({
    selector: 'ui-input',
    imports: [],
    templateUrl: './input.component.html',
    styleUrl: './input.component.scss',
})

export class InputComponent {
    label = input<string>('');
    type = input<'text' | 'password' | 'email' | 'number'>('text');
    placeholder = input<string>('');
    errorMessage = input<string>('');
}
