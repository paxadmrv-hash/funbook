/**
 * Proxy (antigo "middleware") — Next.js 16
 *
 * Protege rotas sensíveis: se não houver sessão válida do NextAuth,
 * redireciona para /login preservando a URL de destino em callbackUrl.
 *
 * Usa getToken (JWT) — leve, sem consulta a banco, ideal para proxy.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Sem sessão → redireciona para login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/upload",
    "/dashboard",
    "/api/uploads",
    "/api/dashboard",
    "/api/reenviar/:path*",
  ],
};
