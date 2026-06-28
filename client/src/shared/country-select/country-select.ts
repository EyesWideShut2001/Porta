import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { COUNTRIES } from './countries';

@Component({
  selector: 'app-country-select',
  imports: [],
  templateUrl: './country-select.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CountrySelect),
      multi: true,
    },
  ],
})
export class CountrySelect implements ControlValueAccessor {
  label = input('Country');
  placeholder = input('Select country');
  invalid = input(false);
  protected countries = COUNTRIES;
  protected value = '';
  protected isDisabled = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  handleChange(event: Event) {
    const nextValue = (event.target as HTMLSelectElement).value;
    this.value = nextValue;
    this.onChange(nextValue);
  }

  handleBlur() {
    this.onTouched();
  }
}
