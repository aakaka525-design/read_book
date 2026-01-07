/**
 * Date Formatting Utilities
 * Using Intl.DateTimeFormat for proper i18n support
 * Tech Debt #46: Replace hardcoded date formats
 */

const DEFAULT_LOCALE = 'zh-CN';

/**
 * Format a date to YYYY-MM-DD string (for storage keys)
 * This format is used internally for data storage and should NOT be localized
 */
export function toDateKey(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
}

/**
 * Format a date for display (localized)
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 */
export function formatDate(
    date: Date,
    options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, options).format(date);
}

/**
 * Format a date relative to now (e.g., "2 days ago")
 */
export function formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
    return `${Math.floor(diffDays / 365)}年前`;
}

/**
 * Format duration in minutes to human readable string
 */
export function formatReadingTime(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)}分钟`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}
