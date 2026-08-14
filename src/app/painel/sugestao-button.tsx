"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Lightbulb, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { enviarSugestao } from "./sugestoes/actions";

// Botão flutuante em todo /painel — qualquer pessoa logada pode mandar uma
// sugestão/relato de bug pro desenvolvedor, com a página atual (pathname)
// e o user agent anexados automaticamente. Some sozinho atrás de qualquer
// overlay de tela cheia (ex.: campo-wizard.tsx, z-50) por ter um z-index
// mais baixo — não é feedback pra atrapalhar um fluxo em andamento.
export function SugestaoButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviada, setEnviada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Atraso pra não "piscar" o formulário limpo durante a animação de saída do dialog.
      setTimeout(() => {
        setMensagem("");
        setEnviada(false);
        setErro(null);
      }, 200);
    }
  }

  function handleSubmit() {
    if (!mensagem.trim()) {
      setErro("Escreva sua sugestão antes de enviar.");
      return;
    }
    setErro(null);
    const formData = new FormData();
    formData.set("mensagem", mensagem);
    formData.set("pagina", pathname);
    formData.set("user_agent", navigator.userAgent);
    startTransition(async () => {
      try {
        await enviarSugestao(formData);
        setEnviada(true);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível enviar. Tente de novo.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        title="Enviar sugestão"
        aria-label="Enviar sugestão"
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:bg-brand-dark hover:shadow-xl active:translate-y-px print:hidden"
      >
        <Lightbulb className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          {enviada ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Check className="h-6 w-6" />
              </span>
              <p className="font-medium text-neutral-800">Sugestão enviada!</p>
              <p className="text-sm text-neutral-500">Obrigado — sua ideia vai direto pro desenvolvedor.</p>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Enviar sugestão</DialogTitle>
                <DialogDescription>
                  Encontrou um problema ou tem uma ideia para melhorar o sistema? A página atual é enviada
                  junto, automaticamente.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                autoFocus
                rows={5}
                placeholder="Escreva sua sugestão..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <DialogFooter>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={handleSubmit}
                  className="bg-brand hover:bg-brand-dark"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
