import { Component, inject, OnInit, signal } from '@angular/core';
import { MessageService } from '../../core/services/message-service';
import { PaginatedResult } from '../../types/pagination';
import { Paginator } from '../../shared/paginator/paginator';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { PresenceService } from '../../core/services/presence-service';
import { Conversation } from '../../types/conversation';

@Component({
  selector: 'app-messages',
  imports: [Paginator, RouterLink, DatePipe],
  templateUrl: './messages.html',
  styleUrl: './messages.css',
})
export class Messages implements OnInit {
  private messageService = inject(MessageService);
  protected presenceService = inject(PresenceService);
  protected pageNumber = 1;
  protected pageSize = 10;
  protected paginatedConversations = signal<PaginatedResult<Conversation> | null>(null);

  ngOnInit(): void {
    this.loadConversations();
  }

  loadConversations() {
    this.messageService.getConversations(this.pageNumber, this.pageSize).subscribe({
      next: (response) => {
        this.paginatedConversations.set(response);
      },
    });
  }

  onPageChange(event: { pageNumber: number; pageSize: number }) {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageNumber;
    this.loadConversations();
  }
}
