import { requireAuth } from "@/lib/auth/session";
import {
  canGerenciarClientes,
  canGerenciarEquipamentos,
  canGerenciarResponsaveisTecnicos,
  canGerenciarUsuarios,
} from "@/lib/auth/permissions";
import { Sidebar } from "./sidebar";
import { AgendaNavProvider } from "./agenda-nav-context";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { perfil } = await requireAuth();

  const navItems = [
    { href: "/painel", label: "Dashboard", key: "dashboard" as const, show: true },
    { href: "/painel/agenda", label: "Agenda", key: "agenda" as const, show: true },
    { href: "/painel/clientes", label: "Clientes", key: "clientes" as const, show: canGerenciarClientes(perfil.role) },
    {
      href: "/painel/equipamentos",
      label: "Equipamentos",
      key: "equipamentos" as const,
      show: canGerenciarEquipamentos(perfil.role),
    },
    {
      href: "/painel/responsaveis-tecnicos",
      label: "Responsáveis Técnicos",
      key: "responsaveis-tecnicos" as const,
      show: canGerenciarResponsaveisTecnicos(perfil.role),
    },
    {
      href: "/painel/dp",
      label: "DP",
      key: "dp" as const,
      show: canGerenciarUsuarios(perfil.role),
    },
    {
      href: "/painel/configuracoes",
      label: "Configurações",
      key: "configuracoes" as const,
      show: perfil.role === "gerencia",
    },
  ].filter((item) => item.show);

  return (
    <AgendaNavProvider>
      <div className="min-h-screen bg-neutral-50 md:flex">
        <Sidebar navItems={navItems} perfil={perfil} />
        <main className="flex-1 px-4 py-8 sm:px-6 md:ml-60 md:px-8 print:ml-0 print:p-0">{children}</main>
      </div>
    </AgendaNavProvider>
  );
}
