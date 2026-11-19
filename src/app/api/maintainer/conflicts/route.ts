import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  countRegistrationConflicts,
  isMaintainer,
  listRegistrationConflicts,
} from "@/lib/maintainers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** Positive integers only; anything else falls back to the documented default. */
function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request?: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await isMaintainer(session.user);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params =
    request?.nextUrl?.searchParams ??
    (request?.url ? new URL(request.url).searchParams : undefined);
  const page = parsePositiveInt(params?.get("page") ?? null, DEFAULT_PAGE);
  // Clamp rather than reject an oversized request so clients always get a page.
  const pageSize = Math.min(
    parsePositiveInt(params?.get("pageSize") ?? null, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );

  const maintainerOrgId = session.user.maintainerOrgId;
  const [total, conflicts] = await Promise.all([
    countRegistrationConflicts({ maintainerOrgId }),
    listRegistrationConflicts({
      maintainerOrgId,
      limit: pageSize,
      skip: (page - 1) * pageSize,
    }),
  ]);

  return NextResponse.json({
    conflicts,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
