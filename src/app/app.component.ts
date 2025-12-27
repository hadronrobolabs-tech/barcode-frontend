import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './service/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Barcode Management System';
  isLoggedIn = false;
  userName = '';
  userEmail = '';
  sidenavOpened = true;

  menuItems = [
    { name: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { name: 'Generate Barcode', route: '/dashboard/generate-qr', icon: 'qr_code_scanner' },
    { name: 'Component Scan', route: '/dashboard/component-scan', icon: 'scanner' },
    { name: 'Box Packing', route: '/dashboard/box-packing', icon: 'inventory_2' },
    { name: 'Data History', route: '/dashboard/data-history', icon: 'history' },
    { name: 'Admin Panel', route: '/dashboard/admin', icon: 'admin_panel_settings', adminOnly: true }
  ];

  get filteredMenuItems() {
    const user = this.authService.getUser();
    const isAdmin = user?.role === 'ADMIN';
    return this.menuItems.filter(item => !item.adminOnly || isAdmin);
  }

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkAuth();
      }
    });
  }

  ngOnInit() {
    this.checkAuth();
  }

  checkAuth() {
    this.isLoggedIn = this.authService.isAuthenticated();
    if (this.isLoggedIn) {
      const user = this.authService.getUser();
      this.userName = user?.fullName || user?.full_name || 'User';
      this.userEmail = user?.email || '';
      
      // Prevent access to login/signup pages when logged in
      const currentRoute = this.router.url;
      if (currentRoute === '/login' || currentRoute === '/register') {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }
    } else {
      this.userName = '';
      this.userEmail = '';
    }
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.router.navigate(['/login']);
  }

  toggleSidenav() {
    this.sidenavOpened = !this.sidenavOpened;
  }

  shouldShowSidebar(): boolean {
    const currentRoute = this.router.url;
    return currentRoute.includes('/dashboard') || currentRoute.includes('/reminders');
  }
}
