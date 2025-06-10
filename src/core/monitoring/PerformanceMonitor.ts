// src/core/monitoring/PerformanceMonitor.ts

export interface NodePerformance {
    nodeName: string;
    averageDuration: number;
    callCount: number;
    errorRate: number;
    lastError?: string;
    minDuration: number;
    maxDuration: number;
}

// CAMBIO: Añadido un tipo para el reporte agrupado.
export type GroupedPerformanceReport = Record<string, NodePerformance[]>;

export class PerformanceMonitor {
    private nodeMetrics: Map<string, {
        durations: number[];
        errors: number;
        totalCalls: number;
        lastError?: string;
    }> = new Map();

    private readonly MAX_DURATION_SAMPLES = 100;

    /**
     * Registra la ejecución de un nodo o proceso.
     * @param nodeName - El nombre del nodo. Se recomienda usar un prefijo para el modo,
     *                   ej: 'simple:tool_execution', 'planner:analysis'.
     * @param duration - La duración de la ejecución en milisegundos.
     * @param error - Un mensaje de error si la ejecución falló.
     */
    public trackNodeExecution(nodeName: string, duration: number, error?: string): void {
        if (!this.nodeMetrics.has(nodeName)) {
            this.nodeMetrics.set(nodeName, {
                durations: [],
                errors: 0,
                totalCalls: 0
            });
        }

        const metrics = this.nodeMetrics.get(nodeName)!;
        metrics.durations.push(duration);
        metrics.totalCalls++;

        if (error) {
            metrics.errors++;
            metrics.lastError = error;
        }

        if (metrics.durations.length > this.MAX_DURATION_SAMPLES) {
            metrics.durations.shift();
        }
    }

    /**
     * Genera un reporte de rendimiento plano de todos los nodos monitoreados.
     * @returns Un array de objetos NodePerformance.
     */
    public getReport(): NodePerformance[] {
        const performances: NodePerformance[] = [];

        for (const [nodeName, metrics] of this.nodeMetrics) {
            const performance = this.calculateNodePerformance(nodeName, metrics);
            if (performance) {
                performances.push(performance);
            }
        }

        return performances.sort((a, b) => b.averageDuration - a.averageDuration);
    }

    /**
     * CAMBIO: Nuevo método para obtener un reporte agrupado por un prefijo (ej. el modo).
     * @param-groupByPrefix El caracter usado para separar el prefijo (ej: ':').
     * @returns Un objeto donde las claves son los prefijos y los valores son los reportes de rendimiento.
     */
    public getGroupedReport(groupByPrefix: string = ':'): GroupedPerformanceReport {
        const groupedReport: GroupedPerformanceReport = {};
        const allNodesReport = this.getReport();

        for (const nodePerformance of allNodesReport) {
            const parts = nodePerformance.nodeName.split(groupByPrefix);
            const groupName = parts.length > 1 ? parts[0] : 'general';

            if (!groupedReport[groupName]) {
                groupedReport[groupName] = [];
            }

            // Opcional: limpiar el nombre del nodo del prefijo para el reporte
            // nodePerformance.nodeName = parts.length > 1 ? parts.slice(1).join(groupByPrefix) : nodePerformance.nodeName;
            groupedReport[groupName].push(nodePerformance);
        }

        return groupedReport;
    }

    public getNodeMetrics(nodeName: string): NodePerformance | undefined {
        const metrics = this.nodeMetrics.get(nodeName);
        return this.calculateNodePerformance(nodeName, metrics);
    }

    private calculateNodePerformance(nodeName: string, metrics: any): NodePerformance | undefined {
        if (!metrics || metrics.totalCalls === 0) return undefined;

        const averageDuration = metrics.durations.length > 0
            ? metrics.durations.reduce((a: number, b: number) => a + b, 0) / metrics.durations.length
            : 0;
        const errorRate = metrics.errors / metrics.totalCalls;
        const minDuration = metrics.durations.length > 0 ? Math.min(...metrics.durations) : 0;
        const maxDuration = metrics.durations.length > 0 ? Math.max(...metrics.durations) : 0;

        return {
            nodeName,
            averageDuration,
            callCount: metrics.totalCalls,
            errorRate,
            lastError: metrics.lastError,
            minDuration,
            maxDuration,
        };
    }

    public reset(): void {
        this.nodeMetrics.clear();
    }

    public resetNode(nodeName: string): void {
        this.nodeMetrics.delete(nodeName);
    }
}