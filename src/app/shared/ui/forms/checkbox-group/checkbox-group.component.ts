import { AfterViewInit, Component, Injector, effect, forwardRef, inject, input, runInInjectionContext, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { CHECKBOX_GROUP, CheckboxGroupApi } from './checkbox-group.token';

@Component({
    selector: 'ui-checkbox-group',
    standalone: true,
    templateUrl: './checkbox-group.component.html',
    styleUrl: './checkbox-group.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CheckboxGroupComponent),
            multi: true,
        },
        {
            provide: CHECKBOX_GROUP,
            useExisting: forwardRef(() => CheckboxGroupComponent),
        },
    ],
})

export class CheckboxGroupComponent implements ControlValueAccessor, AfterViewInit, CheckboxGroupApi {
    label = input.required<string>();
    name = input.required<string>();

    required = input<boolean>(false);

    minSelected = input<number | null>(null);
    maxSelected = input<number | null>(null);

    errorMessages = input<Record<string, string>>({});

    private injector = inject(Injector);

    private selectedValuesSignal = signal<string[]>([]);
    private disabledSignal = signal(false);

    isReadySignal = signal(false);

    private ngControl: NgControl | null = null;
    private controlRef: AbstractControl | null = null;

    private managedValidators: ValidatorFn[] = [];

    private onChange: (value: string[]) => void = () => { };
    private onTouched: () => void = () => { };

    private readonly uid = `ui-checkbox-group-${Math.random().toString(36).slice(2, 9)}`;

    ngAfterViewInit(): void {
        this.ngControl = this.injector.get(NgControl, null, { self: true, optional: true });
        this.controlRef = this.ngControl?.control ?? null;

        if (!this.controlRef) {
            return;
        }

        runInInjectionContext(this.injector, () => {
            effect(() => {
                this.required();
                this.minSelected();
                this.maxSelected();

                this.applyManagedValidators(this.controlRef!);
            });
        });

        queueMicrotask(() => {
            this.isReadySignal.set(true);
        });
    }

    getGroupName(): string {
        return this.name();
    }

    isDisabled(): boolean {
        return this.disabledSignal();
    }

    isInvalid(): boolean {
        if (!this.isReadySignal()) {
            return false;
        }

        return !!this.ngControl?.control?.invalid;
    }

    getDescribedById(): string | null {
        if (!this.isReadySignal()) {
            return null;
        }

        if (!this.errorList.length) {
            return null;
        }

        return this.errorId;
    }

    isChecked(optionValue: string): boolean {
        const selectedValues = this.selectedValuesSignal();

        return selectedValues.includes(optionValue);
    }

    setChecked(optionValue: string, isChecked: boolean): void {
        const selectedValues = this.selectedValuesSignal();
        const selectedValuesSet = new Set<string>(selectedValues);

        if (isChecked) {
            selectedValuesSet.add(optionValue);
        }
        else {
            selectedValuesSet.delete(optionValue);
        }

        const nextValues = Array.from(selectedValuesSet);

        this.selectedValuesSignal.set(nextValues);
        this.onChange(nextValues);
    }

    notifyTouched(): void {
        this.onTouched();
    }

    get errorId(): string {
        return `${this.uid}-errors`;
    }

    private get shouldShowError(): boolean {
        if (!this.isReadySignal()) {
            return false;
        }

        const formControl = this.ngControl?.control;

        return !!formControl && formControl.invalid && formControl.touched;
    }

    private readonly defaultMessages: Record<string, (errorData: any) => string> = {
        minSelected: (errorData) => `Please select at least ${errorData.required} option(s).`,
        maxSelected: (errorData) => `Please select at most ${errorData.required} option(s).`,
    };

    private fallbackMessage(errorKey: string, errorValue: any): string {
        const messageFactory = this.defaultMessages[errorKey];

        if (messageFactory) {
            return messageFactory(errorValue);
        }

        return 'Invalid value.';
    }

    private interpolate(template: string, errorValue: any): string {
        if (!template) {
            return template;
        }

        if (!errorValue || typeof errorValue !== 'object') {
            return template;
        }

        return template.replace(/\{(\w+)\}/g, (_matchedText, tokenKey: string) => {
            const tokenValue = errorValue?.[tokenKey];

            if (tokenValue === undefined || tokenValue === null) {
                return `{${tokenKey}}`;
            }

            return String(tokenValue);
        });
    }

    get errorList(): string[] {
        if (!this.shouldShowError) {
            return [];
        }

        const validationErrors =
            (this.ngControl?.control?.errors as ValidationErrors | null) ?? null;

        if (!validationErrors) {
            return [];
        }

        const configuredMessages = this.errorMessages();

        const configuredMessageKeys = Object.keys(configuredMessages);
        const orderedKeys = configuredMessageKeys.filter((errorKey) => errorKey in validationErrors);

        const errorKeys = orderedKeys.length ? orderedKeys : Object.keys(validationErrors);

        return errorKeys.map((errorKey) => {
            const errorValue = (validationErrors as any)[errorKey];
            const messageTemplate =
                configuredMessages[errorKey] ?? this.fallbackMessage(errorKey, errorValue);

            return this.interpolate(messageTemplate, errorValue);
        });
    }

    private applyManagedValidators(control: AbstractControl): void {
        if (this.managedValidators.length) {
            control.removeValidators(this.managedValidators);
        }

        const nextValidators: ValidatorFn[] = [];

        const configuredMinSelected = this.minSelected();
        const configuredMaxSelected = this.maxSelected();

        let effectiveMinSelected: number | null = configuredMinSelected;

        if (this.required()) {
            if (effectiveMinSelected === null) {
                effectiveMinSelected = 1;
            } else {
                effectiveMinSelected = Math.max(1, effectiveMinSelected);
            }
        }

        if (effectiveMinSelected !== null) {
            nextValidators.push(this.minSelectedValidator(effectiveMinSelected));
        }

        if (configuredMaxSelected !== null) {
            nextValidators.push(this.maxSelectedValidator(configuredMaxSelected));
        }

        control.addValidators(nextValidators);
        this.managedValidators = nextValidators;

        control.updateValueAndValidity({ emitEvent: false });
    }

    private minSelectedValidator(minSelected: number): ValidatorFn {
        return (formControl: AbstractControl): ValidationErrors | null => {
            const value = formControl.value;
            const selectedValues = Array.isArray(value) ? value : [];
            const actualSelected = selectedValues.length;

            if (actualSelected >= minSelected) {
                return null;
            }

            return {
                minSelected: {
                    required: minSelected,
                    actual: actualSelected,
                },
            };
        };
    }

    private maxSelectedValidator(maxSelected: number): ValidatorFn {
        return (formControl: AbstractControl): ValidationErrors | null => {
            const value = formControl.value;
            const selectedValues = Array.isArray(value) ? value : [];
            const actualSelected = selectedValues.length;

            if (actualSelected <= maxSelected) {
                return null;
            }

            return {
                maxSelected: {
                    required: maxSelected,
                    actual: actualSelected,
                },
            };
        };
    }

    writeValue(value: string[] | null): void {
        const nextValues = Array.isArray(value) ? value : [];

        this.selectedValuesSignal.set(nextValues);
    }

    registerOnChange(changeHandler: (value: string[]) => void): void {
        this.onChange = changeHandler;
    }

    registerOnTouched(touchedHandler: () => void): void {
        this.onTouched = touchedHandler;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabledSignal.set(isDisabled);
    }
}
