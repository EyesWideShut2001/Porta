import { Component, inject } from '@angular/core';
import { Nav } from '../layout/nav/nav';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [Nav, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected router = inject(Router);

  protected isPublicLandingRoute() {
    const path = this.router.url.split('?')[0];
    return path === '/' || path === '/register' || path === '/learn-more';
  }
}
