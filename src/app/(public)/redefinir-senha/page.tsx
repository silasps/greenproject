import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Redefinir senha | Greenproject Engenharia",
  robots: { index: false, follow: false },
};

export default function RedefinirSenhaPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-bold text-neutral-900">Redefinir senha</h1>
      <p className="mt-1 text-sm text-neutral-500">Escolha uma nova senha para sua conta.</p>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
