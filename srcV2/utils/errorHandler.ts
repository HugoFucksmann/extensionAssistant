export interface ErrorInfo {
  message: string;
  stack?: string;
  source?: string;
}

export class ErrorHandler {
  public handleError(error: any, source?: string): ErrorInfo {
    let message: string;
    let stack: string | undefined;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    } else if (typeof error === 'string') {
      message = error;
      stack = undefined;
    } else if (typeof error === 'object' && error !== null) {
      message = error.message || JSON.stringify(error);
      stack = error.stack;
    } else {
      message = String(error);
      stack = undefined;
    }

    // Log simple para debug
    console.error(`[ErrorHandler]`, message, stack);

    return {
      message,
      stack,
      source,
    };
  }
}