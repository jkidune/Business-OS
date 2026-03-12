import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTZS(cents: number | undefined | null): string {
  if (cents == null) return "TZS 0";
  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatNumber(num: number | undefined | null): string {
  if (num == null) return "0";
  return new Intl.NumberFormat("en-US").format(num);
}
