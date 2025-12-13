export function parseDuration(input: string): number {
    const trimmed = input.trim().toLowerCase();

    // Match pattern: number followed by optional unit (s/m/h/d)
    const match = trimmed.match(/^(\d+)(s|m|h|d)?$/);

    if (!match) {
        throw new Error("Invalid duration format. Use: 30s, 5m, 2h, 1d, or plain seconds");
    }

    const value = parseInt(match[1]);
    const unit = match[2] || 's'; // Default to seconds if no unit specified

    switch (unit) {
        case 's':
            return value;
        case 'm':
            return value * 60;
        case 'h':
            return value * 3600;
        case 'd':
            return value * 86400;
        default:
            return value;
    }
}

export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}
