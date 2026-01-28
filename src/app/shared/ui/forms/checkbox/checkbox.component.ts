import { AfterViewInit, Component, Injector, computed, effect, forwardRef, inject, input, runInInjectionContext, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl, ValidatorFn, Validators, ValidationErrors } from '@angular/forms';
import { CHECKBOX_GROUP, type CheckboxGroupApi } from '../checkbox-group/checkbox-group.token';

@Component({
    selector: 'ui-checkbox',
    templateUrl: './checkbox.component.html',
    styleUrl: './checkbox.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CheckboxComponent),
            multi: true,
        },
    ],
})

export class CheckboxComponent implements ControlValueAccessor, AfterViewInit {
    label = input.required<string>();

    name = input<string>('');
    value = input<string>('');
    required = input<boolean>(false);

    errorMessages = input<Record<string, string>>({});

    private injector = inject(Injector);

    private checkboxGroup: CheckboxGroupApi | null = inject(CHECKBOX_GROUP, { optional: true });

    private valueSignal = signal<boolean>(false);
    private disabledSignal = signal(false);

    isReadySignal = signal(false);

    private ngControl: NgControl | null = null;
    private controlRef: AbstractControl | null = null;

    private managedValidators: ValidatorFn[] = [];

    private onChange: (value: boolean) => void = () => { };
    private onTouched: () => void = () => { };

    private readonly uid = `ui-checkbox-${Math.random().toString(36).slice(2, 9)}`;

    isGroupMode = computed(() => {
        return !!this.checkboxGroup;
    });

    private get optionValue(): string {
        const explicitValue = this.value();

        if (explicitValue) {
            return explicitValue;
        }

        const inputName = this.name();

        if (inputName) {
            return inputName;
        }

        return '';
    }

    ngAfterViewInit(): void {
        this.ngControl = this.injector.get(NgControl, null, { self: true, optional: true });
        this.controlRef = this.ngControl?.control ?? null;

        if (this.controlRef) {
            runInInjectionContext(this.injector, () => {
                effect(() => {
                    this.required();

                    this.applyManagedValidators(this.controlRef!);
                });
            });
        }

        queueMicrotask(() => {
            this.isReadySignal.set(true);
        });
    }

    get errorId(): string {
        return `${this.uid}-errors`;
    }

    get checked(): boolean {
        if (this.isGroupMode()) {
            return this.checkboxGroup!.isChecked(this.optionValue);
        }

        return this.valueSignal();
    }

    get disabled(): boolean {
        if (this.isGroupMode()) {
            return this.checkboxGroup!.isDisabled();
        }

        return this.disabledSignal();
    }

    get resolvedName(): string {
        const explicitName = this.name();

        if (explicitName) {
            return explicitName;
        }

        if (this.isGroupMode()) {
            return this.checkboxGroup!.getGroupName();
        }

        return '';
    }

    get isInvalid(): boolean {
        if (this.isGroupMode()) {
            return this.checkboxGroup!.isInvalid();
        }

        if (!this.isReadySignal()) {
            return false;
        }

        return !!this.ngControl?.control?.invalid;
    }

    get describedById(): string | null {
        if (this.isGroupMode()) {
            return this.checkboxGroup!.getDescribedById();
        }

        if (this.errorMessage) {
            return this.errorId;
        }

        return null;
    }

    private get shouldShowError(): boolean {
        if (this.isGroupMode()) {
            return false;
        }

        if (!this.isReadySignal()) {
            return false;
        }

        const formControl = this.ngControl?.control;

        return !!formControl && formControl.invalid && formControl.touched;
    }

    private readonly defaultMessages: Record<string, (errorData: any) => string> = {
        required: () => 'This field must be checked.',
    };

    private fallbackMessage(errorKey: string, errorValue: any): string {
        const messageFactory = this.defaultMessages[errorKey];

        if (messageFactory) {
            return messageFactory(errorValue);
        }

        return 'Invalid value.';
    }

    get errorMessage(): string | null {
        if (!this.shouldShowError) {
            return null;
        }

        const validationErrors = (this.ngControl?.control?.errors as ValidationErrors | null) ?? null;

        if (!validationErrors) {
            return null;
        }

        const configuredMessages = this.errorMessages();

        const configuredKeys = Object.keys(configuredMessages);
        const firstConfiguredKey = configuredKeys.find((errorKey) => errorKey in validationErrors);

        const firstErrorKey = firstConfiguredKey ?? Object.keys(validationErrors)[0];

        if (!firstErrorKey) {
            return null;
        }

        const errorValue = (validationErrors as any)[firstErrorKey];

        return configuredMessages[firstErrorKey] ?? this.fallbackMessage(firstErrorKey, errorValue);
    }

    private applyManagedValidators(control: AbstractControl): void {
        if (this.isGroupMode()) {
            return;
        }

        if (this.managedValidators.length) {
            control.removeValidators(this.managedValidators);
        }

        const nextValidators: ValidatorFn[] = [];

        if (this.required()) {
            nextValidators.push(Validators.requiredTrue);
        }

        control.addValidators(nextValidators);
        this.managedValidators = nextValidators;

        control.updateValueAndValidity({ emitEvent: false });
    }

    onToggle(isChecked: boolean): void {
        if (this.isGroupMode()) {
            this.checkboxGroup!.setChecked(this.optionValue, isChecked);

            return;
        }

        this.valueSignal.set(isChecked);
        this.onChange(isChecked);
    }

    onBlur(): void {
        if (this.isGroupMode()) {
            this.checkboxGroup!.notifyTouched();
            return;
        }

        this.onTouched();
    }

    writeValue(value: boolean | null): void {
        this.valueSignal.set(!!value);
    }

    registerOnChange(changeHandler: (value: boolean) => void): void {
        this.onChange = changeHandler;
    }

    registerOnTouched(touchedHandler: () => void): void {
        this.onTouched = touchedHandler;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabledSignal.set(isDisabled);
    }
}
