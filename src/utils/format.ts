/**
 * HTML Escaping and Indonesian Date / Time Formatting
 */

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTHS_ID_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Safely escape all special HTML characters to prevent XSS.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date string into Indonesian format (e.g. "16 Agustus 2026, 23:30")
 */
export function formatIndonesianDateTime(dateInput: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  const day = d.getDate().toString().padStart(2, '0');
  const month = MONTHS_ID[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Format date string into short format (e.g. "16 Agu 2026")
 */
export function formatIndonesianDateShort(dateInput: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  const day = d.getDate().toString().padStart(2, '0');
  const month = MONTHS_ID_SHORT[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Format time string (e.g. "23:30")
 */
export function formatTimeShort(dateInput: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Relative time formatting equivalent to Laravel diffForHumans()
 */
export function diffForHumans(dateInput: string | Date | null): string {
  if (!dateInput) return '';
  const target = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  const isFuture = diffMs > 0;
  const absDiffSeconds = Math.floor(Math.abs(diffMs) / 1000);

  if (absDiffSeconds < 60) {
    return isFuture ? 'dalam beberapa detik' : 'baru saja';
  }

  const minutes = Math.floor(absDiffSeconds / 60);
  if (minutes < 60) {
    return isFuture ? `dalam ${minutes} menit` : `${minutes} menit yang lalu`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return isFuture ? `dalam ${hours} jam` : `${hours} jam yang lalu`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return isFuture ? `dalam ${days} hari` : `${days} hari yang lalu`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return isFuture ? `dalam ${months} bulan` : `${months} bulan yang lalu`;
  }

  const years = Math.floor(months / 12);
  return isFuture ? `dalam ${years} tahun` : `${years} tahun yang lalu`;
}

/**
 * Check if a date string is in the past (expired)
 */
export function isDatePast(dateInput: string | null): boolean {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  return !isNaN(d.getTime()) && d.getTime() <= Date.now();
}
