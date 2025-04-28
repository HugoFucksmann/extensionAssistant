import { EventBus } from "../core/events/eventBus";


export class FeedbackManager {
  private eventBus: EventBus; // O conector UI

  constructor(/* Inyectar dependencias */) {
    // ... inicialización
  }

  public startPlanExecution(plan: Plan): void {
    // Notifica a la UI (via eventBus/conector) que un plan ha comenzado.
  }

  public updatePlanStatus(plan: Plan, status: Plan['status'], message?: string): void {
    // Notifica a la UI sobre el cambio de estado general del plan.
  }

  public startStepExecution(step: PlanStep, plan: Plan): void {
    // Notifica a la UI que un paso específico ha comenzado.
  }

  public updateStepProgress(stepId: string, progress: number, message?: string): void {
    // Notifica a la UI sobre el progreso de un paso.
  }

  public completeStepExecution(step: PlanStep, plan: Plan, result?: any): void {
    // Notifica a la UI que un paso ha terminado exitosamente.
  }

  public failStepExecution(step: PlanStep, plan: Plan, error: Error): void {
    // Notifica a la UI que un paso ha fallado.
  }

  public skipStepExecution(step: PlanStep, plan: Plan): void {
    // Notifica a la UI que un paso ha sido omitido.
  }

  public cancelPlanExecution(plan: Plan, reason: string): void {
    // Notifica a la UI que el plan ha sido cancelado.
  }

   public sendInfoMessage(message: string): void {
    // Envía un mensaje informativo general a la UI.
  }
}