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
  // Em produção (HTTPS) o NextAuth usa cookie com prefixo __Secure-.
  // Precisamos informar isso ao getToken, senão ele não encontra a sessão
  // e cria um loop de redirecionamento para /login.
  const isSecure = request.nextUrl.protocol === "https:";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isSecure,
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
    "/api/uploads/:path*",
    "/api/dashboard/:path*",
    "/api/reenviar/:path*",
  ],
};
