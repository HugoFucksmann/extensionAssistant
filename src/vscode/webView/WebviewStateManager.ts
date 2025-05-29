import * as crypto from 'crypto';

export class WebviewStateManager {
  private currentChatId: string | null = null;
  private currentModel: string | null = null;

  public getCurrentChatId(): string | null {
    return this.currentChatId;
  }

  public getCurrentModel(): string | null {
    return this.currentModel;
  }

  public setCurrentModel(model: string): void {
    this.currentModel = model;
  }

  public startNewChat(): void {
    this.currentChatId = this.generateChatId();
  }

  public initializeChat(): void {
    this.currentChatId = this.generateChatId();
  }

  private generateChatId(): string {
    return `chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
}