import Image from "next/image";
import Link from "next/link";

/**
 * Layout mínimo pra páginas públicas de documento (proposta, laudo — link
 * enviado direto pro cliente, ele não navega o site a partir daqui): só o
 * logo centralizado, sem nav/rodapé/banner de cookies. Diferente do
 * `(public)/layout.tsx` (site institucional).
 */
export default function DocumentoPublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white py-4">
        <Link href="/" className="flex items-center justify-center">
          <Image
            src="/brand/logo.png"
            alt="Greenproject Engenharia"
            width={210}
            height={50}
            className="h-9 w-auto sm:h-10"
          />
        </Link>
      </header>
      <main className="flex-1 bg-neutral-50">{children}</main>
    </div>
  );
}
