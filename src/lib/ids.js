// Builds e.g. P-04102026-031105 (date month year - hour min sec, Bangkok time)
export function timestampId(prefix) {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000); // shift to UTC+7
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${prefix}-${p(d.getUTCDate())}${p(d.getUTCMonth() + 1)}${d.getUTCFullYear()}` +
    `-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  );
}