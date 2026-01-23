import { Component, computed, effect, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'ui-textarea',
    imports: [ReactiveFormsModule],
    templateUrl: './textarea.component.html',
    styleUrl: './textarea.component.scss',
})

export class TextareaComponent {
    label = input.required<string>();
    name = input.required<string>();
    type = input<'text' | 'password' | 'email' | 'number'>('text');
    errorMessage = input<string>('');

    control = input<FormControl<string | null>>(new FormControl<string | null>(null));

    private isFocused = signal(false);
    private hasValue = signal(false);

    isLabelFloated = computed(() => this.isFocused() || this.hasValue());

    constructor() {
        effect((onCleanup) => {
            const c = this.control();

            this.hasValue.set(((c.value ?? '').trim().length > 0));

            const sub = c.valueChanges.subscribe((v) => {
                this.hasValue.set(((v ?? '').trim().length > 0));
            });

            onCleanup(() => sub.unsubscribe());
        });
    }

    onFocusIn() {
        this.isFocused.set(true);
    }

    onFocusOut() {
        this.isFocused.set(false);
    }
}
