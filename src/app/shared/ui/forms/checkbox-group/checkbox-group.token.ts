import { InjectionToken } from '@angular/core';

export interface CheckboxGroupApi {
    getGroupName(): string;

    isDisabled(): boolean;
    isInvalid(): boolean;

    getDescribedById(): string | null;

    isChecked(optionValue: string): boolean;
    setChecked(optionValue: string, isChecked: boolean): void;

    notifyTouched(): void;
}

export const CHECKBOX_GROUP = new InjectionToken<CheckboxGroupApi>('CHECKBOX_GROUP');
