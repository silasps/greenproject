"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentoInput } from "@/components/documento-input";
import { type Role } from "@/lib/auth/permissions";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ErrorModal } from "@/components/error-modal";
import { formatTelefone } from "@/lib/utils/mascaras";
import {
  criarPessoa,
  editarPessoa,
  redefinirSenha,
  buscarEmailUsuario,
  alterarEmailUsuario,
  type Credenciais,
} from "./actions";
import { CredenciaisPanel } from "./credenciais-panel";

type Funcao = { id: string; nome: string };

type Pessoa = {
  id: string;
  nome: string;
  role: Role;
  funcao_id: string | null;
  cpf: string | null;
  telefone: string | null;
  data_admissao: string | null;
  acesso_sistema: boolean;
};

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export function PessoaForm({
  pessoa,
  funcoes,
  onSucesso,
  onCancelar,
}: {
  pessoa?: Pessoa;
  funcoes: Funcao[];
  onSucesso?: () => void;
  onCancelar?: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [cpf, setCpf] = useState(pessoa?.cpf ?? "");
  const [cpfValido, setCpfValido] = useState(true);
  const [whatsapp, setWhatsapp] = useState(formatTelefone(pessoa?.telefone ?? ""));
  const [credenciais, setCredenciais] = useState<Credenciais | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const action = pessoa ? editarPessoa : criarPessoa;

  const [email, setEmail] = useState<string | null>(null);
  const [carregandoEmail, setCarregandoEmail] = useState(!!pessoa);
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [salvandoEmail, setSalvandoEmail] = useState(false);

  useEffect(() => {
    if (!pessoa) return;
    let ativo = true;
    setCarregandoEmail(true);
    buscarEmailUsuario(pessoa.id).then((resultado) => {
      if (ativo) {
        setEmail(resultado);
        setCarregandoEmail(false);
      }
    });
    return () => {
      ativo = false;
    };
  }, [pessoa]);

  function iniciarAlteracaoEmail() {
    setNovoEmail(email ?? "");
    setEditandoEmail(true);
  }

  async function confirmarAlteracaoEmail() {
    setErro(null);
    setSalvandoEmail(true);
    try {
      const resultado = await alterarEmailUsuario(pessoa!.id, novoEmail);
      setEmail(resultado.email);
      setEditandoEmail(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível alterar o e-mail.");
    } finally {
      setSalvandoEmail(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setErro(null);
    try {
      const resultado = await action(formData);
      if ("credenciais" in resultado) {
        setCredenciais(resultado.credenciais);
      } else if (onSucesso) {
        onSucesso();
      } else {
        router.push("/painel/dp");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a pessoa.");
    }
  }

  function handleRedefinirSenha() {
    if (!pessoa) return;
    setErro(null);
    startTransition(async () => {
      try {
        setCredenciais(await redefinirSenha(pessoa.id));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível redefinir a senha.");
      }
    });
  }

  if (credenciais) {
    return <CredenciaisPanel credenciais={credenciais} onConcluir={onSucesso} />;
  }

  return (
    <form
      ref={formRef}
      action={(formData) => startTransition(() => handleSubmit(formData))}
      className={onCancelar ? "space-y-4" : "mt-6 mx-auto max-w-lg space-y-4"}
    >
      {pessoa && <input type="hidden" name="id" value={pessoa.id} />}

      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" required defaultValue={pessoa?.nome} />
      </div>

      {!pessoa && (
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <DocumentoInput id="cpf" name="cpf" tipo="pf" value={cpf} onChange={setCpf} onValidChange={setCpfValido} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">WhatsApp</Label>
          <Input
            id="telefone"
            name="telefone"
            placeholder="(31) 99999-9999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatTelefone(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Função</Label>
        <Select
          name="funcao_id"
          required
          defaultValue={pessoa?.funcao_id ?? undefined}
          items={Object.fromEntries(funcoes.map((f) => [f.id, f.nome]))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a função" />
          </SelectTrigger>
          <SelectContent>
            {funcoes.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-neutral-500">A função escolhida define o nível de acesso da pessoa no sistema.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_admissao">Data de admissão</Label>
        <Input id="data_admissao" name="data_admissao" type="date" defaultValue={pessoa?.data_admissao ?? hoje()} />
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm">
          <Checkbox name="acesso_sistema" defaultChecked={pessoa?.acesso_sistema ?? true} />
          Acesso ao sistema liberado
        </label>
        <p className="mt-1.5 text-xs text-neutral-500">
          Ao liberar o acesso, uma senha é gerada automaticamente — na próxima tela você pode enviá-la pra pessoa
          por WhatsApp ou e-mail.
        </p>
      </div>

      {pessoa && (
        <div className="space-y-2">
          <Label>E-mail de acesso</Label>
          {carregandoEmail ? (
            <p className="text-sm text-neutral-400">Carregando...</p>
          ) : editandoEmail ? (
            <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <Input
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="novo@email.com"
                autoFocus
              />
              <p className="text-xs text-amber-600">
                A pessoa vai passar a entrar no sistema com esse novo e-mail. A senha continua a mesma.
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={salvandoEmail} onClick={confirmarAlteracaoEmail}>
                  {salvandoEmail ? "Salvando..." : "Confirmar e-mail"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditandoEmail(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2">
              <span className="text-sm text-neutral-700">{email ?? "—"}</span>
              <button
                type="button"
                onClick={iniciarAlteracaoEmail}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Alterar e-mail
              </button>
            </div>
          )}
          <p className="text-xs text-neutral-500">
            Só altere se a pessoa perdeu acesso a esse e-mail ou ele foi cadastrado errado.
          </p>
        </div>
      )}

      {pessoa && pessoa.acesso_sistema && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-3">
          <p className="text-sm font-medium text-neutral-900">Pessoa esqueceu a senha?</p>
          <p className="mt-1 text-xs text-neutral-500">Gera uma senha nova pra enviar por WhatsApp ou e-mail.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleRedefinirSenha}
            className="mt-2"
          >
            {pending ? "Gerando..." : "Redefinir senha"}
          </Button>
        </div>
      )}

      <ErrorModal erro={erro} onClose={() => setErro(null)} formRef={formRef} />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !cpfValido} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {onCancelar ? (
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
        ) : (
          <ConfirmLeaveButton to="/painel/dp" label="Cancelar" variant="outline" />
        )}
      </div>
    </form>
  );
}
