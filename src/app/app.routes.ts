import { Routes } from '@angular/router';
import { ContactsComponent } from './contacts/contacts.component';
import { SummaryComponent } from './summary/summary.component';
import { AddTaskComponent } from './add-task/add-task.component';
import { BoardComponent } from './board/board.component';
import { HelpComponent } from './shared/help/help.component';
import { LegalNoticeComponent } from './shared/legal-notice/legal-notice.component';
import { PrivacyPolicyComponent } from './shared/privacy-policy/privacy-policy.component';
import { LoginComponent } from './login-signup/login/login.component';
import { SignupComponent } from './login-signup/signup/signup.component';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'signup', component: SignupComponent },
    { path: 'summary', component: SummaryComponent, canActivate: [AuthGuard] },
    { path: 'add-task', component: AddTaskComponent, canActivate: [AuthGuard] },
    { path: 'board', component: BoardComponent, canActivate: [AuthGuard] },
    { path: 'contacts', component: ContactsComponent, canActivate: [AuthGuard] },
    { path: 'help', component: HelpComponent, canActivate: [AuthGuard] },
    { path: 'legal-notice', component: LegalNoticeComponent },
    { path: 'privacy-policy', component: PrivacyPolicyComponent },
    { path: '**', redirectTo: '/login' }
];