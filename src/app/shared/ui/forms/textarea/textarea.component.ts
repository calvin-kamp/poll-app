import { AfterViewInit, Component, Injector, computed, effect, forwardRef, inject, input, runInInjectionContext, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl, ValidatorFn, Validators, ValidationErrors } from '@angular/forms';

@Component({
    selector: 'ui-textarea',
    templateUrl: './textarea.component.html',
    styleUrl: './textarea.component.scss',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TextareaComponent),
            multi: true,
        },
    ],
})

export class TextareaComponent implements ControlValueAccessor, AfterViewInit {
    label = input.required<string>();
    name = input.required<string>();

    rows = input<number>(4);

    required = input<boolean>(false);
    minLength = input<number | null>(null);
    maxLength = input<number | null>(null);
    validators = input<ValidatorFn[]>([]);

    errorMessages = input<Record<string, string>>({});

    private injector = inject(Injector);

    private isFocusedSignal = signal(false);
    private valueSignal = signal<string>('');
    private disabledSignal = signal(false);

    isReadySignal = signal(false);

    isLabelFloated = computed(() => {
        return this.isFocusedSignal() || this.valueSignal().trim().length > 0;
    });

    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    private ngControl: NgControl | null = null;
    private controlRef: AbstractControl | null = null;

    private managedValidators: ValidatorFn[] = [];

    private readonly uid = `ui-textarea-${Math.random().toString(36).slice(2, 9)}`;

    ngAfterViewInit(): void {
        this.ngControl = this.injector.get(NgControl, null, { self: true, optional: true });
        this.controlRef = this.ngControl?.control ?? null;

        if (!this.controlRef) {
            return;
        }

        runInInjectionContext(this.injector, () => {
            effect(() => {
                this.required();
                this.minLength();
                this.maxLength();
                this.validators();

                this.applyManagedValidators(this.controlRef!);
            });
        });

        queueMicrotask(() => {
            this.isReadySignal.set(true);
        });
    }

    get errorId(): string {
        return `${this.uid}-errors`;
    }

    get isInvalid(): boolean {
        if (!this.isReadySignal()) {
            return false;
        }

        return !!this.ngControl?.control?.invalid;
    }

    private get shouldShowError(): boolean {
        if (!this.isReadySignal()) {
            return false;
        }

        const formControl = this.ngControl?.control;

        return !!formControl && formControl.invalid && formControl.touched;
    }

    private readonly defaultMessages: Record<string, (errorData: any) => string> = {
        required: () => 'This field is required.',
        minlength: (errorData) => `Minimum ${errorData.requiredLength} characters.`,
        maxlength: (errorData) => `Maximum ${errorData.requiredLength} characters.`,
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

        if (this.required()) {
            nextValidators.push(Validators.required);
        }

        if (this.minLength() !== null) {
            nextValidators.push(Validators.minLength(this.minLength()!));
        }

        if (this.maxLength() !== null) {
            nextValidators.push(Validators.maxLength(this.maxLength()!));
        }

        nextValidators.push(...this.validators());

        control.addValidators(nextValidators);
        this.managedValidators = nextValidators;

        control.updateValueAndValidity({ emitEvent: false });
    }

    writeValue(value: string | null): void {
        this.valueSignal.set(value ?? '');
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

    get value(): string {
        return this.valueSignal();
    }

    get disabled(): boolean {
        return this.disabledSignal();
    }

    onFocusIn(): void {
        this.isFocusedSignal.set(true);
    }

    onFocusOut(): void {
        this.isFocusedSignal.set(false);

        this.onTouched();
    }

    onInput(value: string): void {
        this.valueSignal.set(value);

        this.onChange(value);
    }
}
