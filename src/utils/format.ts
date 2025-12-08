
export const fmtCurrency = (amount: number, emoji: string = "🪙") => {
  return `${emoji} ${amount.toLocaleString()}`;
};

export const fmtAmount = (amount: number) => {
  return amount.toLocaleString();
};

export const formatDuration = (ms: number): string => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.join(" ") || "0s";
};

/**
 * Parses a duration string (e.g. "1d 2h 30m") into seconds.
 * Supported units: d (days), h (hours), m (minutes), s (seconds).
 * Returns null if invalid or 0.
 */
export const parseDuration = (input: string): number | null => {
  if (!input) return null;

  // If it's just a number, assume seconds for backward compatibility
  if (/^\d+$/.test(input)) {
    return parseInt(input);
  }

  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let totalSeconds = 0;
  let match;
  let found = false;

  while ((match = regex.exec(input)) !== null) {
    found = true;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'd': totalSeconds += value * 86400; break;
      case 'h': totalSeconds += value * 3600; break;
      case 'm': totalSeconds += value * 60; break;
      case 's': totalSeconds += value; break;
    }
  }

  return found ? totalSeconds : null;
};

/**
 * Parses duration string to Days (float).
 * 1d 12h -> 1.5
 */
export const parseDurationToDays = (input: string): number | null => {
  const seconds = parseDuration(input);
  if (seconds === null) return null;
  return seconds / 86400;
};