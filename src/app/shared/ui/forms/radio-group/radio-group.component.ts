import { AfterViewInit, Component, Injector, effect, forwardRef, inject, input, runInInjectionContext, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl, ValidatorFn, Validators, ValidationErrors } from '@angular/forms';
import { RADIO_GROUP, type RadioGroupApi } from './radio-group.token';

@Component({
    selector: 'ui-radio-group',
    templateUrl: './radio-group.component.html',
    styleUrl: './radio-group.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => RadioGroupComponent),
            multi: true,
        },
        {
            provide: RADIO_GROUP,
            useExisting: forwardRef(() => RadioGroupComponent),
        },
    ],
})

export class RadioGroupComponent implements ControlValueAccessor, AfterViewInit, RadioGroupApi {
    label = input.required<string>();
    name = input.required<string>();

    required = input<boolean>(false);

    errorMessages = input<Record<string, string>>({});

    private injector = inject(Injector);

    private selectedValueSignal = signal<string>('');
    private disabledSignal = signal(false);

    isReadySignal = signal(false);

    private ngControl: NgControl | null = null;
    private controlRef: AbstractControl | null = null;

    private managedValidators: ValidatorFn[] = [];

    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    private readonly uid = `ui-radio-group-${Math.random().toString(36).slice(2, 9)}`;

    ngAfterViewInit(): void {
        this.ngControl = this.injector.get(NgControl, null, { self: true, optional: true });
        this.controlRef = this.ngControl?.control ?? null;

        if (!this.controlRef) {
            return;
        }

        runInInjectionContext(this.injector, () => {
            effect(() => {
                this.required();

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

    getSelectedValue(): string {
        return this.selectedValueSignal();
    }

    setSelectedValue(nextValue: string): void {
        this.selectedValueSignal.set(nextValue);
        this.onChange(nextValue);
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
    };

    private fallbackMessage(errorKey: string, errorValue: any): string {
        const messageFactory = this.defaultMessages[errorKey];

        if (messageFactory) {
            return messageFactory(errorValue);
        }

        return 'Invalid value.';
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

            return messageTemplate;
        });
    }

    private applyManagedValidators(control: AbstractControl): void {
        if (this.managedValidators.length) {
            control.removeValidators(this.managedValidators);
        }

        const nextValidators: ValidatorFn[] = [];

        if (this.required()) {
            nextValidators.push(Validators.required);
        }

        control.addValidators(nextValidators);
        this.managedValidators = nextValidators;

        control.updateValueAndValidity({ emitEvent: false });
    }

    writeValue(value: string | null): void {
        this.selectedValueSignal.set(value ?? '');
    }

    registerOnChange(changeHandler: (value: string) => void): void {
        this.onChange = changeHandler;
    }

    registerOnTouched(touchedHandler: () => void): void {
        this.onTouched = touchedHandler;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabledSignal.set(isDisabled);
    }
}
