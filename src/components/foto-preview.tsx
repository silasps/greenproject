"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText, Loader2, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { obterUrlAssinada } from "@/lib/storage/actions";

type ItemArquivo = { label: string; url: string; path: string };

/**
 * Miniatura clicável de uma foto já salva — abre um modal grande ao clicar.
 * A miniatura usa a `url` (assinada no carregamento da página, prévia
 * suficiente pra thumbnail pequena), mas ao abrir o modal busca um link
 * novo com `path` — sem isso, se a pessoa demorar pra clicar, o link já
 * pode ter expirado e o modal mostra um erro de token em vez da imagem.
 */
export function FotoPreview({ url, path, label }: ItemArquivo) {
  const [aberta, setAberta] = useState(false);
  const [urlGrande, setUrlGrande] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function abrir() {
    setAberta(true);
    setCarregando(true);
    try {
      setUrlGrande(await obterUrlAssinada(path));
    } catch {
      setUrlGrande(url); // melhor tentar com o link antigo do que travar
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title={`Ver ${label}`}
        aria-label={`Ver ${label}`}
        className="group flex w-16 flex-col items-center gap-1"
      >
        <span className="relative block size-16 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
          <Image src={url} alt={label} fill sizes="64px" unoptimized className="object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
            <Maximize2 className="size-4" />
          </span>
        </span>
        <span className="w-full truncate text-center text-[11px] text-neutral-500">{label}</span>
      </button>

      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent className="max-w-[calc(100%-2rem)] p-2 sm:max-w-4xl">
          <DialogTitle className="sr-only">{label}</DialogTitle>
          {carregando || !urlGrande ? (
            <div className="flex h-[50vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-neutral-300" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlGrande} alt={label} className="max-h-[85vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Ícone clicável de um PDF já salvo — mesmo padrão do FotoPreview (link fresco buscado ao abrir), num modal com o leitor de PDF do navegador. */
export function PdfPreview({ url, path, label = "PDF do ensaio" }: { url: string; path: string; label?: string }) {
  const [aberto, setAberto] = useState(false);
  const [urlGrande, setUrlGrande] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function abrir() {
    setAberto(true);
    setCarregando(true);
    try {
      setUrlGrande(await obterUrlAssinada(path));
    } catch {
      setUrlGrande(url);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title={`Ver ${label}`}
        aria-label={`Ver ${label}`}
        className="group flex w-16 flex-col items-center gap-1"
      >
        <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 text-neutral-400">
          <FileText className="size-6" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
            <Maximize2 className="size-4" />
          </span>
        </span>
        <span className="w-full truncate text-center text-[11px] text-neutral-500">{label}</span>
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-[calc(100%-2rem)] p-2 sm:max-w-4xl">
          <DialogTitle className="sr-only">{label}</DialogTitle>
          {carregando || !urlGrande ? (
            <div className="flex h-[50vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-neutral-300" />
            </div>
          ) : (
            <iframe src={urlGrande} title={label} className="h-[85vh] w-full rounded-lg border border-neutral-200" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Grade de miniaturas — usa só os arquivos que existem, ignora os em branco. */
export function FotosPreviewGrid({ fotos }: { fotos: [string, string | null, string | null][] }) {
  const disponiveis = fotos.filter(
    (f): f is [string, string, string] => !!f[1] && !!f[2],
  );
  if (disponiveis.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {disponiveis.map(([label, url, path]) => (
        <FotoPreview key={label} url={url} path={path} label={label} />
      ))}
    </div>
  );
}
