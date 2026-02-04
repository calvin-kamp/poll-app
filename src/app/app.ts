import { Component, inject, signal } from '@angular/core';
import {
    ReactiveFormsModule,
    FormBuilder,
    AbstractControl,
    ValidationErrors,
    ValidatorFn,
} from '@angular/forms';
import { RouterOutlet } from '@angular/router';

import { InputComponent } from './shared/ui/forms/input/input.component';
import { JsonPipe } from '@angular/common';
import { CheckboxComponent } from './shared/ui/forms/checkbox/checkbox.component';
import { CheckboxGroupComponent } from './shared/ui/forms/checkbox-group/checkbox-group.component';
import { TextareaComponent } from './shared/ui/forms/textarea/textarea.component';
import { RadioComponent } from './shared/ui/forms/radio/radio.component';
import { RadioGroupComponent } from './shared/ui/forms/radio-group/radio-group.component';
import { ButtonComponent } from './shared/ui/button/button.component';

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        ReactiveFormsModule,
        InputComponent,
        CheckboxComponent,
        CheckboxGroupComponent,
        JsonPipe,
        TextareaComponent,
        RadioComponent,
        RadioGroupComponent,
        ButtonComponent,
        
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    protected readonly title = signal('poll-app');

    private fb = inject(FormBuilder);

    // ✅ Version A controls (group-level)
    notificationsGroup = this.fb.group(
        {
            email: this.fb.control(false, { nonNullable: true }),
            sms: this.fb.control(false, { nonNullable: true }),
        },
        { validators: [this.atLeastOneChecked()] }
    );

    // ✅ handy references for your checkbox components
    emailControl = this.notificationsGroup.controls.email;
    smsControl = this.notificationsGroup.controls.sms;

    form = this.fb.group({
        firstName: this.fb.control('', { nonNullable: true }),
        email: this.fb.control('', { nonNullable: true }),
        username: this.fb.control('', { nonNullable: true }),
        termsAccepted: this.fb.control(false, { nonNullable: true }),
        message: this.fb.control('', { nonNullable: true }),
        contactMethod: this.fb.control('', { nonNullable: true }),

        interests: this.fb.control<string[]>([], { nonNullable: true }),
        notifications: this.notificationsGroup,
    });

    private atLeastOneChecked(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value as Record<string, unknown> | null;

            if (!value) return { required: true };

            const hasOne = Object.values(value).some((v) => v === true);
            return hasOne ? null : { required: true };
        };
    }

    submit() {
        this.form.markAllAsTouched();
        if (this.form.invalid) return;

        console.log(this.form.getRawValue());
    }
}
