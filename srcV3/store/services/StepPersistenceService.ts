// src/store/services/StepPersistenceService.ts

import { IStepRepository, ExecutionStepEntity } from "../interfaces/IStepRepository";
import { EventEmitterService } from "../../events/EventEmitterService";

/**
 * Service layer for Execution Step persistence.
 * Wraps the StepRepository and adds business logic/event emission.
 */
export class StepPersistenceService {
     constructor(
         private stepRepository: IStepRepository,
         private eventEmitter: EventEmitterService // Inject EventEmitterService
     ) {
          console.log('[StepPersistenceService] Initialized.');
     }

     async saveExecutionStep(step: ExecutionStepEntity): Promise<ExecutionStepEntity> {
         // This method handles both creation and update based on whether step.id is provided
         if (step.id) {
             // Assuming update logic is needed if step is already created (e.g., status change)
             // For steps, we typically create once, then maybe update status/result/error.
             // The StepRepository update method is structured for this.
             await this.stepRepository.update(step.id, step);
              const updatedStep = await this.stepRepository.findById(step.id); // Fetch full updated step
              if (updatedStep) {
                   this.eventEmitter.emit('executionStepUpdated', updatedStep);
                   return updatedStep;
              } else {
                   // Should not happen if update was successful
                   throw new Error(`Failed to retrieve updated step with ID ${step.id}`);
              }
         } else {
             const newStep = await this.stepRepository.create(step);
             this.eventEmitter.emit('executionStepCreated', newStep);
             return newStep;
         }
     }

     async getStepsForTrace(traceId: string): Promise<ExecutionStepEntity[]> {
         return this.stepRepository.getStepsForTrace(traceId);
     }

      dispose(): void {
          console.log('[StepPersistenceService] Disposed.');
      }
}