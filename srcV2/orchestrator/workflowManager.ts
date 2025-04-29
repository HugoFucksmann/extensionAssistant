// # Gestión de flujos de trabajo

// Manejo de errores en cascada: Si una herramienta falla, debemos tener un plan alternativo
/* async executeStep(step: PlanStep, context: SessionContext): Promise<StepResult> {
    try {
      const tool = this.toolRegistry.getTool(step.toolName);
      return await tool.execute(step.toolParams, context);
    } catch (error) {
      if (step.fallbackStep) {
        context.setState('lastError', error);
        return this.executeStep(plan.steps[step.fallbackStep], context);
      }
      throw error;
    }
  } */



    /* 
    Retroalimentación continua:

Agregar mecanismo para que las herramientas reporten progreso
Permitir que el usuario interrumpa flujos largos
    */