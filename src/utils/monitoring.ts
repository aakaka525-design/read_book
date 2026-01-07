// Monitoring Utility Service
// This file centralizes Sentry or other APM initialization

export function initMonitoring() {
    // Check for Sentry DSN in environment
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (dsn) {
        console.log('Initializing Sentry...');
        // logic to import and init Sentry would go here
        // import * as Sentry from "@sentry/react";
        // Sentry.init({ dsn, ... });
    } else {
        console.log('Monitoring disabled (no DSN provided).');
    }
}

export function logError(error: Error, context?: Record<string, any>) {
    console.error('Captured Error:', error, context);
    // if (Sentry) Sentry.captureException(error, { extra: context });
}
