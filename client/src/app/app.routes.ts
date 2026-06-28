import { Routes } from '@angular/router';
import { Home } from '../features/home/home';
import { MemberList } from '../features/members/member-list/member-list';
import { MemberDetailed } from '../features/members/member-detailed/member-detailed';
import { Lists } from '../features/lists/lists';
import { Messages } from '../features/messages/messages';
import { authGuard } from '../core/guards/auth-guard';
import { NotFound } from '../shared/errors/not-found/not-found';
import { ServerError } from '../shared/errors/server-error/server-error';
import { MemberProfile } from '../features/members/member-profile/member-profile';
import { MemberPhotos } from '../features/members/member-photos/member-photos';
import { MemberMessages } from '../features/members/member-messages/member-messages';
import { memberResolver } from '../features/members/member-resolver';
import { preventUnsavedChangesGuard } from '../core/guards/prevent-unsaved-changes-guard';
import { Admin } from '../features/admin/admin';
import { adminGuard } from '../core/guards/admin-guard';
import { guestGuard } from '../core/guards/guest-guard';
import { memberMessagesGuard } from '../core/guards/member-messages-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Home, canActivate: [guestGuard] },
  { path: 'register', component: Home, canActivate: [guestGuard], data: { registerMode: true } },
  {
    path: '',
    runGuardsAndResolvers: 'always',
    canActivate: [authGuard],
    children: [
      { path: 'members', component: MemberList },
      {
        path: 'members/:id',
        resolve: { member: memberResolver },
        runGuardsAndResolvers: 'always',
        component: MemberDetailed,
        children: [
          { path: '', redirectTo: 'profile', pathMatch: 'full' },
          {
            path: 'profile',
            component: MemberProfile,
            title: 'Profile',
            canDeactivate: [preventUnsavedChangesGuard],
          },
          { path: 'photos', component: MemberPhotos, title: 'Photos' },
          {
            path: 'messages',
            component: MemberMessages,
            title: 'Messages',
            canActivate: [memberMessagesGuard],
          },
        ],
      },
      { path: 'lists', component: Lists },
      { path: 'messages', component: Messages },
      { path: 'admin', component: Admin, canActivate: [adminGuard] },
      { path: 'server-error', component: ServerError },
      { path: '**', component: NotFound },
    ],
  },
];
