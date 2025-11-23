import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-add-link-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './add-link-dialog.component.html',
  styleUrl: './add-link-dialog.component.scss'
})
export class AddLinkDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddLinkDialogComponent>);

  linkForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    url: ['', [Validators.required, Validators.pattern('https?://.+')]],
    description: ['']
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.linkForm.valid) {
      this.dialogRef.close(this.linkForm.value);
    }
  }
}
