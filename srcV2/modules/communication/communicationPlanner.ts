import { LoggerService } from '../../utils/logger';
import { BaseAPI } from '../../models/baseAPI';
import { runPrompt } from '../../core/promptSystem/promptSystem';

export interface CommunicationPlan {
  responseType: 'direct' | 'structured';
  includeCodeSnippets: boolean;
  includeSuggestions: boolean;
  includeFollowUpQuestions: boolean;
  tone: 'formal' | 'conversational' | 'technical';
}

export class CommunicationPlanner {
  constructor(
    private logger: LoggerService,
    private modelApi: BaseAPI
  ) {
    this.logger.info('CommunicationPlanner initialized');
  }
  
  public async createCommunicationPlan(
    originalRequest: string,
    actionResults: any
  ): Promise<CommunicationPlan> {
    try {
      this.logger.info('Creating communication plan', { originalRequest });
      
      const context = {
        originalRequest,
        actionResults
      };

      return await runPrompt<CommunicationPlan>(
        'communication',
        context,
        this.modelApi
      );
    } catch (error) {
      this.logger.error('Error creating communication plan', { error });
      return this.getDefaultPlan();
    }
  }

  private getDefaultPlan(): CommunicationPlan {
    return {
      responseType: 'direct',
      includeCodeSnippets: false,
      includeSuggestions: false,
      includeFollowUpQuestions: false,
      tone: 'conversational'
    };
  }
}
