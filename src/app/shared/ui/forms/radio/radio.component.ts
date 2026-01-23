import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'ui-radio',
    imports: [ReactiveFormsModule],
    templateUrl: './radio.component.html',
    styleUrl: './radio.component.scss',
})

export class RadioComponent {
    label = input.required<string>();
    name = input.required<string>();
    value = input.required<string>();
    errorMessage = input<string>('');

    control = input<FormControl<string | null>>(new FormControl<string | null>(null));
}
