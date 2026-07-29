import { formatInTimeZone } from "date-fns-tz";
import { IRAN_TIME_ZONE } from "@/lib/constants";

const persianNumber = new Intl.NumberFormat("fa-IR");
const persianDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: IRAN_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const persianDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: IRAN_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatNumber(value: number | bigint) {
  return persianNumber.format(value);
}

export function formatToman(value: number) {
  return `${persianNumber.format(value)} تومان`;
}

export function formatPersianDate(value: Date) {
  return persianDate.format(value);
}

export function formatTehranDateTime(value: Date) {
  return persianDateTime.format(value);
}

export function formatTehranDateTimeInput(value: Date) {
  return formatInTimeZone(value, IRAN_TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
}

export function formatTehranClock(value: Date) {
  return formatInTimeZone(value, IRAN_TIME_ZONE, "HH:mm");
}

export function groupCardNumber(value: string) {
  return value.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}

export function groupIban(value: string) {
  const normalized = value.replace(/\s/g, "").toUpperCase();
  return normalized.replace(/(.{4})/g, "$1 ").trim();
}
