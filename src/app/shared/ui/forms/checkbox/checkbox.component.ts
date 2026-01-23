import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'ui-checkbox',
    imports: [ReactiveFormsModule],
    templateUrl: './checkbox.component.html',
    styleUrl: './checkbox.component.scss',
})

export class CheckboxComponent {
    label = input.required<string>();
    name = input.required<string>();
    errorMessage = input<string>('');

    control = input<FormControl<string | null>>(new FormControl<string | null>(null));
}
