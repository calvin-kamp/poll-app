import { InjectionToken } from '@angular/core';

export interface FormGroupApi {
    getGroupName(): string;

    isDisabled(): boolean;
    isInvalid(): boolean;

    getDescribedById(): string | null;

    isChecked(optionValue: string): boolean;
    setChecked(optionValue: string, isChecked: boolean): void;

    getSelectedValue(): string;
    setSelectedValue(nextValue: string): void;

    notifyTouched(): void;
}

export const FORM_GROUP = new InjectionToken<FormGroupApi>('FORM_GROUP');
