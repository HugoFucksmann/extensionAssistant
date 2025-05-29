import * as crypto from 'crypto';

export class WebviewStateManager {
  private currentChatId: string | null = null;
  private currentOperationId: string | null = null;
  private testModeEnabled: boolean = false;

  public getCurrentChatId(): string | null {
    return this.currentChatId;
  }

  public getCurrentOperationId(): string | null {
    return this.currentOperationId;
  }

  public isTestModeEnabled(): boolean {
    return this.testModeEnabled;
  }

  public setTestMode(enabled: boolean): void {
    this.testModeEnabled = enabled;
  }

  public startNewChat(): void {
    this.currentChatId = this.generateChatId();
    this.currentOperationId = null;
  }

  public startNewOperation(): string {
    this.currentOperationId = `op_${crypto.randomBytes(8).toString('hex')}`;
    return this.currentOperationId;
  }

  public clearCurrentOperation(): void {
    this.currentOperationId = null;
  }

  public initializeChat(): void {
    this.currentChatId = this.generateChatId();
  }

  private generateChatId(): string {
    return `chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
}