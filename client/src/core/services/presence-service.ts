import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { ToastService } from './toast-service';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { User } from '../../types/user';
import { Message } from '../../types/message';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PresenceService {
  private hubURL = environment.hubUrl;
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  private unreadCountRequestId = 0;
  hubConnection?: HubConnection;
  onlineUsers = signal<string[]>([]);
  unreadMessageCount = signal(0);

  createHubConnection(user: User) {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.hubURL + 'presence', {
        accessTokenFactory: () => user.token,
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch((error) => console.log(error));

    this.hubConnection.onreconnected(() => {
      this.loadUnreadMessageCount();
    });

    this.hubConnection.on('UserOnline', (userId) => {
      this.onlineUsers.update((users) => {
        const currentUsers = Array.isArray(users) ? users : [];
        return currentUsers.includes(userId) ? currentUsers : [...currentUsers, userId];
      });
    });

    this.hubConnection.on('UserOffline', (userId) => {
      this.onlineUsers.update((users) => {
        const currentUsers = Array.isArray(users) ? users : [];
        return currentUsers.filter((x) => x !== userId);
      });
    });

    this.hubConnection.on('GetOnlineUsers', (userIds) => {
      this.onlineUsers.set(Array.isArray(userIds) ? userIds : []);
    });
    this.hubConnection.on('NewMessageReceived', (message: Message) => {
      this.unreadMessageCount.update((count) => count + 1);
      this.loadUnreadMessageCount();
      this.toast.info(
        message.senderDisplayName + ' has sent you a new message',
        10000,
        message.senderImageUrl,
        `/members/${message.senderId}/messages`,
      );
    });
  }

  loadUnreadMessageCount() {
    const requestId = ++this.unreadCountRequestId;

    this.http.get<{ count: number }>(this.baseUrl + 'messages/unread-count').subscribe({
      next: ({ count }) => {
        if (requestId === this.unreadCountRequestId) {
          this.unreadMessageCount.set(count);
        }
      },
      error: () => {},
    });
  }

  stopHubConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      this.hubConnection.stop().catch((error) => console.log(error));
    }
    this.onlineUsers.set([]);
    this.unreadCountRequestId++;
    this.unreadMessageCount.set(0);
  }
}
