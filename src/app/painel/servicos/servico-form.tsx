"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { FileDropInput } from "@/components/file-drop-input";
import { ListaTextoInput } from "./lista-texto-input";
import { GaleriaInput, type GaleriaSlot } from "./galeria-input";
import { MetodologiaInput, type MetodologiaSlot } from "./metodologia-input";
import { salvarServico } from "./actions";

export type ServicoParaEditar = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  headline: string;
  subheadline: string;
  normas: string[];
  beneficios: string[];
  entregaveis: string[];
  cover_image_url: string;
  cover_image_alt: string;
  cover_destaque_mosaico: boolean;
  galeria: { url: string; alt: string; destaque_mosaico?: boolean }[];
  metodologia: { titulo: string; descricao: string; imagem_url?: string | null; imagem_alt?: string | null }[];
  publicado: boolean;
};

function slugify(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ServicoForm({
  servico,
  cancelHref,
}: {
  servico?: ServicoParaEditar;
  cancelHref: string;
}) {
  const [titulo, setTitulo] = useState(servico?.titulo ?? "");
  const [slug, setSlug] = useState(servico?.slug ?? "");
  const [resumo, setResumo] = useState(servico?.resumo ?? "");
  const [headline, setHeadline] = useState(servico?.headline ?? "");
  const [subheadline, setSubheadline] = useState(servico?.subheadline ?? "");
  const [normas, setNormas] = useState<string[]>(servico?.normas ?? []);
  const [beneficios, setBeneficios] = useState<string[]>(servico?.beneficios ?? []);
  const [entregaveis, setEntregaveis] = useState<string[]>(servico?.entregaveis ?? []);
  const [coverDestaqueMosaico, setCoverDestaqueMosaico] = useState(
    servico?.cover_destaque_mosaico ?? false
  );
  const [galeria, setGaleria] = useState<GaleriaSlot[]>(
    () =>
      servico?.galeria.map((img) => ({
        key: crypto.randomUUID(),
        url: img.url,
        alt: img.alt,
        destaqueMosaico: img.destaque_mosaico ?? false,
        temNovoArquivo: false,
      })) ?? []
  );
  const [metodologia, setMetodologia] = useState<MetodologiaSlot[]>(
    () =>
      servico?.metodologia.map((etapa) => ({
        key: crypto.randomUUID(),
        titulo: etapa.titulo,
        descricao: etapa.descricao,
        imagemUrl: etapa.imagem_url ?? null,
        imagemAlt: etapa.imagem_alt ?? "",
        temNovoArquivo: false,
      })) ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleTituloChange(value: string) {
    setTitulo(value);
    if (!servico) setSlug(slugify(value));
  }

  function handleSubmit(formData: FormData) {
    if (!titulo.trim() || !slug.trim() || !resumo.trim() || !headline.trim() || !subheadline.trim()) {
      setError("Preencha título, slug, resumo, headline e subheadline antes de salvar.");
      return;
    }
    setError(null);
    startTransition(() => salvarServico(formData));
  }

  return (
    <form action={handleSubmit} className="mt-6 max-w-2xl space-y-6">
      {servico && <input type="hidden" name="id" value={servico.id} />}
      <input type="hidden" name="slug" value={slug} />

      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input
          id="titulo"
          required
          value={titulo}
          onChange={(e) => handleTituloChange(e.target.value)}
          placeholder="Ex.: Laudo de Opacidade / Fumaça Preta"
        />
      </div>

      <div className="space-y-2">
        <Label>Endereço no site (slug)</Label>
        {servico ? (
          <>
            <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
              /servicos/{slug}
            </p>
            <p className="text-xs text-neutral-400">
              Não pode ser alterado depois de criado — evita quebrar o link já publicado.
            </p>
          </>
        ) : (
          <>
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="laudo-de-opacidade"
            />
            <p className="text-xs text-neutral-400">
              Gerado a partir do título — pode ajustar antes de salvar, mas não depois.
            </p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="resumo">Resumo (aparece no card e nas buscas)</Label>
        <Textarea
          id="resumo"
          required
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
          placeholder="Frase curta explicando o serviço."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="headline">Headline (título grande na página do serviço)</Label>
        <Input
          id="headline"
          required
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subheadline">Subheadline</Label>
        <Textarea
          id="subheadline"
          required
          value={subheadline}
          onChange={(e) => setSubheadline(e.target.value)}
        />
      </div>

      <ListaTextoInput
        label="Normas / certificações (ex.: CONAMA, IBAMA)"
        name="normas"
        itens={normas}
        onChange={setNormas}
        placeholder="Ex.: CONAMA"
      />

      <ListaTextoInput
        label="Benefícios"
        name="beneficios"
        itens={beneficios}
        onChange={setBeneficios}
        placeholder="Ex.: Reduzir risco de autuações ambientais."
      />

      <ListaTextoInput
        label="O que o cliente recebe (entregáveis)"
        name="entregaveis"
        itens={entregaveis}
        onChange={setEntregaveis}
        placeholder="Ex.: Laudo técnico com parecer conclusivo."
      />

      <div className="space-y-2">
        <Label>Foto de capa</Label>
        <FileDropInput
          id="capa"
          name="capa_arquivo"
          accept="image/*"
          required={!servico?.cover_image_url}
          previaAtualUrl={servico?.cover_image_url}
        />
        <input type="hidden" name="capa_url_atual" value={servico?.cover_image_url ?? ""} />
        <Input
          name="capa_alt"
          defaultValue={servico?.cover_image_alt ?? ""}
          placeholder="Descrição da foto (texto alternativo)"
        />
        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-neutral-600">
          <Checkbox
            checked={coverDestaqueMosaico}
            onCheckedChange={(checked) => setCoverDestaqueMosaico(checked === true)}
          />
          Destacar a capa no mosaico da home
        </label>
        <input type="hidden" name="capa_destaque_mosaico" value={coverDestaqueMosaico ? "true" : "false"} />
      </div>

      <GaleriaInput itens={galeria} onChange={setGaleria} fieldPrefix="galeria_arquivo" />

      <MetodologiaInput itens={metodologia} onChange={setMetodologia} fieldPrefix="metodologia_arquivo" />

      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm">
        <Checkbox name="publicado" defaultChecked={servico?.publicado ?? true} />
        Publicado (visível no site)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar serviço"}
        </Button>
        <ConfirmLeaveButton to={cancelHref} label="Cancelar" variant="outline" />
      </div>
    </form>
  );
}
