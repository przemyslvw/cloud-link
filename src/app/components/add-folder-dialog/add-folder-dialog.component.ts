import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { BookmarkService } from '../../services/bookmark.service';
import { AuthService } from '../../services/auth.service';
import { Folder } from '../../models/bookmark.model';
import { Observable, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-add-folder-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './add-folder-dialog.component.html',
  styleUrl: './add-folder-dialog.component.scss'
})
export class AddFolderDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddFolderDialogComponent>);
  private bookmarkService = inject(BookmarkService);
  private authService = inject(AuthService);

  folders$: Observable<Folder[]> = of([]);

  folderForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    parentId: [null],
    description: ['']
  });

  ngOnInit() {
    this.folders$ = this.authService.user$.pipe(
      switchMap(user => user ? this.bookmarkService.getFolders(user.uid) : of([]))
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.folderForm.valid) {
      this.dialogRef.close(this.folderForm.value);
    }
  }
}
