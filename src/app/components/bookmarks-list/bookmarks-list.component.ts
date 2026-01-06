import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTreeModule } from '@angular/material/tree';
import { BookmarkService } from '../../services/bookmark.service';
import { AuthService } from '../../services/auth.service';
import { BookmarkTreeNode } from '../../models/bookmark.model';
import { Observable, switchMap, of, take } from 'rxjs';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';

@Component({
  selector: 'app-bookmarks-list',
  standalone: true,
  imports: [CommonModule, MatListModule, MatIconModule, MatTreeModule, MatButtonModule],
  templateUrl: './bookmarks-list.component.html',
  styleUrl: './bookmarks-list.component.scss'
})
export class BookmarksListComponent implements OnInit {
  private bookmarkService = inject(BookmarkService);
  private authService = inject(AuthService);

  treeControl = new NestedTreeControl<BookmarkTreeNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<BookmarkTreeNode>();

  hasChild = (_: number, node: BookmarkTreeNode) => !!node.children && node.children.length > 0;

  ngOnInit() {
    this.authService.user$.pipe(
      switchMap(user => user ? this.bookmarkService.getBookmarkTree(user.uid) : of([]))
    ).subscribe(data => {
      this.dataSource.data = data || [];
    });
  }

  deleteNode(node: BookmarkTreeNode) {
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.bookmarkService.deleteBookmark(user.uid, node.id).subscribe({
          error: (err) => console.error('Error deleting bookmark:', err)
        });
      }
    });
  }
}
