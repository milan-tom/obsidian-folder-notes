import { Plugin, TFile, TFolder, TAbstractFile } from 'obsidian'
import { DEFAULT_SETTINGS, FolderNotesSettings, SettingsTab } from './settings'
export default class FolderNotesPlugin extends Plugin {
  observer: MutationObserver
  folders: TFolder[] = []
  settings: FolderNotesSettings
  settingsTab: SettingsTab;
  async onload() {
    console.log('loading folder notes plugin');
    await this.loadSettings();
    this.settingsTab = new SettingsTab(this.app, this);
    if (this.settings.hideFolderNote) {
      document.body.classList.add('hide-folder-note');
    } else {
      document.body.classList.remove('hide-folder-note');
    }
    this.registerEvent(this.app.vault.on('create', (file: TAbstractFile) => {
      if (!this.settings.autoCreate) return;
      if (file instanceof TFolder) {
        const path = file.path + '/' + file.name + '.md';
        this.createFolderNote(path);
      }
    }));

    this.registerEvent(this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
      if (!this.settings.autoRename) return;
      if (file instanceof TFolder) {
        const folder = this.app.vault.getAbstractFileByPath(file?.path);
        const oldName = oldPath.substring(oldPath.lastIndexOf('/' || '\\'));
        const newPath = folder?.path + '/' + folder?.name + '.md';
        if (folder instanceof TFolder) {
          const note = this.app.vault.getAbstractFileByPath(oldPath + '/' + oldName + '.md');
          if (!note) return;
          (note as any).path = folder.path + '/' + oldName + '.md';
          if (note instanceof TFile) {
            this.app.vault.rename(note, newPath);
          }
        }
      } else if (file instanceof TFile) {
        const folder = this.app.vault.getAbstractFileByPath(oldPath.substring(0, oldPath.lastIndexOf('/' || '\\')));
        if (folder instanceof TFolder) {
          this.app.vault.rename(folder, folder.path.substring(0, folder.path.lastIndexOf('/' || '\\')) + '/' + file.name.substring(0, file.name.lastIndexOf('.')));
        }
      }
    }));

    this.observer = new MutationObserver((mutations: MutationRecord[]) => {
      mutations.forEach((rec) => {
        if (rec.type === 'childList') {
          (<Element>rec.target).querySelectorAll('div.nav-folder-title-content')
            .forEach((element: HTMLElement) => {
              element.onclick = (event: MouseEvent) => this.handleFolderClick(event);
            });
        } 
      })
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

  }

  async handleFolderClick(event: MouseEvent) {
    if (!(event.target instanceof HTMLElement)) return;
    event.stopImmediatePropagation();

    const folder = event.target.parentElement?.getAttribute('data-path');
    const path = folder + '/' + event.target.innerText + '.md';

    if (this.app.vault.getAbstractFileByPath(path)) {
      this.openFolderNote(path);
      event.target.parentElement?.parentElement?.getElementsByClassName('nav-folder-children').item(0)?.querySelectorAll('div.nav-file')
        .forEach((element: HTMLElement) => {
          if (element.innerText === (event.target as HTMLElement)?.innerText) {
            element.classList.add('is-folder-note');
          }
        });

    } else if (event.altKey || event.ctrlKey) {
      if ((this.settings.altKey && event.altKey) || (this.settings.ctrlKey && event.ctrlKey)) {
        this.createFolderNote(path);
        event.target.parentElement?.parentElement?.getElementsByClassName('nav-folder-children').item(0)?.querySelectorAll('div.nav-file')
        .forEach((element: HTMLElement) => {
          if (element.innerText === (event.target as HTMLElement)?.innerText) {
            element.classList.add('is-folder-note');
          }
        });
      } else {
        event.target.onclick = null;
        event.target.click();
      }
    } else {
      event.target.onclick = null;
      event.target.click();
    }
  }

  async createFolderNote(path: string) {
    const leaf = this.app.workspace.getLeaf(false);
    const file = await this.app.vault.create(path, '');
    await leaf.openFile(file);
  }

  async openFolderNote(path: string) {
    const leaf = this.app.workspace.getLeaf(false);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      await leaf.openFile(file);
    }
  }

  onunload() {
    console.log('unloading folder notes plugin');
    this.observer.disconnect();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
