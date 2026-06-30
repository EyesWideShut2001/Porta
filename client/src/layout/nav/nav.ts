import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../core/services/account-service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ToastService } from '../../core/services/toast-service';
import { themes } from '../theme';
import { BusyService } from '../../core/services/busy-service';
import { HasRole } from '../../shared/directive/has-role';

@Component({
  selector: 'app-nav',
  imports: [FormsModule, RouterLink, RouterLinkActive, HasRole],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav implements OnInit {
  protected accountService = inject(AccountService);
  protected busyService = inject(BusyService);
  private router = inject(Router);
  private toast = inject(ToastService);
  protected creds: any = {};
  protected selectedTheme = signal<string>(this.getInitialTheme());
  protected selectedThemeLabel = computed(
    () => themes.find((theme) => theme.value === this.selectedTheme())?.label ?? themes[0].label,
  );
  protected themes = themes;
  protected loading = signal(false);
  protected themeMenuOpen = signal(false);

  ngOnInit(): void {
    localStorage.setItem('theme', this.selectedTheme());
    document.documentElement.setAttribute('data-theme', this.selectedTheme());
  }

  handleSelectedTheme(theme: string) {
    this.selectedTheme.set(theme);
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.themeMenuOpen.set(false);
  }

  toggleThemeMenu(event: MouseEvent) {
    event.stopPropagation();
    this.themeMenuOpen.update((isOpen) => !isOpen);
  }

  @HostListener('document:click')
  closeThemeMenu() {
    this.themeMenuOpen.set(false);
  }

  handleSelectUserItem() {
    const elem = document.activeElement as HTMLDivElement;
    if (elem) elem.blur();
  }

  homeLink() {
    return this.accountService.currentUser() ? '/members' : '/';
  }

  login() {
    this.loading.set(true);
    console.log(this.creds);
    this.accountService.login(this.creds).subscribe({
      next: () => {
        this.router.navigateByUrl('/members');
        this.toast.success('Logged in successfuly!');
        this.creds = {};
      },
      error: (error) => {
        this.toast.error(error.error);
      },
      complete: () => this.loading.set(false),
    });
  }

  logout() {
    this.accountService.logout();
    this.router.navigateByUrl('/');
  }

  private getInitialTheme() {
    const savedTheme = localStorage.getItem('theme');

    return themes.some((theme) => theme.value === savedTheme) ? savedTheme! : themes[0].value;
  }
}
