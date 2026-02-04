import { AfterViewInit, Component, Injector, effect, forwardRef, inject, input, runInInjectionContext, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl, ValidatorFn, Validators, ValidationErrors } from '@angular/forms';
import { FORM_GROUP, type FormGroupApi } from './form-group.token';

type FormGroupType = 'checkbox' | 'radio' | 'generic';

@Component({
    selector: 'ui-form-group',
    templateUrl: './form-group.component.html',
    styleUrl: './form-group.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FormGroupComponent),
            multi: true,
        },
        {
            provide: FORM_GROUP,
            useExisting: forwardRef(() => FormGroupComponent),
        },
    ],
})

export class FormGroupComponent implements ControlValueAccessor, AfterViewInit, FormGroupApi {
    label = input<string>('');
    name = input<string>('');
    type = input<FormGroupType>('generic');

    required = input<boolean>(false);

    minSelected = input<number | null>(null);
    maxSelected = input<number | null>(null);

    errorMessages = input<Record<string, string>>({});

    private injector = inject(Injector);

    private selectedValuesSignal = signal<string[]>([]);
    private selectedValueSignal = signal<string>('');
    private disabledSignal = signal(false);

    isReadySignal = signal(false);

    private ngControl: NgControl | null = null;
    private controlRef: AbstractControl | null = null;

    private managedValidators: ValidatorFn[] = [];

    private onChange: (value: string[] | string) => void = () => { };
    private onTouched: () => void = () => { };

    private readonly uid = `ui-form-group-${Math.random().toString(36).slice(2, 9)}`;

    ngAfterViewInit(): void {
        this.ngControl = this.injector.get(NgControl, null, { self: true, optional: true });

        if (this.ngControl) {
            this.ngControl.valueAccessor = this;
        }

        this.controlRef = this.ngControl?.control ?? null;

        if (!this.controlRef) {
            queueMicrotask(() => {
                this.isReadySignal.set(true);
            });

            return;
        }

        runInInjectionContext(this.injector, () => {
            effect(() => {
                this.type();
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
        if (this.type() !== 'checkbox') {
            return false;
        }

        const selectedValues = this.selectedValuesSignal();

        return selectedValues.includes(optionValue);
    }

    setChecked(optionValue: string, isChecked: boolean): void {
        if (this.type() !== 'checkbox') {
            return;
        }

        const selectedValues = this.selectedValuesSignal();
        const selectedValuesSet = new Set<string>(selectedValues);

        if (isChecked) {
            selectedValuesSet.add(optionValue);
        } else {
            selectedValuesSet.delete(optionValue);
        }

        const nextValues = Array.from(selectedValuesSet);

        this.selectedValuesSignal.set(nextValues);
        this.onChange(nextValues);
        this.onTouched();
    }

    getSelectedValue(): string {
        if (this.type() !== 'radio') {
            return '';
        }

        return this.selectedValueSignal();
    }

    setSelectedValue(nextValue: string): void {
        if (this.type() !== 'radio') {
            return;
        }

        this.selectedValueSignal.set(nextValue);
        this.onChange(nextValue);
        this.onTouched();
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
        required: () => 'Please select one option.',
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

        const validationErrors = (this.ngControl?.control?.errors as ValidationErrors | null) ?? null;

        if (!validationErrors) {
            return [];
        }

        const configuredMessages = this.errorMessages();

        const configuredMessageKeys = Object.keys(configuredMessages);
        const orderedKeys = configuredMessageKeys.filter((errorKey) => errorKey in validationErrors);

        const errorKeys = orderedKeys.length ? orderedKeys : Object.keys(validationErrors);

        return errorKeys.map((errorKey) => {
            const errorValue = (validationErrors as any)[errorKey];
            const messageTemplate = configuredMessages[errorKey] ?? this.fallbackMessage(errorKey, errorValue);

            return this.interpolate(messageTemplate, errorValue);
        });
    }

    private applyManagedValidators(control: AbstractControl): void {
        if (this.managedValidators.length) {
            control.removeValidators(this.managedValidators);
        }

        const nextValidators: ValidatorFn[] = [];
        const configuredType = this.type();

        if (configuredType === 'checkbox') {
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

        } else if (configuredType === 'radio') {
            if (this.required()) {
                nextValidators.push(Validators.required);
            }
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

    writeValue(value: string[] | string | null): void {
        const configuredType = this.type();

        if (configuredType === 'checkbox') {
            const nextValues = Array.isArray(value) ? value : [];
            this.selectedValuesSignal.set(nextValues);

            return;
        }

        if (configuredType === 'radio') {
            this.selectedValueSignal.set(typeof value === 'string' ? value : '');

            return;
        }

        if (Array.isArray(value)) {
            this.selectedValuesSignal.set(value);
        } else {
            this.selectedValueSignal.set(typeof value === 'string' ? value : '');
        }
    }

    registerOnChange(changeHandler: (value: string[] | string) => void): void {
        this.onChange = changeHandler;
    }

    registerOnTouched(touchedHandler: () => void): void {
        this.onTouched = touchedHandler;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabledSignal.set(isDisabled);
    }
}
