import {ChangeDetectionStrategy, Component, ElementRef, signal, viewChild, inject, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import sdk, {Project} from '@stackblitz/sdk';
import { SettingsDialog } from './settings-dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, MatIconModule, SettingsDialog],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    'class': 'block h-screen w-full overflow-hidden bg-[#0e0e11] text-gray-300 font-sans'
  }
})
export class App {
  private embedContainer = viewChild<ElementRef<HTMLDivElement>>('embedContainer');
  private platformId = inject(PLATFORM_ID);
  
  isLoading = signal(false);
  files = signal<string[]>([]);
  hasProject = signal(false);
  isFullscreen = signal(false);
  showFallback = signal(false);
  showSettings = signal(false);
  private currentProject: Project | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('fullscreenchange', () => {
        this.isFullscreen.set(!!document.fullscreenElement);
      });
    }
  }

  async onFolderSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const uploadedFiles = input.files;
    
    if (!uploadedFiles || !uploadedFiles.length) return;

    this.isLoading.set(true);
    this.files.set([]);
    
    const projectFiles: Record<string, string> = {};
    const filePaths: string[] = [];

    try {
      for (const file of Array.from(uploadedFiles)) {
        const fullPath = (file as File & { webkitRelativePath: string }).webkitRelativePath || file.name;
        
        // Skip common large or unnecessary folders
        const skipFolders = [
          '/node_modules/', 
          '/.git/', 
          '/dist/', 
          '/build/', 
          '/.next/', 
          '/.angular/', 
          '/out/', 
          '/target/',
          '/.cache/'
        ];
        
        if (skipFolders.some(folder => fullPath.includes(folder))) {
          continue;
        }

        // Strip the root folder name to make package.json at root
        const pathParts = fullPath.split('/');
        const relativePath = pathParts.slice(1).join('/');
        
        if (!relativePath) continue;

        const content = await file.text();
        projectFiles[relativePath] = content;
        filePaths.push(relativePath);
      }

      this.files.set(filePaths);
      
      const container = this.embedContainer()?.nativeElement;
      if (container) {
        container.innerHTML = '';
        
        // Store project data for fallback
        this.currentProject = {
          title: 'Local Preview',
          description: 'Generated from local upload',
          template: 'node',
          files: projectFiles,
        };

        try {
          await sdk.embedProject(
            container,
            this.currentProject,
            {
              view: 'preview',
              height: '100%',
              forceEmbedLayout: true,
              hideNavigation: true,
              theme: 'dark',
              clickToLoad: false
            }
          );
          this.hasProject.set(true);
        } catch (embedError) {
          console.error('Embedding failed, trying fallback message:', embedError);
          this.hasProject.set(false);
          this.showFallback.set(true);
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Fehler beim Laden des Projekts. Details in der Konsole.');
    } finally {
      this.isLoading.set(false);
      // Reset input so same folder can be re-selected
      input.value = '';
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen();
      this.isFullscreen.set(false);
    }
  }

  toggleSettings() {
    this.showSettings.update(s => !s);
  }

  openInNewTab() {
    if (this.currentProject) {
      sdk.openProject(this.currentProject, { newWindow: true });
    }
  }
}
