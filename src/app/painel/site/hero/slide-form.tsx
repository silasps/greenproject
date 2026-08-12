"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { FileDropInput } from "@/components/file-drop-input";
import { HERO_SERVICO_MAX, HERO_DESCRICAO_MAX } from "@/lib/content/hero-slides";
import { salvarSlide } from "./actions";

export type SlideParaEditar = {
  id: string;
  servico: string;
  descricao: string;
  linkHref: string;
  imagemUrl: string;
  imagemAlt: string;
};

export function SlideForm({
  slide,
  servicosDisponiveis,
  cancelHref,
}: {
  slide?: SlideParaEditar;
  servicosDisponiveis: { slug: string; titulo: string }[];
  cancelHref: string;
}) {
  const [servico, setServico] = useState(slide?.servico ?? "");
  const [descricao, setDescricao] = useState(slide?.descricao ?? "");
  const [linkHref, setLinkHref] = useState(slide?.linkHref ?? "");
  const [imagemAlt, setImagemAlt] = useState(slide?.imagemAlt ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (!servico.trim() || !descricao.trim() || !linkHref || !imagemAlt.trim()) {
      setError("Preencha serviço, descrição, botão \"Saiba mais\" e a descrição da foto antes de salvar.");
      return;
    }
    setError(null);
    startTransition(() => salvarSlide(formData));
  }

  return (
    <form action={handleSubmit} className="mt-6 max-w-2xl space-y-6">
      {slide && <input type="hidden" name="id" value={slide.id} />}

      <div className="space-y-2">
        <Label htmlFor="servico">Nome do serviço (aparece sobre a foto)</Label>
        <Input
          id="servico"
          name="servico"
          required
          maxLength={HERO_SERVICO_MAX}
          value={servico}
          onChange={(e) => setServico(e.target.value)}
          placeholder="Ex.: Opacidade / Fumaça Preta"
        />
        <p className="text-xs text-neutral-400">
          {servico.length}/{HERO_SERVICO_MAX} caracteres
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição curta (abaixo do nome do serviço)</Label>
        <Textarea
          id="descricao"
          name="descricao"
          required
          maxLength={HERO_DESCRICAO_MAX}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Frase curta explicando o serviço."
        />
        <p className="text-xs text-neutral-400">
          {descricao.length}/{HERO_DESCRICAO_MAX} caracteres
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="link_href">Serviço do botão &ldquo;Saiba mais&rdquo;</Label>
        <Select
          name="link_href"
          required
          value={linkHref}
          onValueChange={(value) => setLinkHref(value ?? "")}
          items={Object.fromEntries(servicosDisponiveis.map((s) => [`/servicos/${s.slug}`, s.titulo]))}
        >
          <SelectTrigger id="link_href" className="w-full">
            <SelectValue placeholder="Selecione o serviço" />
          </SelectTrigger>
          <SelectContent>
            {servicosDisponiveis.map((s) => (
              <SelectItem key={s.slug} value={`/servicos/${s.slug}`}>
                {s.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-neutral-400">
          O botão &ldquo;Saiba mais&rdquo; leva para a página desse serviço.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Foto do slide</Label>
        <FileDropInput
          id="imagem"
          name="imagem_arquivo"
          accept="image/*"
          required={!slide?.imagemUrl}
          previaAtualUrl={slide?.imagemUrl}
        />
        <input type="hidden" name="imagem_url_atual" value={slide?.imagemUrl ?? ""} />
        <Input
          name="imagem_alt"
          required
          value={imagemAlt}
          onChange={(e) => setImagemAlt(e.target.value)}
          placeholder="Descrição da foto (texto alternativo)"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar slide"}
        </Button>
        <ConfirmLeaveButton to={cancelHref} label="Cancelar" variant="outline" />
      </div>
    </form>
  );
}
