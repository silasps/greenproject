import Link from "next/link";

export default function AcessoNegadoPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">Acesso negado</h1>
      <p className="mt-2 text-neutral-600">
        Seu usuário não tem permissão para acessar esta página.
      </p>
      <Link href="/painel" className="mt-6 text-brand underline">
        Voltar ao painel
      </Link>
    </div>
  );
}
