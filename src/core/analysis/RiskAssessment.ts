// src/core/analysis/RiskAssessment.ts

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface TaskAnalysis {
    estimatedSteps: number;
    complexityScore: number; // 0-1
    impactScore: number; // 0-1
    riskLevel: RiskLevel;
    confidence: number; // 0-1
    reasoning: string[];
}

/**
 * Analiza una consulta de usuario para evaluar su riesgo y complejidad.
 * Este componente es puramente informativo y no toma decisiones de ejecución.
 */
export class RiskAssessment {
    // Palabras clave que indican complejidad
    private complexityKeywords = {
        high: ['refactor', 'implement', 'architecture', 'design', 'integrate', 'feature'],
        medium: ['add', 'update', 'debug', 'optimize', 'connect'],
        low: ['explain', 'find', 'what is', 'show me', 'list'],
    };

    // Palabras clave que indican impacto (potencial de cambio destructivo)
    private impactKeywords = {
        high: ['delete', 'remove', 'overwrite', 'change all', 'replace all'],
        medium: ['modify', 'write', 'create file', 'rename'],
        low: ['read', 'search', 'get', 'analyze', 'check'],
    };

    /**
     * Evalúa una consulta y devuelve un análisis estructurado de su riesgo.
     * @param query La consulta del usuario.
     * @returns Un objeto TaskAnalysis con la evaluación.
     */
    public evaluateTask(query: string): TaskAnalysis {
        const lowerCaseQuery = query.toLowerCase();
        const reasoning: string[] = [];

        const complexity = this.estimateComplexity(lowerCaseQuery, reasoning);
        const impact = this.evaluateImpact(lowerCaseQuery, reasoning);
        const riskLevel = this.calculateRiskLevel(complexity, impact, reasoning);
        const confidence = this.calculateConfidence(reasoning);

        return {
            estimatedSteps: complexity.steps,
            complexityScore: complexity.score,
            impactScore: impact.score,
            riskLevel,
            confidence,
            reasoning,
        };
    }

    private estimateComplexity(query: string, reasoning: string[]): { score: number; steps: number } {
        if (this.hasKeyword(query, this.complexityKeywords.high)) {
            reasoning.push('Query suggests a high-complexity task (e.g., refactoring, new feature).');
            return { score: 0.8, steps: 10 };
        }
        if (this.hasKeyword(query, this.complexityKeywords.medium)) {
            reasoning.push('Query suggests a medium-complexity task (e.g., adding, debugging).');
            return { score: 0.5, steps: 5 };
        }
        if (this.hasKeyword(query, this.complexityKeywords.low)) {
            reasoning.push('Query suggests a low-complexity task (e.g., explanation, search).');
            return { score: 0.2, steps: 2 };
        }
        reasoning.push('Default complexity assumed as medium due to lack of specific keywords.');
        return { score: 0.4, steps: 3 }; // Default
    }

    private evaluateImpact(query: string, reasoning: string[]): { score: number } {
        if (this.hasKeyword(query, this.impactKeywords.high)) {
            reasoning.push('Query contains high-impact keywords suggesting destructive changes (e.g., delete, remove).');
            return { score: 0.9 };
        }
        if (this.hasKeyword(query, this.impactKeywords.medium)) {
            reasoning.push('Query contains medium-impact keywords suggesting file modifications (e.g., write, create).');
            return { score: 0.6 };
        }
        if (this.hasKeyword(query, this.impactKeywords.low)) {
            reasoning.push('Query contains low-impact keywords suggesting read-only operations (e.g., read, search).');
            return { score: 0.1 };
        }
        reasoning.push('Default impact assumed as low due to lack of specific keywords.');
        return { score: 0.1, }; // Default to low impact
    }

    private calculateRiskLevel(
        complexity: { score: number },
        impact: { score: number },
        reasoning: string[]
    ): RiskLevel {
        const totalScore = (complexity.score + impact.score) / 2;
        if (impact.score > 0.8) {
            reasoning.push('Risk elevated to Critical due to high-impact score.');
            return 'Critical';
        }
        if (totalScore > 0.7) {
            reasoning.push('Risk assessed as High based on combined complexity and impact.');
            return 'High';
        }
        if (totalScore > 0.4) {
            reasoning.push('Risk assessed as Medium based on combined complexity and impact.');
            return 'Medium';
        }
        reasoning.push('Risk assessed as Low based on combined complexity and impact.');
        return 'Low';
    }

    private calculateConfidence(reasoning: string[]): number {
        // La confianza es mayor si se encontraron palabras clave específicas.
        const baseConfidence = 0.6;
        const keywordsFoundBonus = (reasoning.filter(r => !r.includes('Default')).length / reasoning.length) * 0.4;
        return Math.min(baseConfidence + keywordsFoundBonus, 0.95);
    }

    private hasKeyword(query: string, keywords: string[]): boolean {
        return keywords.some(keyword => query.includes(keyword));
    }
}