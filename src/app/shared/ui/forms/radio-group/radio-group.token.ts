import { InjectionToken } from '@angular/core';

export interface RadioGroupApi {
    getGroupName(): string;

    isDisabled(): boolean;
    isInvalid(): boolean;

    getDescribedById(): string | null;

    getSelectedValue(): string;
    setSelectedValue(nextValue: string): void;

    notifyTouched(): void;
}

export const RADIO_GROUP = new InjectionToken<RadioGroupApi>('RADIO_GROUP');
