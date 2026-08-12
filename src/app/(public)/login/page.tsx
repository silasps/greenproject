import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar | Greenproject Engenharia",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center justify-center px-4 py-20 sm:px-6">
      <Image src="/brand/icon-g.png" alt="Greenproject" width={64} height={64} className="h-16 w-16" />
      <h1 className="mt-4 text-2xl font-bold text-neutral-900">Entrar</h1>
      <p className="mt-1 text-sm text-neutral-500">Acesso restrito à equipe Greenproject.</p>
      <div className="w-full">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <Link href="/esqueci-senha" className="mt-4 text-sm text-brand hover:underline">
        Esqueci minha senha
      </Link>
    </div>
  );
}
