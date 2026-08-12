"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Upload, ArrowLeftRight, Trash2, Maximize2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { comprimirParaWebp } from "@/lib/utils/image-to-webp";

// Só guarda o arquivo localmente (File no input) e mostra uma prévia via
// URL.createObjectURL — nada é enviado para o servidor aqui. Imagens são
// comprimidas para WebP no navegador antes de ficarem disponíveis para o
// envio; o upload de verdade só acontece quando o formulário é enviado
// (no server action), ao clicar em "Salvar".
export function FileDropInput({
  id,
  name,
  accept,
  required,
  capture,
  label = "Clique para enviar o arquivo",
  previaAtualUrl,
  previaAtualEhImagem = true,
  onArquivoChange,
}: {
  id: string;
  name: string;
  accept?: string;
  /** Esse campo nunca pode terminar vazio — se não tiver foto atual nem uma nova escolhida, o input fica `required` de verdade (bloqueia o submit). */
  required?: boolean;
  capture?: boolean | "user" | "environment";
  label?: string;
  /** URL (assinada) da foto já salva — mostra como miniatura com Trocar/Excluir, em vez da área de upload vazia, até o usuário mexer nela. */
  previaAtualUrl?: string | null;
  /** Campos que aceitam "PDF ou foto" (ex.: certificado de calibração) podem ter um PDF salvo — nesse caso não dá pra usar `<Image>`, mostra um cartão genérico com link "Abrir" em vez de miniatura. */
  previaAtualEhImagem?: boolean;
  /** Avisa o componente pai qual arquivo está selecionado agora (ou null) — usado por fluxos tipo wizard que precisam saber se já dá pra avançar. */
  onArquivoChange?: (arquivo: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [otimizando, setOtimizando] = useState(false);
  // Usuário clicou em "Excluir" na foto atual sem (ainda) escolher uma nova.
  const [atualRemovida, setAtualRemovida] = useState(false);
  const [ampliada, setAmpliada] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function mostrarArquivo(file: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setArquivo(file);
    onArquivoChange?.(file);

    if (file?.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      return;
    }

    setPreviewUrl(null);
  }

  async function handleChange(fileList: FileList | null) {
    const original = fileList?.[0] ?? null;
    if (!original) {
      mostrarArquivo(null);
      return;
    }

    if (!original.type.startsWith("image/") || original.type === "image/svg+xml") {
      mostrarArquivo(original);
      setAtualRemovida(false);
      return;
    }

    setOtimizando(true);
    try {
      const comprimido = await comprimirParaWebp(original);
      // Reatribui o arquivo já comprimido ao input real, para o FormData
      // do envio pegar o WebP em vez do arquivo original da câmera.
      const dt = new DataTransfer();
      dt.items.add(comprimido);
      if (inputRef.current) inputRef.current.files = dt.files;
      mostrarArquivo(comprimido);
      setAtualRemovida(false);
    } finally {
      setOtimizando(false);
    }
  }

  function limpar() {
    mostrarArquivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Ainda tem uma foto salva pra mostrar (não trocou nem excluiu ainda).
  const mostrandoAtual = !arquivo && !!previaAtualUrl && !atualRemovida;
  // Nada de válido nesse campo agora (nem atual, nem novo) — obrigatório de verdade.
  const inputRequired = required && !arquivo && (!previaAtualUrl || atualRemovida);
  const imagemGrandeUrl = previewUrl ?? (mostrandoAtual && previaAtualEhImagem ? previaAtualUrl : null);

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={inputRequired}
        capture={capture}
        className="hidden"
        onChange={(e) => handleChange(e.target.files)}
      />

      {otimizando ? (
        <div className="flex items-center gap-2 rounded-md border border-neutral-200 p-4 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Otimizando imagem...
        </div>
      ) : arquivo ? (
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
            {previewUrl ? (
              <>
                <Image src={previewUrl} alt={arquivo.name} fill sizes="64px" unoptimized className="object-cover" />
                <button
                  type="button"
                  title="Ver em tamanho real"
                  aria-label="Ver em tamanho real"
                  onClick={() => setAmpliada(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/40 hover:opacity-100"
                >
                  <Maximize2 className="size-4" />
                </button>
              </>
            ) : (
              <FileText className="h-6 w-6 text-neutral-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-800">{arquivo.name}</p>
            <p className="text-xs text-neutral-500">{(arquivo.size / 1024).toFixed(0)} KB</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title="Trocar arquivo"
              aria-label="Trocar arquivo"
              className="border-brand/40 text-brand-dark hover:border-brand hover:bg-brand/5"
              onClick={() => inputRef.current?.click()}
            >
              <ArrowLeftRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title="Excluir"
              aria-label="Excluir"
              className="text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={limpar}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ) : mostrandoAtual ? (
        <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-white p-3 shadow-sm">
          {previaAtualEhImagem ? (
            <button
              type="button"
              title="Ver em tamanho real"
              aria-label="Ver em tamanho real"
              onClick={() => setAmpliada(true)}
              className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
            >
              <Image src={previaAtualUrl!} alt="Foto atual" fill sizes="64px" unoptimized className="object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                <Maximize2 className="size-4" />
              </span>
            </button>
          ) : (
            <a
              href={previaAtualUrl!}
              target="_blank"
              rel="noreferrer"
              title="Abrir arquivo atual"
              aria-label="Abrir arquivo atual"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-400 transition hover:text-brand"
            >
              <FileText className="h-6 w-6" />
            </a>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-800">
              <Check className="size-3.5 shrink-0 text-brand" strokeWidth={3} />
              {previaAtualEhImagem ? "Foto atual" : "Arquivo atual"}
            </p>
            {!previaAtualEhImagem && (
              <a href={previaAtualUrl!} target="_blank" rel="noreferrer" className="text-xs text-brand underline">
                Abrir
              </a>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title="Trocar"
              aria-label="Trocar"
              className="border-brand/40 text-brand-dark hover:border-brand hover:bg-brand/5"
              onClick={() => inputRef.current?.click()}
            >
              <ArrowLeftRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title="Excluir"
              aria-label="Excluir"
              className="text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setAtualRemovida(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="group flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/60 p-6 text-center transition-colors hover:border-brand hover:bg-brand/5"
        >
          <span className="flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 transition-colors group-hover:border-brand/30 group-hover:text-brand">
            <Upload className="h-5 w-5" />
          </span>
          <span className="text-sm text-neutral-600 group-hover:text-brand-dark">{label}</span>
          {required && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">Obrigatória</span>}
          {atualRemovida && <span className="text-xs text-amber-600">Foto removida — envie uma nova</span>}
        </label>
      )}

      {imagemGrandeUrl && (
        <Dialog open={ampliada} onOpenChange={setAmpliada}>
          <DialogContent className="max-w-[calc(100%-2rem)] p-2 sm:max-w-4xl">
            <DialogTitle className="sr-only">Foto ampliada</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagemGrandeUrl}
              alt="Foto ampliada"
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
