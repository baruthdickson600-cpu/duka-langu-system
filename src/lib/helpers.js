// src/lib/helpers.js
// Utility functions used across the app

export function formatCurrency(amount, currency = "TZS") {
  const num = Number(amount) || 0;
  return `${currency} ${num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("sw-TZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("sw-TZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysRemaining(dateStr) {
  if (!dateStr) return 0;
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function generateReceiptNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `DL-${y}${m}${d}-${rand}`;
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function truncate(str, len = 30) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "..." : str;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Habari za asubuhi";
  if (hour < 17) return "Habari za mchana";
  return "Habari za jioni";
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
