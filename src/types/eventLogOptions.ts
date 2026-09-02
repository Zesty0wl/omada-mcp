/**
 * Filters for the Open API site event log (GET /sites/{siteId}/logs/events).
 */
export interface EventLogOptions {
    /** Window start, epoch milliseconds. Defaults to seven days before `timeEnd`. */
    timeStart?: number;
    /** Window end, epoch milliseconds. Defaults to now. */
    timeEnd?: number;
    /** Restrict to one log module. */
    module?: 'System' | 'Device' | 'Client';
}
