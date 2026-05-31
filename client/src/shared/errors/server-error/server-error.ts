import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../../../types/error';

@Component({
  selector: 'app-server-error',
  imports: [],
  templateUrl: './server-error.html',
  styleUrl: './server-error.css',
})
export class ServerError {
  protected error: ApiError | null;
  private router = inject(Router);
  protected showDetails = false;

  constructor() {
    const navigation = this.router.getCurrentNavigation();
    this.error = navigation?.extras?.state?.['error'] ?? null;
  }

  detailsToggle() {
    this.showDetails = !this.showDetails;
  }
}
