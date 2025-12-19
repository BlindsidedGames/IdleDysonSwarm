export type NumberFormatting = "standard" | "engineering" | "scientific";

const PREFIX = [
  "",
  "K",
  "M",
  "B",
  "T",
  "Qa",
  "Qi",
  "Sx",
  "Sp",
  "Oc",
  "No",
  "Dc",
  "UDc",
  "DDc",
  "TDc",
  "QaDc",
  "QiDc",
  "SxDc",
  "SpDc",
  "OcDc",
  "NoDc",
] as const;

const ENERGY_PREFIX_J = ["J", "KJ", "MJ", "GJ", "TJ", "PJ", "EJ", "ZJ", "YJ"] as const;
const ENERGY_PREFIX_W = ["W", "KW", "MW", "GW", "TW", "PW", "EW", "ZW", "YW"] as const;

function truncateToDecimals(value: number, decimals: number): number {
  const scale = Math.pow(10, decimals);
  return Math.trunc(value * scale) / scale;
}

function toScientificStringTwoDecimals(x: number): string {
  if (x === 0) return "0e0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / Math.pow(10, e);
  const mTrunc = truncateToDecimals(m, 2);
  const mStr = mTrunc.toString();
  return `${mStr}e${e}`;
}

export function formatNumber(x: number, formatting: NumberFormatting = "standard"): string {
  const s = Math.sign(x);
  const e0 = Math.max(0, Math.log(s * x) / Math.log(10));
  const o = 2 - Math.floor(e0 % 3);
  const e = Math.floor(e0 / 3);

  let m = x / Math.pow(10, e * 3);
  m = truncateToDecimals(m, o);

  let ms = `${m}`;
  let d = ms.length;
  if (s === -1) d--;

  if (o === 2 && d === 1) ms = `${ms}.00`;
  if (o === 2 && d === 3) ms = `${ms}0`;
  if (o === 1 && d === 2) ms = `${ms}.0`;

  if (formatting === "scientific") return toScientificStringTwoDecimals(x);
  if (formatting === "engineering") {
    if (x > 1000) return `${ms}e${e * 3}`;
    return `${ms}${PREFIX[e] ?? ""}`;
  }

  if (e < PREFIX.length) return `${ms}${PREFIX[e]}`;
  return toScientificStringTwoDecimals(x);
}

export function formatEnergy(x: number, type: "joules" | "watts"): string {
  const s = Math.sign(x);
  const e0 = Math.max(0, Math.log(s * x) / Math.log(10));
  const o = 2 - Math.floor(e0 % 3);
  const e = Math.floor(e0 / 3);

  let m = x / Math.pow(10, e * 3);
  m = truncateToDecimals(m, o);

  let ms = `${m}`;
  let d = ms.length;
  if (s === -1) d--;

  if (o === 2 && d === 1) ms = `${ms}.00`;
  if (o === 2 && d === 3) ms = `${ms}0`;
  if (o === 1 && d === 2) ms = `${ms}.0`;

  const prefix = type === "joules" ? ENERGY_PREFIX_J : ENERGY_PREFIX_W;
  if (e < prefix.length) return `${ms}${prefix[e]}`;
  return `${ms}e${e * 3}`;
}

function plural(str: string, num: number): string {
  return str + (num === 1 ? "" : "s");
}

export function formatTime(
  time: number,
  options?: {
    showDecimal?: boolean;
    shortForm?: boolean;
    mspace?: boolean;
    mspaceSize?: number;
    ultraShort?: boolean;
  },
): string {
  const showDecimal = options?.showDecimal ?? false;
  const shortForm = options?.shortForm ?? false;
  const mspace = options?.mspace ?? true;
  const mspaceSize = options?.mspaceSize ?? 20;
  const ultraShort = options?.ultraShort ?? false;

  time = showDecimal ? Math.floor(time * 10) / 10 : Math.floor(time);

  const days = Math.floor(time / 86400);
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor(time / 60);

  const secondsC = showDecimal ? time % 60 : Math.trunc(time) % 60;
  const minutesC = Math.trunc(minutes) % 60;
  const hoursC = Math.trunc(hours) % 24;

  const secondsS = shortForm ? "s" : plural("Second", secondsC);
  const minutesS = shortForm ? "m" : plural("Minute", minutes);
  const minutesCS = shortForm ? "M" : plural("Minute", minutesC);
  const hoursS = shortForm ? "h" : plural("Hour", hours);
  const hoursCS = shortForm ? "H" : plural("Hour", hoursC);
  const daysS = shortForm ? "D" : plural("Day", days);

  if (ultraShort) {
    return time >= 3600 ? `${Math.trunc(hours)} Hours` : time >= 60 ? `${Math.trunc(minutes)} Minutes` : "None";
  }

  if (time > 86400)
    return `${days.toFixed(0)} ${daysS} ${hoursC.toFixed(0)} ${hoursCS} ${minutesC.toFixed(0)} ${minutesS} ${secondsC.toFixed(0)} ${secondsS}`;
  if (time > 3600)
    return `${hours.toFixed(0)} ${hoursS} ${minutesC.toFixed(0)} ${minutesCS} ${secondsC.toFixed(0)} ${secondsS}`;
  if (time > 60)
    return `${minutes.toFixed(0)} ${minutesS} ${secondsC.toFixed(0)} ${secondsS}`;

  const mspacePrefix = mspace ? `<mspace=${mspaceSize}>` : "";
  const mspaceSuffix = mspace ? "</mspace>" : "";
  const tail = shortForm ? "s" : showDecimal ? " Seconds" : plural(" Second", time);
  return `${mspacePrefix}${time.toFixed(1)}${mspaceSuffix}${tail}`;
}

