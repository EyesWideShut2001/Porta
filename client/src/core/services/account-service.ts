import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { LoginCreds, User } from '../../types/user';
import { finalize, Subscription, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LikesService } from './likes-service';
import { JsonPipe } from '@angular/common';
import { PresenceService } from './presence-service';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private http = inject(HttpClient);
  private likesService = inject(LikesService);
  private presenceService = inject(PresenceService);
  currentUser = signal<User | null>(null);
  private baseUrl = environment.apiUrl;
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;
  private refreshRequest: Subscription | null = null;
  private sessionVersion = 0;

  register(creds: FormData) {
    return this.http
      .post<User>(this.baseUrl + 'account/register', creds, { withCredentials: true })
      .pipe(
        tap((user) => {
          if (user) {
            this.setCurrentUser(user);
            this.startTokenRefreshInterval();
          }
        }),
      );
  }

  login(creds: LoginCreds) {
    return this.http
      .post<User>(this.baseUrl + 'account/login', creds, { withCredentials: true })
      .pipe(
        tap((user) => {
          if (user) {
            this.setCurrentUser(user);
            this.startTokenRefreshInterval();
          }
        }),
      );
  }

  refreshToken() {
    return this.http.post<User | null>(
      this.baseUrl + 'account/refresh-token',
      {},
      { withCredentials: true },
    );
  }

  startTokenRefreshInterval() {
    this.stopTokenRefreshInterval();
    const sessionVersion = this.sessionVersion;

    this.refreshIntervalId = setInterval(
      () => {
        if (!this.currentUser() || this.refreshRequest) return;

        this.refreshRequest = this.refreshToken()
          .pipe(finalize(() => (this.refreshRequest = null)))
          .subscribe({
            next: (user) => {
              if (user && sessionVersion === this.sessionVersion && this.currentUser()) {
                this.setCurrentUser(user);
              }
            },
            error: () => {
              if (sessionVersion === this.sessionVersion) {
                this.logout();
              }
            },
          });
      },
      5 * 60 * 1000,
    );
  }

  setCurrentUser(user: User) {
    this.currentUser.set(user);
    this.likesService.getLikeIds();

    if (this.presenceService.hubConnection?.state !== HubConnectionState.Connected) {
      this.presenceService.createHubConnection(user);
    }

    this.presenceService.loadUnreadMessageCount();
  }

  updateCurrentUser(updates: Partial<Pick<User, 'displayName' | 'imageUrl'>>) {
    this.currentUser.update((user) => (user ? { ...user, ...updates } : null));
  }

  logout() {
    this.sessionVersion++;
    this.stopTokenRefreshInterval();
    localStorage.removeItem('filters');
    this.likesService.clearLikeIds();
    this.currentUser.set(null);
    this.presenceService.stopHubConnection();

    this.http.post(this.baseUrl + 'account/logout', {}, { withCredentials: true }).subscribe({
      error: () => {},
    });
  }

  private stopTokenRefreshInterval() {
    if (this.refreshIntervalId !== null) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }

    this.refreshRequest?.unsubscribe();
    this.refreshRequest = null;
  }
}
