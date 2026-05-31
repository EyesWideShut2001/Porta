import { Component, inject, OnDestroy, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RegisterCreds } from '../../../types/user';
import { AccountService } from '../../../core/services/account-service';
import { TextInput } from '../../../shared/text-input/text-input';
import { Router } from '@angular/router';
import { ImageUpload } from '../../../shared/image-upload/image-upload';
import { MemberService } from '../../../core/services/member-service';
import { User } from '../../../types/user';
import { concatMap, finalize, from, Observable, of } from 'rxjs';
import { Photo } from '../../../types/member';

type StagedPhoto = {
  file: File;
  previewUrl: string;
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, TextInput, ImageUpload],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnDestroy {
  private accountService = inject(AccountService);
  private memberService = inject(MemberService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  cancelRegister = output<boolean>();
  protected creds = {} as RegisterCreds;
  protected credentialsForm: FormGroup;
  protected profileForm: FormGroup;
  protected optionalForm: FormGroup;
  protected currentStep = signal(1);
  protected validationErrors = signal<string[]>([]);
  protected registerLoading = signal(false);
  protected stagedPhotos = signal<StagedPhoto[]>([]);
  protected readonly maxPhotos = 10;
  protected readonly genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];
  protected readonly countries = [
    { value: 'United States', label: '🇺🇸 United States' },
    { value: 'Romania', label: '🇷🇴 Romania' },
    { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
    { value: 'Canada', label: '🇨🇦 Canada' },
    { value: 'Germany', label: '🇩🇪 Germany' },
    { value: 'France', label: '🇫🇷 France' },
    { value: 'Spain', label: '🇪🇸 Spain' },
    { value: 'Italy', label: '🇮🇹 Italy' },
    { value: 'Netherlands', label: '🇳🇱 Netherlands' },
    { value: 'Poland', label: '🇵🇱 Poland' },
    { value: 'Ukraine', label: '🇺🇦 Ukraine' },
    { value: 'Turkey', label: '🇹🇷 Turkey' },
    { value: 'Brazil', label: '🇧🇷 Brazil' },
    { value: 'Mexico', label: '🇲🇽 Mexico' },
    { value: 'India', label: '🇮🇳 India' },
    { value: 'Japan', label: '🇯🇵 Japan' },
    { value: 'South Korea', label: '🇰🇷 South Korea' },
    { value: 'Australia', label: '🇦🇺 Australia' },
  ];
  protected readonly months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  protected readonly currentYear = new Date().getFullYear();
  protected readonly minBirthYear = this.currentYear - 120;
  protected readonly maxBirthYear = this.currentYear - 18;

  constructor() {
    this.credentialsForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(64),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
        ],
      ],
      confirmPassword: ['', [Validators.required, this.matchValues('password')]],
    });

    this.profileForm = this.fb.group({
      gender: ['', Validators.required],
      birthMonth: ['', Validators.required],
      birthDay: [
        '',
        [
          Validators.required,
          Validators.min(1),
          Validators.max(31),
          Validators.pattern(/^\d{1,2}$/),
        ],
      ],
      birthYear: [
        '',
        [
          Validators.required,
          Validators.min(this.minBirthYear),
          Validators.max(this.maxBirthYear),
          Validators.pattern(/^\d{4}$/),
        ],
      ],
      city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      country: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    }, { validators: this.birthDateValidator() });

    this.optionalForm = this.fb.group({
      description: ['', [Validators.maxLength(1000)]],
    });

    this.credentialsForm.controls['password'].valueChanges.subscribe(() => {
      this.credentialsForm.controls['confirmPassword'].updateValueAndValidity();
    });
  }

  matchValues(matchTo: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const parent = control.parent;
      if (!parent) return null;

      const matchValue = parent.get(matchTo)?.value;
      return control.value === matchValue ? null : { passwordMismatch: true };
    };
  }

  nextStep() {
    if (this.currentStep() === 1 && this.credentialsForm.valid) {
      this.currentStep.update((prevStep) => prevStep + 1);
    } else if (this.currentStep() === 2 && this.profileForm.valid) {
      this.currentStep.update((prevStep) => prevStep + 1);
    }
  }

  prevStep() {
    this.currentStep.update((prevStep) => prevStep - 1);
  }

  birthDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const month = Number(control.get('birthMonth')?.value);
      const day = Number(control.get('birthDay')?.value);
      const year = Number(control.get('birthYear')?.value);

      if (!month || !day || !year) return null;

      const birthDate = new Date(year, month - 1, day);
      const isValidDate =
        birthDate.getFullYear() === year &&
        birthDate.getMonth() === month - 1 &&
        birthDate.getDate() === day;

      if (!isValidDate) return { invalidBirthDate: true };

      const today = new Date();
      const maxBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      const minBirthDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());

      if (birthDate > maxBirthDate) return { minimumAge: true };
      if (birthDate < minBirthDate) return { maximumAge: true };

      return null;
    };
  }

  allowDigitsOnly(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) return;

    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!/^\d$/.test(event.key) && !allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  register() {
    if (this.profileForm.valid && this.credentialsForm.valid && this.optionalForm.valid) {
      this.registerLoading.set(true);
      this.validationErrors.set([]);
      const { confirmPassword, ...credentials } = this.credentialsForm.value;
      const formData = {
        ...credentials,
        gender: this.profileForm.value.gender,
        dateOfBirth: this.getDateOfBirth(),
        city: this.profileForm.value.city,
        country: this.profileForm.value.country,
      };

      this.accountService.register(formData).subscribe({
        next: () => this.applyOptionalDetails(),
        error: (error) => {
          console.log(error);
          this.registerLoading.set(false);
          this.validationErrors.set(error);
        },
      });
    }
  }

  onUploadImage(file: File) {
    if (this.stagedPhotos().length >= this.maxPhotos) return;

    this.stagedPhotos.update((photos) => [
      ...photos,
      {
        file,
        previewUrl: URL.createObjectURL(file),
      },
    ]);
  }

  removePhoto(index: number) {
    const photo = this.stagedPhotos()[index];
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    this.stagedPhotos.update((photos) => photos.filter((_, photoIndex) => photoIndex !== index));
  }

  finishRegistration() {
    this.register();
  }

  private applyOptionalDetails() {
    const description = this.optionalForm.value.description?.trim();
    const updateProfile$: Observable<unknown> = description
      ? this.memberService.updateMember({ description })
      : of(null);
    const uploadPhoto$: Observable<Photo | null> = this.stagedPhotos().length > 0
      ? from(this.stagedPhotos()).pipe(
          concatMap((photo) => this.memberService.uploadPhoto(photo.file)),
        )
      : of(null);

    updateProfile$.pipe(
      concatMap(() => uploadPhoto$),
      finalize(() => this.registerLoading.set(false)),
    ).subscribe({
      next: (photo: Photo | null) => {
        if (!photo) return;

        const currentUser = this.accountService.currentUser();

        if (currentUser && !currentUser.imageUrl) {
          this.accountService.currentUser.set({ ...currentUser, imageUrl: photo.url } as User);
        }
      },
      complete: () => this.router.navigateByUrl('/members'),
      error: (error: any) => {
        this.validationErrors.set(Array.isArray(error) ? error : [error]);
      },
    });
  }

  cancel() {
    this.cancelRegister.emit(false);
  }

  ngOnDestroy(): void {
    for (const photo of this.stagedPhotos()) {
      URL.revokeObjectURL(photo.previewUrl);
    }
  }

  private getDateOfBirth() {
    const year = Number(this.profileForm.value.birthYear);
    const month = Number(this.profileForm.value.birthMonth);
    const day = Number(this.profileForm.value.birthDay);

    return [
      year.toString().padStart(4, '0'),
      month.toString().padStart(2, '0'),
      day.toString().padStart(2, '0'),
    ].join('-');
  }
}
