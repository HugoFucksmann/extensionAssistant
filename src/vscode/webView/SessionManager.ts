export class SessionManager {
    private currentChatId: string | undefined;
    private isSessionActive = false;
  
    public getCurrentChatId(): string | undefined {
      return this.currentChatId;
    }
  
    public isActive(): boolean {
      return this.isSessionActive;
    }
  
    public startNewChat(): string {
      this.currentChatId = this.generateChatId();
      this.isSessionActive = true;
      console.log(`[SessionManager] New chat started: ${this.currentChatId}`);
      return this.currentChatId;
    }
  
    public async initializeOrRestore(): Promise<{ chatId: string; isNew: boolean }> {
      if (this.isSessionActive && this.currentChatId) {
        console.log(`[SessionManager] Session already active: ${this.currentChatId}`);
        return { chatId: this.currentChatId, isNew: false };
      }
  
      this.currentChatId = this.generateChatId();
      this.isSessionActive = true;
      console.log(`[SessionManager] New session initialized: ${this.currentChatId}`);
      return { chatId: this.currentChatId, isNew: true };
    }
  
    public endSession(): void {
      this.isSessionActive = false;
      // Keep chatId for potential restoration
    }
  
    private generateChatId(): string {
      return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  }