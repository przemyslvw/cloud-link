import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { BookmarkService } from '../../services/bookmark.service';
import { Router } from '@angular/router';
import { BookmarksListComponent } from '../bookmarks-list/bookmarks-list.component';
import { take } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, BookmarksListComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  authService = inject(AuthService);
  private bookmarkService = inject(BookmarkService);
  private router = inject(Router);

  user$ = this.authService.user$;

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }


}
