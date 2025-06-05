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

export class PerformanceMonitor {
    private nodeMetrics: Map<string, {
        durations: number[];
        errors: number;
        totalCalls: number;
        lastError?: string;
    }> = new Map();

    private readonly MAX_DURATION_SAMPLES = 100;

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

        // Mantener solo las últimas N muestras de duración para evitar consumo excesivo de memoria
        if (metrics.durations.length > this.MAX_DURATION_SAMPLES) {
            metrics.durations.shift();
        }
    }

    public getReport(): NodePerformance[] {
        const performances: NodePerformance[] = [];

        for (const [nodeName, metrics] of this.nodeMetrics) {
            if (metrics.totalCalls === 0) continue;

            const averageDuration = metrics.durations.length > 0
                ? metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length
                : 0;
            const errorRate = metrics.errors / metrics.totalCalls;
            const minDuration = metrics.durations.length > 0 ? Math.min(...metrics.durations) : 0;
            const maxDuration = metrics.durations.length > 0 ? Math.max(...metrics.durations) : 0;

            performances.push({
                nodeName,
                averageDuration,
                callCount: metrics.totalCalls,
                errorRate,
                lastError: metrics.lastError,
                minDuration,
                maxDuration,
            });
        }

        // Ordenar por número de llamadas o duración promedio para identificar cuellos de botella
        return performances.sort((a, b) => b.averageDuration - a.averageDuration);
    }

    public getNodeMetrics(nodeName: string): NodePerformance | undefined {
        const metrics = this.nodeMetrics.get(nodeName);
        if (!metrics || metrics.totalCalls === 0) return undefined;

        const averageDuration = metrics.durations.length > 0
            ? metrics.durations.reduce((a, b) => a + b, 0) / metrics.durations.length
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