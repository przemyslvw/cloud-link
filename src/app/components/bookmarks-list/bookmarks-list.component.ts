import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { BookmarkService } from '../../services/bookmark.service';
import { AuthService } from '../../services/auth.service';
import { Bookmark, Folder } from '../../models/bookmark.model';
import { Observable, switchMap, of } from 'rxjs';

@Component({
  selector: 'app-bookmarks-list',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule],
  templateUrl: './bookmarks-list.component.html',
  styleUrl: './bookmarks-list.component.scss'
})
export class BookmarksListComponent implements OnInit {
  private bookmarkService = inject(BookmarkService);
  private authService = inject(AuthService);

  folders$: Observable<Folder[]> = of([]);
  bookmarks$: Observable<Bookmark[]> = of([]);

  ngOnInit() {
    this.folders$ = this.authService.user$.pipe(
      switchMap(user => user ? this.bookmarkService.getFolders(user.uid) : of([]))
    );

    this.bookmarks$ = this.authService.user$.pipe(
      switchMap(user => user ? this.bookmarkService.getBookmarks(user.uid) : of([]))
    );
  }
}
