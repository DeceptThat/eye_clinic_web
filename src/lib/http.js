import mongoose from "mongoose";
import { NextResponse } from "next/server";

// A real MongoDB id: 24 hex characters (rejects "abc", numbers, objects…)
export const isId = (v) => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v) && mongoose.Types.ObjectId.isValid(v);

export const fail = (error, status = 400) => NextResponse.json({ error }, { status });

// Reads a JSON object body; returns null for broken JSON, arrays, strings, etc.
export async function readBody(req) {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export const BAD_BODY = "The request body must be a JSON object";

// "2026-10-05" -> that whole day in Thailand time, or null if the date is not valid
export function bangkokDay(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const start = new Date(`${date}T00:00:00+07:00`);
  if (isNaN(start.getTime())) return null;
  // reject dates that roll over, e.g. 2026-02-30
  if (new Date(start.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) !== date) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

// Copy of obj without the given keys (used to stop clients changing record numbers etc.)
export function omit(obj, keys) {
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

// Copy of obj with only the given keys
export function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

// Fields no client may set directly
export const SYSTEM_FIELDS = ["_id", "__v", "createdAt", "updatedAt"];
