const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B";

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${BYTE_UNITS[exponent]}`;
}

export function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
}
