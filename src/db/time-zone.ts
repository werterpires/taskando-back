export const defaultTimeZone = "America/Sao_Paulo";

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function dateKeyInTimeZone(value: Date | string, timeZone = defaultTimeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) || !isValidTimeZone(timeZone)) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function timeInTimeZone(value: Date | string, timeZone = defaultTimeZone) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) || !isValidTimeZone(timeZone)) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}
