import { requireAuth } from "@/lib/auth/session";
import { canGerenciarUsuarios } from "@/lib/auth/permissions";
import { estaImpersonando, listarUsuariosParaImpersonar } from "@/lib/auth/impersonation";
import { createClient } from "@/lib/supabase/server";
import { getSecoesVisiveis } from "@/lib/kpis/visibilidade";
import { Sidebar } from "./sidebar";
import { AgendaNavProvider } from "./agenda-nav-context";
import { TestesFiltroProvider } from "./testes-filtro-context";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { perfil } = await requireAuth();
  const supabase = await createClient();
  // Mesma resolução de acesso usada nos gates de /painel/site e
  // /painel/servicos (requireArea, em src/lib/auth/session.ts) — o item da
  // sidebar só aparece se a pessoa realmente consegue abrir a área.
  const secoesVisiveis = await getSecoesVisiveis(supabase, perfil);
  const impersonando = await estaImpersonando();
  const podeTrocarIdentidade = perfil.is_superadmin || impersonando;
  const usuariosImpersonaveis = podeTrocarIdentidade ? await listarUsuariosParaImpersonar() : [];

  const navItems = [
    { href: "/painel", label: "Dashboard", key: "dashboard" as const, show: true },
    { href: "/painel/agenda", label: "Agenda", key: "agenda" as const, show: true },
    { href: "/painel/testes", label: "Testes", key: "testes" as const, show: secoesVisiveis.has("testes") },
    { href: "/painel/clientes", label: "Clientes", key: "clientes" as const, show: secoesVisiveis.has("clientes") },
    {
      href: "/painel/equipamentos",
      label: "Equipamentos",
      key: "equipamentos" as const,
      show: secoesVisiveis.has("equipamentos"),
    },
    {
      href: "/painel/responsaveis-tecnicos",
      label: "Responsáveis Técnicos",
      key: "responsaveis-tecnicos" as const,
      show: secoesVisiveis.has("responsaveis_tecnicos"),
    },
    {
      href: "/painel/dp",
      label: "DP",
      key: "dp" as const,
      show: canGerenciarUsuarios(perfil.role),
    },
    {
      href: "/painel/site",
      label: "Site",
      key: "site" as const,
      show: secoesVisiveis.has("site"),
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
      <TestesFiltroProvider>
        <div className="min-h-screen bg-neutral-50 md:flex">
          <Sidebar
            navItems={navItems}
            perfil={perfil}
            identitySwitcher={
              podeTrocarIdentidade ? { usuarios: usuariosImpersonaveis, impersonando } : undefined
            }
          />
          <main className="flex-1 px-4 py-8 sm:px-6 md:ml-60 md:px-8 print:ml-0 print:p-0">{children}</main>
        </div>
      </TestesFiltroProvider>
    </AgendaNavProvider>
  );
}
