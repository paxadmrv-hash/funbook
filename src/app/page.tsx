import { redirect } from "next/navigation";

/**
 * A raiz redireciona para o dashboard.
 * Adicione uma landing page aqui se necessário no futuro.
 */
export default function Home() {
  redirect("/dashboard");
}
