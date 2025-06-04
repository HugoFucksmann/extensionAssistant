// src/vscode/webView/utils/webviewHelpers.ts
import { ChatMessage } from '../../../features/chat/types';

export class WebviewHelpers {

    /**
     * Validates that a message payload contains required fields
     */
    public static validateMessagePayload(payload: any, requiredFields: string[]): boolean {
        if (!payload || typeof payload !== 'object') {
            return false;
        }

        return requiredFields.every(field => {
            const fieldValue = payload[field];
            return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
        });
    }

    /**
     * Sanitizes text content for display in webview
     */
    public static sanitizeContent(content: string): string {
        if (typeof content !== 'string') {
            return '';
        }

        return content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Truncates text to specified length with ellipsis
     */
    public static truncateText(text: string, maxLength: number): string {
        if (!text || text.length <= maxLength) {
            return text;
        }

        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Formats timestamp for display
     */
    public static formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) {
            return 'ahora';
        } else if (diffMins < 60) {
            return `hace ${diffMins}m`;
        } else if (diffHours < 24) {
            return `hace ${diffHours}h`;
        } else if (diffDays < 7) {
            return `hace ${diffDays}d`;
        } else {
            return date.toLocaleDateString();
        }
    }

    /**
     * Extracts error message from various error types
     */
    public static extractErrorMessage(error: any): string {
        if (typeof error === 'string') {
            return error;
        }

        if (error && typeof error === 'object') {
            return error.message || error.error || error.errorMessage || 'Error desconocido';
        }

        return 'Error desconocido';
    }

    /**
     * Creates a deep clone of an object
     */
    public static deepClone<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime()) as unknown as T;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => WebviewHelpers.deepClone(item)) as unknown as T;
        }

        const cloned = {} as T;
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = WebviewHelpers.deepClone(obj[key]);
            }
        }

        return cloned;
    }

    /**
     * Checks if a ChatMessage is valid
     */
    public static isValidChatMessage(message: any): message is ChatMessage {
        return (
            message &&
            typeof message === 'object' &&
            typeof message.id === 'string' &&
            typeof message.content === 'string' &&
            typeof message.timestamp === 'number' &&
            ['user', 'assistant', 'system'].includes(message.sender)
        );
    }

    /**
     * Debounces a function call
     */
    public static debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: NodeJS.Timeout;

        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(null, args), wait);
        };
    }

    /**
     * Throttles a function call
     */
    public static throttle<T extends (...args: any[]) => any>(
        func: T,
        limit: number
    ): (...args: Parameters<T>) => void {
        let inThrottle: boolean;

        return (...args: Parameters<T>) => {
            if (!inThrottle) {
                func.apply(null, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Safely parses JSON with error handling
     */
    public static safeJsonParse<T>(jsonString: string, fallback: T): T {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('[WebviewHelpers] Failed to parse JSON:', error);
            return fallback;
        }
    }

    /**
     * Safely stringifies an object with error handling
     */
    public static safeJsonStringify(obj: any, fallback: string = '{}'): string {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (error) {
            console.warn('[WebviewHelpers] Failed to stringify object:', error);
            return fallback;
        }
    }

    /**
     * Checks if a string is empty or only whitespace
     */
    public static isEmptyOrWhitespace(str: string): boolean {
        return !str || str.trim().length === 0;
    }

    /**
     * Capitalizes the first letter of a string
     */
    public static capitalizeFirst(str: string): string {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Converts camelCase to human readable format
     */
    public static camelCaseToHuman(str: string): string {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}