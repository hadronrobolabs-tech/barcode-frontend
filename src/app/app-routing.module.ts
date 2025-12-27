// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

const routes: Routes = [
  {
    path: 'login',
    canActivate: [GuestGuard],
    loadChildren: () =>
      import('./modules/login/login.module').then(m => m.LoginModule)
  },
  {
    path: 'register',
    canActivate: [GuestGuard],
    loadChildren: () =>
      import('./modules/signup/signup.module').then(m => m.SignupModule)
  },
    {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
    {
    path: 'dashboard/generate-qr',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./modules/generate-qr/generate-qr.module').then(m => m.GenerateQrModule)
  },
    {
    path: 'dashboard/component-scan',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./modules/component-scan/component-scan.module').then(m => m.ComponentScanModule)
  },
    {
    path: 'dashboard/box-packing',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./modules/box-packing/box-packing.module').then(m => m.BoxPackingModule)
  },
    {
    path: 'dashboard/data-history',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./modules/data-history/data-history.module').then(m => m.DataHistoryModule)
  },
    {
    path: 'dashboard/admin',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./modules/admin/admin.module').then(m => m.AdminModule)
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard', pathMatch: 'full' }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
