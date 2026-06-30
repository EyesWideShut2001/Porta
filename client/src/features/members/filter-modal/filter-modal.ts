import { Component, ElementRef, input, model, output, ViewChild } from '@angular/core';
import { MemberParams } from '../../../types/member';
import { FormsModule } from '@angular/forms';
import { interestGroups } from '../../../core/constants/interests';

@Component({
  selector: 'app-filter-modal',
  imports: [FormsModule],
  templateUrl: './filter-modal.html',
  styleUrl: './filter-modal.css',
})
export class FilterModal {
  @ViewChild('filterModal') modalRef!: ElementRef<HTMLDialogElement>;
  closeModal = output();
  submitData = output<MemberParams>();
  memberParams = model(new MemberParams());
  protected readonly interestGroups = interestGroups;

  constructor() {
    const filters = localStorage.getItem('filters');

    if (filters) {
      const savedFilters = JSON.parse(filters);
      this.memberParams.set({
        ...new MemberParams(),
        ...savedFilters,
        interestIds: savedFilters.interestIds ?? [],
      });
    }
  }

  open() {
    this.modalRef.nativeElement.showModal();
  }

  close() {
    this.modalRef.nativeElement.close();
    this.closeModal.emit();
  }

  submit() {
    this.submitData.emit(this.memberParams());
    this.close();
  }

  onMinAgeChange() {
    if (this.memberParams().minAge < 18) this.memberParams().minAge = 18;
  }

  onMaxAgeChange() {
    if (this.memberParams().maxAge < this.memberParams().minAge) {
      this.memberParams().maxAge = this.memberParams().minAge;
    }
  }

  isInterestSelected(interestId: number) {
    return (this.memberParams().interestIds ?? []).includes(interestId);
  }

  toggleInterest(interestId: number) {
    this.memberParams.update((params) => ({
      ...params,
      interestIds: this.isInterestSelected(interestId)
        ? params.interestIds.filter((id) => id !== interestId)
        : [...params.interestIds, interestId],
    }));
  }
}
