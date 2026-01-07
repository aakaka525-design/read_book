export const ErrorCode = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    API_ERROR: 'API_ERROR',
    DB_ERROR: 'DB_ERROR',
    STALE_INDEX: 'STALE_INDEX',
    IMPORT_FAILED: 'IMPORT_FAILED',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    WORKER_ERROR: 'WORKER_ERROR',
    ABORT_ERROR: 'ABORT_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

export class AppError extends Error {
    public readonly code: ErrorCodeType;
    public readonly originalError?: any;
    public readonly retryable: boolean;

    constructor(
        code: ErrorCodeType,
        message: string,
        originalError?: any,
        retryable: boolean = false
    ) {
        super(message);
        this.code = code;
        this.originalError = originalError;
        this.retryable = retryable;
        this.name = 'AppError';
    }

    public static from(error: any): AppError {
        if (error instanceof AppError) return error;

        // More robust message extraction to prevent "Cannot convert object to primitive value"
        let message = 'An unknown error occurred';
        try {
            if (typeof error === 'string') {
                message = error;
            } else if (error === null || error === undefined) {
                message = String(error);
            } else if (typeof error === 'object') {
                // Safely check for message property
                if ('message' in error && typeof error.message === 'string') {
                    message = error.message;
                } else if ('reason' in error && typeof error.reason === 'string') {
                    message = error.reason;
                } else {
                    // Avoid direct String(error) which fails on null-prototype objects
                    try {
                        message = JSON.stringify(error).slice(0, 100);
                    } catch {
                        message = Object.prototype.toString.call(error);
                    }
                }
            } else {
                message = String(error);
            }
        } catch {
            message = 'Error object could not be safely stringified';
        }

        if (error?.name === 'AbortError') {
            return new AppError(ErrorCode.ABORT_ERROR, 'Operation aborted', error);
        }

        return new AppError(ErrorCode.UNKNOWN_ERROR, message, error);
    }

    public toString(): string {
        return `[${this.code}] ${this.message}`;
    }
}
