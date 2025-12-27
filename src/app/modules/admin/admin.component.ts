import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  selectedTab = 0;
  userRole: string = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    const user = this.authService.getUser();
    this.userRole = user?.role || '';
  }

  isAdmin(): boolean {
    return this.userRole === 'ADMIN';
  }

  onTabChange(index: number) {
    this.selectedTab = index;
  }
}
