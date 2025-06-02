export class WebviewStateManager {
  private currentModel: string | null = null;
  private isSidebarVisible: boolean = true;
  private isDarkMode: boolean = false;

  /**
   * Gets the current model
   */
  public getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Sets the current model
   */
  public setCurrentModel(model: string): void {
    this.currentModel = model;
  }

  /**
   * Sets the sidebar visibility
   */
  public setSidebarVisibility(visible: boolean): void {
    this.isSidebarVisible = visible;
  }

  /**
   * Gets the sidebar visibility
   */
  public getSidebarVisibility(): boolean {
    return this.isSidebarVisible;
  }

  /**
   * Sets the dark mode
   */
  public setDarkMode(enabled: boolean): void {
    this.isDarkMode = enabled;
  }

  /**
   * Gets the dark mode state
   */
  public getDarkMode(): boolean {
    return this.isDarkMode;
  }
}