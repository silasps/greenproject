"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}: {
  id: string;
  name: string;
  accept?: string;
  required?: boolean;
  capture?: boolean | "user" | "environment";
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [otimizando, setOtimizando] = useState(false);

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
    } finally {
      setOtimizando(false);
    }
  }

  function limpar() {
    mostrarArquivo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
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
        <div className="flex items-center gap-3 rounded-md border border-neutral-200 p-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-100">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={arquivo.name}
                fill
                sizes="56px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <FileText className="h-6 w-6 text-neutral-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-800">{arquivo.name}</p>
            <p className="text-xs text-neutral-500">{(arquivo.size / 1024).toFixed(0)} KB</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Trocar arquivo
            </Button>
            <Button type="button" variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={limpar}>
              Excluir
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 hover:border-brand hover:text-brand"
        >
          <Upload className="h-6 w-6" />
          {label}
        </label>
      )}
    </div>
  );
}
