import { Component, EventEmitter, Output, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [MatIconModule, FormsModule],
  templateUrl: './settings-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDialog {
  @Output() closeSettings = new EventEmitter<void>();
  apiKey = signal(localStorage.getItem('GEMINI_API_KEY') || '');

  save() {
    localStorage.setItem('GEMINI_API_KEY', this.apiKey());
    this.closeSettings.emit();
  }

  cancel() {
    this.closeSettings.emit();
  }
}
