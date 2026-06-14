import { Component, inject, OnInit, signal } from '@angular/core';
import { Register } from '../account/register/register';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [Register],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  // @Input({required: true}) membersFromApp: User[]=[];
  protected registerMode = signal(false);

  ngOnInit(): void {
    this.registerMode.set(this.route.snapshot.data['registerMode'] === true);
  }

  showRegister(value: boolean) {
    this.router.navigateByUrl(value ? '/register' : '/');
  }
}
