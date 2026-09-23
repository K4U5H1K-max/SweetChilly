/**
 * Centralized Indian Standard Time (IST / Asia/Kolkata) Formatter
 * Formats timestamps reliably across Desktop and Mobile PWA presentation layer
 * without mutating database UTC storage or using fragile manual offsets.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format a date/timestamp to IST string according to the requested format type
 * @param {string|number|Date} date - ISO string, timestamp or Date object
 * @param {'full'|'timeOnly'|'dateOnly'|'clock'|'relative'|'short'} formatType
 * @returns {string}
 */
export function formatIST(date, formatType = 'full') {
  if (!date) return 'Unavailable';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Unavailable';

  try {
    switch (formatType) {
      case 'clock': {
        // e.g., "10:42:15 PM IST"
        const timePart = new Intl.DateTimeFormat('en-IN', {
          timeZone: IST_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(d);
        return `${timePart} IST`;
      }

      case 'timeOnly': {
        // e.g., "10:42 PM IST"
        const timePart = new Intl.DateTimeFormat('en-IN', {
          timeZone: IST_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(d);
        return `${timePart} IST`;
      }

      case 'dateOnly': {
        // e.g., "23 Sep 2026"
        return new Intl.DateTimeFormat('en-IN', {
          timeZone: IST_TIMEZONE,
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(d);
      }

      case 'short': {
        // e.g., "23 Sep, 10:42 PM IST"
        const formatted = new Intl.DateTimeFormat('en-IN', {
          timeZone: IST_TIMEZONE,
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(d);
        return `${formatted} IST`;
      }

      case 'relative': {
        const now = Date.now();
        const diffMs = now - d.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin} min ago`;
        if (diffHr < 24) return `${diffHr} hr ago`;
        return formatIST(d, 'short');
      }

      case 'full':
      default: {
        // e.g., "23 Sep 2026, 10:42 PM IST"
        const datePart = new Intl.DateTimeFormat('en-IN', {
          timeZone: IST_TIMEZONE,
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(d);

        const timePart = new Intl.DateTimeFormat('en-IN', {
          timeZone: IST_TIMEZONE,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(d);

        return `${datePart}, ${timePart} IST`;
      }
    }
  } catch (err) {
    console.warn('[timeFormat] Error formatting date to IST:', err);
    return d.toLocaleString();
  }
}

/**
 * Returns the current time formatted as IST Clock string
 * @returns {string} e.g. "10:42:15 PM IST"
 */
export function getCurrentISTClock() {
  return formatIST(new Date(), 'clock');
}

export default formatIST;
