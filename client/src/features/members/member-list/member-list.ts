import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MemberService } from '../../../core/services/member-service';
import { Member, MemberParams } from '../../../types/member';
import { MemberCard } from '../member-card/member-card';
import { PaginatedResult } from '../../../types/pagination';
import { Paginator } from '../../../shared/paginator/paginator';
import { FilterModal } from '../filter-modal/filter-modal';
import { filter } from 'rxjs';
import { interests } from '../../../core/constants/interests';

@Component({
  selector: 'app-member-list',
  imports: [MemberCard, Paginator, FilterModal],
  templateUrl: './member-list.html',
  styleUrl: './member-list.css',
})
export class MemberList implements OnInit {
  @ViewChild('filterModal') modal!: FilterModal;
  private memberService = inject(MemberService);
  protected paginatedMembers = signal<PaginatedResult<Member> | null>(null);
  protected memberParams = new MemberParams();
  private updatedParams = new MemberParams();

  constructor() {
    const filters = localStorage.getItem('filters');

    if (filters) {
      const savedFilters = JSON.parse(filters);
      this.memberParams = {
        ...new MemberParams(),
        ...savedFilters,
        interestIds: savedFilters.interestIds ?? [],
      };
      this.updatedParams = { ...this.memberParams, interestIds: [...this.memberParams.interestIds] };
    }
  }

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers() {
    this.memberService.getMembers(this.memberParams).subscribe({
      next: (result) => {
        this.paginatedMembers.set(result);
      },
    });
  }

  onPageChange(event: { pageNumber: number; pageSize: number }) {
    this.memberParams.pageSize = event.pageSize;
    this.memberParams.pageNumber = event.pageNumber;
    this.loadMembers();
  }

  openModal() {
    this.modal.open();
  }

  onClose() {
    console.log('Modal close');
  }

  onFilterChange(data: MemberParams) {
    this.memberParams = { ...data, interestIds: [...data.interestIds] };
    this.updatedParams = { ...data, interestIds: [...data.interestIds] };
    this.loadMembers();
  }

  resetFilters() {
    this.memberParams = new MemberParams();
    this.updatedParams = new MemberParams();
    this.loadMembers();
  }

  get displayMessage(): string {
    const defaultParams = new MemberParams();

    const filters: string[] = [];

    if (this.updatedParams.gender) {
      filters.push(this.updatedParams.gender + 's');
    } else {
      filters.push('Males', 'Females');
    }

    if (
      this.updatedParams.minAge !== defaultParams.minAge ||
      this.updatedParams.maxAge !== defaultParams.maxAge
    ) {
      filters.push(` ages ${this.updatedParams.minAge}-${this.updatedParams.maxAge}`);
    }

    if (this.updatedParams.interestIds.length > 0) {
      const selectedInterestNames = interests
        .filter((interest) => this.updatedParams.interestIds.includes(interest.id))
        .map((interest) => interest.name);
      filters.push(`Interests: ${selectedInterestNames.join(', ')}`);
    }

    filters.push(
      this.updatedParams.orderBy === 'lastActive' ? 'Recently active' : 'Neweest members',
    );

    return filters.length > 0 ? `Selected: ${filters.join('  | ')}` : 'All members';
  }
}
