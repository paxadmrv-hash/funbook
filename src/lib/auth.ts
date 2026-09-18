/**
 * Configuração do NextAuth v4
 *
 * Autenticação por usuário/senha (Credentials provider).
 * As credenciais ficam em variáveis de ambiente — nunca no cliente.
 *
 * Para adicionar usuários: defina APP_USERS no .env no formato:
 *   APP_USERS="email:hash_bcrypt,email2:hash_bcrypt2"
 *
 * Para gerar um hash bcrypt de uma senha:
 *   node -e "const b=require('bcryptjs');b.hash('suasenha',12).then(console.log)"
 */

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

/** Usuários válidos — lidos do .env, nunca expostos ao browser */
function getUsuarios(): Array<{ email: string; hash: string; nome: string }> {
  const raw = process.env.APP_USERS ?? "";

  // Formato: "email:hash:nome,email2:hash2:nome2"
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [email, hash, nome] = entry.split(":");
      return { email: email?.trim(), hash: hash?.trim(), nome: nome?.trim() ?? email };
    })
    .filter((u) => u.email && u.hash);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  // Logs detalhados nos logs da Vercel para diagnóstico
  debug: true,

  providers: [
    CredentialsProvider({
      name: "Pax Rio Verde",
      credentials: {
        email: { label: "E-mail",  type: "email",    placeholder: "seu@email.com" },
        senha: { label: "Senha",   type: "password",  placeholder: "••••••••" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          console.warn("[auth] Credenciais ausentes");
          return null;
        }

        const usuarios = getUsuarios();
        console.log(`[auth] Tentativa de login: ${credentials.email} | usuários cadastrados: ${usuarios.length}`);

        const usuario = usuarios.find(
          (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
        );

        if (!usuario) {
          console.warn(`[auth] Usuário não encontrado: ${credentials.email}`);
          return null;
        }

        const senhaCorreta = await bcrypt.compare(credentials.senha, usuario.hash);
        if (!senhaCorreta) {
          console.warn(`[auth] Senha incorreta para: ${credentials.email}`);
          return null;
        }

        console.log(`[auth] ✓ Login bem-sucedido: ${credentials.email}`);
        return { id: usuario.email, email: usuario.email, name: usuario.nome };
      },
    }),
  ],

  pages: {
    signIn:  "/login",
    error:   "/login",
  },

  session: {
    strategy: "jwt",
    maxAge:   8 * 60 * 60, // 8 horas
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.email = user.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.email = token.email as string;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
