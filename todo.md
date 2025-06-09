# Plan Unificado - Extensión VS Code con Modos de Ejecución

## COMPONENTES CORE UNIFICADOS

### ExecutionEngine (Motor Principal)
```typescript
interface ExecutionEngine {
  currentMode: 'simple' | 'planner' | 'supervised';
  state: ExecutionState;
  executeTask(query: string): Promise<Result>;  // Usa modo actual
  createCheckpoint(): Checkpoint;
  rollback(checkpointId: string): void;
}
```

### ExecutionState (Estado Unificado)
```typescript
interface ExecutionState {
  // Estado básico (usado por todos los modos)
  sessionId: string;
  mode: 'simple' | 'planner' | 'supervised';  // Solo lectura - set por usuario
  step: number;
  lastResult: any;
  errorCount: number;
  
  // Estado extendido (solo para modos complejos)
  executionState?: 'planning' | 'executing' | 'paused' | 'completed' | 'error';
  planText?: string;
  checkpoints?: Checkpoint[];
  progress?: number;
  metrics?: ExecutionMetrics;
}
```

### RiskAssessment (Solo Informativo)
```typescript
class RiskAssessment {
  // Solo evalúa y reporta - NO sugiere cambio de modo
  evaluateTask(query: string): TaskAnalysis {
    const complexity = this.estimateComplexity(query);
    const impact = this.evaluateImpact(query);
    
    return {
      estimatedSteps: complexity.steps,
      complexityScore: complexity.score,
      riskLevel: this.calculateRiskLevel(complexity, impact),
      confidence: this.calculateConfidence(),
      reasoning: this.generateReasoning(),
      // NO incluye recommendedMode
    };
  }
}
```

## IMPLEMENTACIÓN DE MODOS

### Modo Simple (Usuario selecciona)
```typescript
class SimpleMode extends BaseMode {
  async execute(query: string): Promise<Result> {
    const state = this.stateManager.getState();
    
    while (!this.isComplete() && state.errorCount < 3) {
      const memory = await this.memoryManager.getRelevantMemory(state, 100);
      const action = await this.simplePlanner.getNextAction(memory);
      const result = await this.executor.execute(action);
      
      state.step++;
      state.lastResult = result;
      
      if (result.error) state.errorCount++;
      if (this.shouldContinue(result)) continue;
      else break;
    }
    return this.generateFinalResponse();
  }
}
```

### Modo Planificador (Usuario selecciona)
```typescript
class PlannerMode extends BaseMode {
  async execute(query: string): Promise<Result> {
    let currentPlan = await this.createDetailedPlan(query);
    const state = this.stateManager.getState();
    
    while (!this.isComplete()) {
      const memory = await this.memoryManager.getRelevantMemory(state, 200);
      const analysis = await this.robustPlanner.analyze({
        originalPlan: currentPlan,
        currentProgress: this.getProgress(),
        lastResult: state.lastResult,
        memory: memory
      });
      
      // Replanificación automática dentro del mismo modo
      if (this.shouldReplan(analysis, state)) {
        currentPlan = await this.replan(analysis.alternatives, state);
        this.createCheckpoint();
      }
      
      await this.executeStep(analysis);
      state.step++;
    }
    
    return this.generateFinalResponse();
  }
  
  private shouldReplan(analysis: PlanAnalysis, state: ExecutionState): boolean {
    return analysis.deviationScore > 0.4 ||
           state.errorCount >= 3 ||
           analysis.resourcesUnavailable ||
           analysis.invalidatedStepsCount > 0;
  }
}
```

### Modo No Supervisado (Usuario selecciona)
```typescript
class SupervisedMode extends BaseMode {
  async execute(query: string): Promise<Result> {
    // Fase de preparación colaborativa
    const collaborativePlan = await this.buildCollaborativePlan(query);
    const validatedPlan = await this.validatePlan(collaborativePlan);
    
    const state = this.stateManager.getState();
    state.planText = validatedPlan.text;
    
    while (!this.isComplete()) {
      const memory = await this.memoryManager.getRelevantMemory(state, 300);
      const adherenceCheck = await this.checkPlanAdherence(state, memory);
      
      // Solo pausa - NO cambia modo automáticamente
      if (adherenceCheck.requiresEscalation) {
        await this.escalateToUser(adherenceCheck.reason);
        return this.pauseExecution();
      }
      
      await this.executeStep(adherenceCheck.nextAction);
      state.step++;
    }
    
    return this.generateFinalResponse();
  }
}
```

## SISTEMA DE MEMORIA SEGMENTADA

### Arquitectura SQLite con LangChain
```typescript
class MemoryManager {
  async getRelevantMemory(state: ExecutionState, maxTokens: number): Promise<MemoryEntry[]> {
    const modeSpecificQuery = this.buildModeQuery(state.mode);
    const results = await this.store.search(modeSpecificQuery, [
      state.sessionId,
      state.mode,
      Date.now() - (24 * 60 * 60 * 1000),
      10
    ]);
    
    return this.tokenLimitedResults(results, maxTokens);
  }
  
  private buildModeQuery(mode: string): string {
    const baseQuery = `
      SELECT * FROM memory_entries 
      WHERE session_id = ? AND context_mode = ? AND timestamp > ?
    `;
    
    switch(mode) {
      case 'simple':
        return baseQuery + ` AND type IN ('error', 'solution') ORDER BY timestamp DESC LIMIT ?`;
      case 'planner':
        return baseQuery + ` AND type IN ('success', 'pattern') ORDER BY relevance_score DESC LIMIT ?`;
      case 'supervised':
        return baseQuery + ` ORDER BY timestamp DESC LIMIT ?`;
      default:
        return baseQuery + ` LIMIT ?`;
    }
  }
}
```

### Esquema SQLite Optimizado
```sql
CREATE TABLE memory_entries (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  timestamp INTEGER,
  type TEXT CHECK(type IN ('tool_result', 'error', 'success', 'plan', 'user_feedback', 'solution')),
  content TEXT,
  context_mode TEXT CHECK(context_mode IN ('simple', 'planner', 'supervised')),
  context_tools TEXT,
  context_files TEXT,
  relevance_score REAL DEFAULT 1.0,
  related_to TEXT DEFAULT '[]',
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_session_mode_timestamp ON memory_entries(session_id, context_mode, timestamp);
CREATE INDEX idx_type_relevance ON memory_entries(type, relevance_score);
```

## INTERFAZ DE USUARIO - SELECCIÓN DE MODO

### Panel de Control
```typescript
class ControlPanel {
  renderModeSelector(): void {
    // Selector fijo - usuario elige modo
    const modes = [
      { id: 'simple', name: 'Simple', description: 'Ejecución directa paso a paso' },
      { id: 'planner', name: 'Planificador', description: 'Planificación detallada con replanificación' },
      { id: 'supervised', name: 'No Supervisado', description: 'Ejecución autónoma con plan validado' }
    ];
    
    // UI permite al usuario seleccionar modo antes de enviar query
    this.showModeButtons(modes);
  }
  
  onModeSelected(mode: string, query: string): void {
    // Usuario selecciona modo + envía query
    this.executionEngine.currentMode = mode;
    this.executionEngine.executeTask(query);
  }
}
```

## SISTEMA DE CHECKPOINTS Y RECUPERACIÓN

```typescript
interface Checkpoint {
  id: string;
  timestamp: Date;
  state: ExecutionState;
  results: ToolResult[];
  memorySnapshot: MemoryEntry[];
  canRollback: boolean;
}

class CheckpointManager {
  async createCheckpoint(reason: string): Promise<Checkpoint> {
    const currentState = this.stateManager.getState();
    const memorySnapshot = await this.memoryManager.getCurrentMemory();
    
    const checkpoint: Checkpoint = {
      id: generateId(),
      timestamp: new Date(),
      state: { ...currentState },
      results: [...currentState.results],
      memorySnapshot: [...memorySnapshot],
      canRollback: this.canSafelyRollback(reason)
    };
    
    await this.saveCheckpoint(checkpoint);
    return checkpoint;
  }
  
  async rollback(checkpointId: string): Promise<void> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (!checkpoint.canRollback) {
      throw new Error('Cannot rollback to this checkpoint');
    }
    
    this.stateManager.restoreState(checkpoint.state);
    await this.memoryManager.restoreMemory(checkpoint.memorySnapshot);
    await this.cleanupAfterCheckpoint(checkpoint.timestamp);
  }
}
```

## ESPECIFICACIÓN DE PROMPTS Y RESPUESTAS

### Prompt de Modo Simple
**Input Keys:**
```typescript
interface SimplePromptInput {
  query: string;              // Consulta del usuario
  memory: MemoryEntry[];      // Últimos errores y soluciones (max 100 tokens)
  currentFile?: string;       // Archivo activo en editor
  workspace: string[];        // Lista de archivos del workspace
  lastResult?: ToolResult;    // Resultado de la acción anterior
  step: number;               // Número de paso actual
  errorCount: number;         // Contador de errores consecutivos
}
```

**Expected Response:**
```typescript
interface SimpleResponse {
  action: {
    tool: string;             // Nombre de la herramienta a usar
    parameters: any;          // Parámetros específicos de la herramienta
  };
  reasoning: string;          // Explicación breve de por qué esta acción
  continue: boolean;          // Si debe continuar después de esta acción
  confidence: number;         // Confianza en la acción (0-1)
}
```

### Prompt de Modo Planificador
**Input Keys:**
```typescript
interface PlannerPromptInput {
  query: string;
  memory: MemoryEntry[];      // Patrones exitosos y contexto (max 200 tokens)
  currentPlan?: Plan;         // Plan actual si existe
  progress: number;           // Progreso actual (0-1)
  lastResult?: ToolResult;
  deviationAnalysis?: {       // Si hay desviación del plan
    expectedVsActual: string;
    impactedSteps: number[];
    availableResources: string[];
  };
  step: number;
  errorCount: number;
}
```

**Expected Response:**
```typescript
interface PlannerResponse {
  planUpdate?: {
    type: 'create' | 'modify' | 'continue';
    steps: PlanStep[];        // Lista de pasos detallados
    estimatedTime: number;    // Tiempo estimado en minutos
    checkpoints: number[];    // En qué pasos crear checkpoints
  };
  nextAction: {
    tool: string;
    parameters: any;
    stepIndex: number;        // Qué paso del plan está ejecutando
  };
  replanRequired: boolean;    // Si necesita replanificar
  reasoning: string;
  confidence: number;
}
```

### Prompt de Modo No Supervisado
**Input Keys:**
```typescript
interface SupervisedPromptInput {
  query: string;
  memory: MemoryEntry[];      // Historial completo y plan (max 300 tokens)
  validatedPlan: Plan;        // Plan previamente validado con usuario
  adherenceCheck: {
    currentStep: number;
    planStep: PlanStep;
    actualResult: any;
    expectedResult: any;
    deviation: number;        // Grado de desviación (0-1)
  };
  autonomyLevel: number;      // Nivel de autonomía permitido (0-1)
  escalationHistory: string[]; // Escalaciones previas
}
```

**Expected Response:**
```typescript
interface SupervisedResponse {
  decision: 'continue' | 'escalate' | 'pause' | 'complete';
  nextAction?: {
    tool: string;
    parameters: any;
    justification: string;    // Por qué es adherente al plan
  };
  escalation?: {
    reason: string;           // Por qué necesita escalación
    userQuestion: string;     // Pregunta específica al usuario
    suggestedOptions: string[]; // Opciones propuestas
  };
  planAdherence: number;      // Qué tan adherente al plan (0-1)
  reasoning: string;
  confidence: number;
}

## MÉTRICAS DE ÉXITO

### KPIs por Modo
- **Simple:** >90% tasa de éxito, <10s tiempo promedio
- **Planner:** >85% tasa de éxito, replanificación <25% casos
- **Supervised:** >95% tasa de éxito, escalación <10% casos

### Analytics Dashboard
```typescript
interface Analytics {
  modeUsage: Record<'simple' | 'planner' | 'supervised', number>;
  successRates: Record<'simple' | 'planner' | 'supervised', number>;
  averageExecutionTime: Record<'simple' | 'planner' | 'supervised', number>;
  memoryEfficiency: {
    hitRate: number;
    compressionRatio: number;
    retrievalSpeed: number;
  };
}
```

## CONSIDERACIONES TÉCNICAS

### Gestión de Recursos
- **Memory Limits:** Por modo (Simple: 100, Planner: 200, Supervised: 300 tokens)
- **Checkpoints:** Auto-limpieza LRU
- **Performance:** Indexación SQLite optimizada

### Flujo de Usuario
1. Usuario selecciona modo en UI
2. Usuario envía query
3. Sistema ejecuta en modo seleccionado
4. Sistema permanece en mismo modo hasta nueva selección manual