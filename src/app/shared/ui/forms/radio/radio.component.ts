import { Component, computed, inject, input, signal } from '@angular/core';
import { FORM_GROUP, FormGroupApi } from '../form-group/form-group.token';

@Component({
    selector: 'ui-radio',
    templateUrl: './radio.component.html',
    styleUrl: './radio.component.scss',
})

export class RadioComponent {
    label = input.required<string>();

    name = input<string>('');
    value = input.required<string>();

    private radioGroup: FormGroupApi | null = inject(FORM_GROUP, { optional: true });

    isReadySignal = signal(true);

    isGroupMode = computed(() => {
        return !!this.radioGroup;
    });

    get resolvedName(): string {
        const explicitName = this.name();

        if (explicitName) {
            return explicitName;
        }

        if (this.isGroupMode()) {
            return this.radioGroup!.getGroupName();
        }

        return '';
    }

    get checked(): boolean {
        if (!this.isGroupMode()) {
            return false;
        }

        return this.radioGroup!.getSelectedValue() === this.value();
    }

    get disabled(): boolean {
        if (!this.isGroupMode()) {
            return false;
        }

        return this.radioGroup!.isDisabled();
    }

    get isInvalid(): boolean {
        if (!this.isGroupMode()) {
            return false;
        }

        return this.radioGroup!.isInvalid();
    }

    get describedById(): string | null {
        if (!this.isGroupMode()) {
            return null;
        }

        return this.radioGroup!.getDescribedById();
    }

    onSelect(): void {
        if (!this.isGroupMode()) {
            return;
        }

        this.radioGroup!.setSelectedValue(this.value());
    }

    onBlur(): void {
        if (!this.isGroupMode()) {
            return;
        }

        this.radioGroup!.notifyTouched();
    }
}
