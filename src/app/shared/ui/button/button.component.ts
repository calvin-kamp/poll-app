import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

type ButtonType = 'button' | 'submit' | 'reset';

@Component({
    selector: 'ui-button',
    templateUrl: './button.component.html',
    styleUrl: './button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})

export class ButtonComponent {
    ariaLabel = input<string | null>(null);

    type = input<ButtonType>('button');
    disabled = input<boolean>(false);
    loading = input<boolean>(false);

    modifiers = input<string[]>([]);
    classes = input<string | string[]>('');

    clicked = output<MouseEvent>();

    get isDisabled(): boolean {
        return this.disabled() || this.loading();
    }

    get buttonClass(): string {
        const baseClass = 'button';

        const modifierClasses = (this.modifiers() || [])
            .filter(Boolean)
            .map((modifier) => `${baseClass}--${modifier}`);

        const extra = this.classes();
        const extraClasses = Array.isArray(extra) ? extra.filter(Boolean) : (extra || '').split(' ').filter(Boolean);

        return [baseClass, ...modifierClasses, ...extraClasses].join(' ');
    }

    onClick(event: MouseEvent): void {
        if (this.isDisabled) {
            event.preventDefault();
            event.stopImmediatePropagation();

            return;
        }

        this.clicked.emit(event);
    }
}
