import { NextResponse } from "next/server";
import { getUser, refreshToken } from "@/lib/auth";

// Who is logged in. Also extends the session while the user is active.
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const res = NextResponse.json(user);
  if (!(await refreshToken(res, user))) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  return res;
}
