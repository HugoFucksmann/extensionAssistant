export class WebviewStateManager {
  private currentModel: string | null = null;
  private isSidebarVisible: boolean = true;
  private isDarkMode: boolean = false;


  public getCurrentModel(): string | null {
    return this.currentModel;
  }


  public setCurrentModel(model: string): void {
    this.currentModel = model;
  }

  public getSidebarVisibility(): boolean {
    return this.isSidebarVisible;
  }

  public getDarkMode(): boolean {
    return this.isDarkMode;
  }
}