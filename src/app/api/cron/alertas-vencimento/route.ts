import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email/enviar";
import { diasRestantes } from "@/lib/laudo/validade";
import { COMPANY } from "@/lib/legal/company-info";
import { gerarTokenPublico } from "@/lib/utils/token";

/**
 * Roda 1x/dia (ver vercel.json) — manda e-mail de vencimento de laudo pros
 * limiares configurados em dados_empresa.dias_alerta_vencimento (padrão
 * 60/30 dias), um por veículo+limiar, sem repetir (contatos_retestagem).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: dadosEmpresa } = await admin.from("dados_empresa").select("dias_alerta_vencimento").single();
  const limiares = dadosEmpresa?.dias_alerta_vencimento ?? [60, 30];

  const { data: validades } = await admin.from("veiculos_validade").select("veiculo_id, cliente_id, laudo_id, validade");
  const candidatos = (validades ?? [])
    .map((v) => ({ ...v, dias: diasRestantes(v.validade) }))
    .filter((v) => limiares.includes(v.dias));

  if (candidatos.length === 0) return Response.json({ enviados: 0 });

  const { data: jaEnviados } = await admin
    .from("contatos_retestagem")
    .select("laudo_id, dias_antes")
    .eq("canal", "email")
    .in("laudo_id", candidatos.map((c) => c.laudo_id));
  const enviadosSet = new Set((jaEnviados ?? []).map((e) => `${e.laudo_id}:${e.dias_antes}`));
  const pendentes = candidatos.filter((c) => !enviadosSet.has(`${c.laudo_id}:${c.dias}`));

  if (pendentes.length === 0) return Response.json({ enviados: 0 });

  const [{ data: veiculos }, { data: clientes }] = await Promise.all([
    admin
      .from("veiculos_maquinas")
      .select("id, identificador, marca, modelo")
      .in("id", pendentes.map((p) => p.veiculo_id)),
    admin
      .from("clientes")
      .select("id, nome, email")
      .in("id", Array.from(new Set(pendentes.map((p) => p.cliente_id)))),
  ]);
  const veiculoPorId = new Map((veiculos ?? []).map((v) => [v.id, v]));
  const clientePorId = new Map((clientes ?? []).map((c) => [c.id, c]));

  let enviados = 0;
  for (const candidato of pendentes) {
    const cliente = clientePorId.get(candidato.cliente_id);
    const veiculo = veiculoPorId.get(candidato.veiculo_id);
    if (!cliente?.email || !veiculo) continue;

    const token = gerarTokenPublico();
    const veiculoLabel = `${veiculo.marca ?? ""} ${veiculo.modelo ?? ""} - ${veiculo.identificador}`.trim();
    const dataValidade = new Date(candidato.validade).toLocaleDateString("pt-BR");

    try {
      await enviarEmail({
        para: cliente.email,
        assunto: `Laudo de opacidade vencendo — ${veiculoLabel}`,
        html: `
          <p>Olá ${cliente.nome},</p>
          <p>O laudo de opacidade do veículo/máquina <strong>${veiculoLabel}</strong> vence em
          ${candidato.dias} dia${candidato.dias === 1 ? "" : "s"} (${dataValidade}).</p>
          <p>Se quiser já solicitar o agendamento da retestagem, é só clicar abaixo:</p>
          <p><a href="${COMPANY.siteUrl}/retestagem/${token}">Solicitar agendamento da retestagem</a></p>
          <p>Qualquer dúvida, estamos à disposição — ${COMPANY.razaoSocial}.</p>
        `,
      });
      const { error } = await admin.from("contatos_retestagem").insert({
        veiculo_id: candidato.veiculo_id,
        laudo_id: candidato.laudo_id,
        canal: "email",
        dias_antes: candidato.dias,
        token,
      });
      if (!error) enviados++;
    } catch {
      // Credenciais de e-mail podem estar ausentes num ambiente — não derruba o cron inteiro, tenta os próximos.
    }
  }

  return Response.json({ enviados });
}
