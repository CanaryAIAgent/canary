import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/integrations/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Skip Supabase session handling for Telegram webhook — it's called by Telegram's servers
  if (request.nextUrl.pathname.startsWith("/api/telegram/webhook")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
