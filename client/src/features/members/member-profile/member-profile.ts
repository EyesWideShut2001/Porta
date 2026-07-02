import { Component, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { EditableMember, Member } from '../../../types/member';
import { DatePipe } from '@angular/common';
import { MemberService } from '../../../core/services/member-service';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastService } from '../../../core/services/toast-service';
import { AccountService } from '../../../core/services/account-service';
import { TimeAgoPipe } from '../../../core/pipes/time-ago-pipe';
import { CountrySelect } from '../../../shared/country-select/country-select';
import { interestGroups, interests } from '../../../core/constants/interests';

@Component({
  selector: 'app-member-profile',
  imports: [DatePipe, FormsModule, TimeAgoPipe, CountrySelect],
  templateUrl: './member-profile.html',
  styleUrl: './member-profile.css',
})
export class MemberProfile implements OnInit, OnDestroy {
  @ViewChild('editForm') editForm?: NgForm;
  @HostListener('window:beforeunload', ['$event']) notify($event: BeforeUnloadEvent) {
    if (this.editForm?.dirty) {
      $event.preventDefault();
    }
  }

  private accountService = inject(AccountService);
  protected memberService = inject(MemberService);
  private toast = inject(ToastService);
  protected readonly interestGroups = interestGroups;
  protected editableMember: EditableMember = {
    displayName: '',
    description: '',
    city: '',
    country: '',
    interestIds: [],
  };

  ngOnInit(): void {
    this.editableMember = {
      displayName: this.memberService.member()?.displayName || '',
      description: this.memberService.member()?.description || '',
      city: this.memberService.member()?.city || '',
      country: this.memberService.member()?.country || '',
      interestIds: this.memberService.member()?.interests?.map((interest) => interest.id) ?? [],
    };
  }

  isInterestSelected(interestId: number) {
    return this.editableMember.interestIds.includes(interestId);
  }

  toggleInterest(interestId: number) {
    this.editableMember.interestIds = this.isInterestSelected(interestId)
      ? this.editableMember.interestIds.filter((id) => id !== interestId)
      : [...this.editableMember.interestIds, interestId];

    this.editForm?.control.markAsDirty();
  }

  updateProfile() {
    if (!this.memberService.member()) return;
    this.editableMember = {
      displayName: this.editableMember.displayName.trim(),
      description: this.editableMember.description?.trim(),
      city: this.editableMember.city.trim(),
      country: this.editableMember.country.trim(),
      interestIds: [...this.editableMember.interestIds],
    };
    const { interestIds, ...profileUpdates } = this.editableMember;
    const updatedMember = {
      ...this.memberService.member(),
      ...profileUpdates,
      interests: interests.filter((interest) => interestIds.includes(interest.id)),
    };
    this.memberService.updateMember(this.editableMember).subscribe({
      next: () => {
        const currentUser = this.accountService.currentUser();
        if (currentUser && updatedMember.displayName !== currentUser?.displayName) {
          this.accountService.updateCurrentUser({ displayName: updatedMember.displayName });
        }
        this.toast.success('Profile updated successfully!');
        this.memberService.editMode.set(false);
        this.memberService.member.set(updatedMember as Member);
        this.editForm?.reset(updatedMember);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.memberService.editMode()) {
      this.memberService.editMode.set(false);
    }
  }
}
