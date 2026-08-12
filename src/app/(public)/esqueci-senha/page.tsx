import Link from "next/link";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Esqueci minha senha | Greenproject Engenharia",
  robots: { index: false, follow: false },
};

export default function EsqueciSenhaPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-bold text-neutral-900">Esqueci minha senha</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Informe seu e-mail e enviaremos um link para você criar uma nova senha.
      </p>
      <ForgotPasswordForm />
      <Link href="/login" className="mt-4 text-sm text-brand hover:underline">
        Voltar para o login
      </Link>
    </div>
  );
}
