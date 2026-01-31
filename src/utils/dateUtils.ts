import { formatDistanceToNow, format, isToday, isYesterday, differenceInDays } from 'date-fns';

/**
 * Format date for display (today, yesterday, 3 days ago, month ago, etc.)
 */
export const formatWorksheetDate = (date: Date | any): string => {
  if (!date) return 'Never';

  const dateObj = date.toDate ? date.toDate() : new Date(date);

  if (isToday(dateObj)) {
    return 'today';
  }

  if (isYesterday(dateObj)) {
    return 'yesterday';
  }

  const daysDiff = differenceInDays(new Date(), dateObj);

  if (daysDiff < 7) {
    return `${daysDiff} days ago`;
  }

  if (daysDiff < 30) {
    const weeks = Math.floor(daysDiff / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  if (daysDiff < 365) {
    const months = Math.floor(daysDiff / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.floor(daysDiff / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
};

/**
 * Check if date is within last N days
 */
export const isWithinLastDays = (date: Date | any, days: number): boolean => {
  if (!date) return false;
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  const daysDiff = differenceInDays(new Date(), dateObj);
  return daysDiff <= days;
};
