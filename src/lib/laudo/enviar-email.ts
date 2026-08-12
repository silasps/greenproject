import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email/enviar";
import { COMPANY } from "@/lib/legal/company-info";

/**
 * Busca os dados do laudo já emitido e dispara o e-mail pro cliente —
 * compartilhado entre o botão manual "Enviar por e-mail" (já emitido) e o
 * envio automático opcional no momento de validar o teste, pra não duplicar
 * o template. Lança erro se o cliente não tiver e-mail cadastrado — quem
 * chama decide se isso deve travar o fluxo (botão manual) ou só ser
 * ignorado silenciosamente (validação automática, ver `actions.ts`).
 */
export async function enviarLaudoPorEmail(testeId: string) {
  const admin = createAdminClient();
  const { data: laudo, error } = await admin
    .from("laudos")
    .select(
      "numero, codigo_publico, teste:testes_opacidade(resultado, veiculos_maquinas(identificador, marca, modelo), agendamentos(data_hora, clientes(nome, email)))",
    )
    .eq("teste_id", testeId)
    .single();
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teste = laudo.teste as any;
  const veiculo = teste?.veiculos_maquinas;
  const agendamento = teste?.agendamentos;
  const cliente = agendamento?.clientes;
  if (!cliente?.email) throw new Error("Cliente não tem e-mail cadastrado.");

  const aprovado = teste?.resultado === "aprovado";
  const dataHoraTexto = agendamento?.data_hora
    ? format(new Date(agendamento.data_hora), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    : "-";
  const link = `${COMPANY.siteUrl}/laudo/${laudo.codigo_publico}`;

  await enviarEmail({
    para: cliente.email,
    assunto: `Laudo de opacidade nº ${laudo.numero} — ${COMPANY.razaoSocial}`,
    html: `
      <p>Olá ${cliente.nome ?? ""},</p>
      <p>Segue o laudo do teste de opacidade realizado em ${dataHoraTexto}.</p>
      <p>
        <strong>Empresa:</strong> ${COMPANY.razaoSocial}<br>
        ${veiculo ? `<strong>Veículo/equipamento:</strong> ${veiculo.identificador} ${[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")}<br>` : ""}
        <strong>Resultado:</strong> <span style="display:inline-block;padding:1px 10px;border-radius:9999px;font-weight:bold;background:${aprovado ? "#dcfce7" : "#fee2e2"};color:${aprovado ? "#166534" : "#991b1b"}">${aprovado ? "APROVADO" : "REPROVADO"}</span><br>
        <strong>Laudo nº:</strong> ${laudo.numero}
      </p>
      <p><a href="${link}">Ver e baixar o laudo</a></p>
      <p>Qualquer dúvida, estamos à disposição — ${COMPANY.razaoSocial}.</p>
    `,
  });
}
