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
import { AccountService } from '../../../core/services/account-service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CountrySelect } from '../../../shared/country-select/country-select';

type StagedPhoto = {
  file: File;
  previewUrl: string;
};

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CountrySelect],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnDestroy {
  private accountService = inject(AccountService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  cancelRegister = output<boolean>();
  protected credentialsForm: FormGroup;
  protected profileForm: FormGroup;
  protected detailsForm: FormGroup;
  protected currentStep = signal(1);
  protected validationErrors = signal<string[]>([]);
  protected photoErrors = signal<string[]>([]);
  protected registerLoading = signal(false);
  protected isDraggingPhotos = signal(false);
  protected draggedPhotoIndex = signal<number | null>(null);
  protected dropTargetPhotoIndex = signal<number | null>(null);
  protected stagedPhotos = signal<StagedPhoto[]>([]);
  protected readonly minPhotos = 2;
  protected readonly maxPhotos = 8;
  protected readonly genders = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
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

    this.detailsForm = this.fb.group({
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
    this.credentialsForm.markAllAsTouched();
    this.profileForm.markAllAsTouched();
    this.detailsForm.markAllAsTouched();

    if (!this.hasRequiredPhotos()) {
      this.photoErrors.set([`Upload at least ${this.minPhotos} photos to register.`]);
    }

    if (
      this.profileForm.invalid ||
      this.credentialsForm.invalid ||
      this.detailsForm.invalid ||
      !this.hasRequiredPhotos()
    ) {
      return;
    }

    this.registerLoading.set(true);
    this.validationErrors.set([]);
    this.photoErrors.set([]);

    this.accountService.register(this.buildRegistrationFormData()).pipe(
      finalize(() => this.registerLoading.set(false)),
    ).subscribe({
      next: () => this.router.navigateByUrl('/members'),
      error: (error) => {
        console.log(error);
        this.validationErrors.set(Array.isArray(error) ? error : [error]);
      },
    });
  }

  onPhotoDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.stagedPhotos().length < this.maxPhotos) {
      this.isDraggingPhotos.set(true);
    }
  }

  onPhotoDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingPhotos.set(false);
  }

  onPhotoDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingPhotos.set(false);

    if (event.dataTransfer?.files.length) {
      this.stagePhotos(Array.from(event.dataTransfer.files));
    }
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.stagePhotos(Array.from(input.files ?? []));
    input.value = '';
  }

  removePhoto(index: number) {
    const photo = this.stagedPhotos()[index];
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    this.stagedPhotos.update((photos) => photos.filter((_, photoIndex) => photoIndex !== index));

    if (this.hasRequiredPhotos()) {
      this.photoErrors.set([]);
    }
  }

  movePhoto(index: number, direction: -1 | 1) {
    this.reorderPhoto(index, index + direction);
  }

  onStagedPhotoDragStart(event: DragEvent, index: number) {
    this.draggedPhotoIndex.set(index);
    this.dropTargetPhotoIndex.set(index);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onStagedPhotoDragOver(event: DragEvent, index: number) {
    const draggedIndex = this.draggedPhotoIndex();
    if (draggedIndex === null || draggedIndex === index) return;

    event.preventDefault();
    event.stopPropagation();
    this.dropTargetPhotoIndex.set(index);

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onStagedPhotoDrop(event: DragEvent, index: number) {
    event.preventDefault();
    event.stopPropagation();

    const draggedIndex = this.draggedPhotoIndex();
    if (draggedIndex !== null) {
      this.reorderPhoto(draggedIndex, index);
    }

    this.clearStagedPhotoDragState();
  }

  onStagedPhotoDragEnd() {
    this.clearStagedPhotoDragState();
  }

  finishRegistration() {
    this.register();
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

  private buildRegistrationFormData() {
    const formData = new FormData();
    const description = this.detailsForm.value.description?.trim();

    formData.append('email', this.credentialsForm.value.email);
    formData.append('displayName', this.credentialsForm.value.displayName);
    formData.append('password', this.credentialsForm.value.password);
    formData.append('gender', this.profileForm.value.gender);
    formData.append('dateOfBirth', this.getDateOfBirth());
    formData.append('city', this.profileForm.value.city);
    formData.append('country', this.profileForm.value.country);

    if (description) {
      formData.append('description', description);
    }

    for (const photo of this.stagedPhotos()) {
      formData.append('photos', photo.file, photo.file.name);
    }

    return formData;
  }

  private hasRequiredPhotos() {
    const photoCount = this.stagedPhotos().length;
    return photoCount >= this.minPhotos && photoCount <= this.maxPhotos;
  }

  private reorderPhoto(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.stagedPhotos().length ||
      toIndex >= this.stagedPhotos().length
    ) {
      return;
    }

    this.stagedPhotos.update((photos) => {
      const nextPhotos = [...photos];
      const [photo] = nextPhotos.splice(fromIndex, 1);
      nextPhotos.splice(toIndex, 0, photo);
      return nextPhotos;
    });
  }

  private clearStagedPhotoDragState() {
    this.draggedPhotoIndex.set(null);
    this.dropTargetPhotoIndex.set(null);
  }

  private stagePhotos(files: File[]) {
    if (files.length === 0 || this.stagedPhotos().length >= this.maxPhotos) return;

    const availableSlots = this.maxPhotos - this.stagedPhotos().length;
    const selectedPhotos: StagedPhoto[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not an image file.`);
        continue;
      }

      if (selectedPhotos.length >= availableSlots) {
        errors.push(`You can upload up to ${this.maxPhotos} photos.`);
        break;
      }

      selectedPhotos.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (selectedPhotos.length > 0) {
      this.stagedPhotos.update((photos) => [...photos, ...selectedPhotos]);
    }

    if (this.hasRequiredPhotos() && errors.length === 0) {
      this.photoErrors.set([]);
    } else {
      this.photoErrors.set(errors);
    }
  }
}
