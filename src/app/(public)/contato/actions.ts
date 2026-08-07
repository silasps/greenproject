"use server";

import { z } from "zod";
import { COMPANY } from "@/lib/legal/company-info";
import { enviarEmail } from "@/lib/email/enviar";

const contatoSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo."),
  email: z.string().trim().email("Informe um e-mail válido."),
  telefone: z.string().trim().optional(),
  mensagem: z.string().trim().min(10, "Conte um pouco mais sobre o que você precisa."),
});

export type ContatoState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Partial<Record<"nome" | "email" | "telefone" | "mensagem", string>>;
};

export async function enviarContato(
  _prevState: ContatoState,
  formData: FormData
): Promise<ContatoState> {
  const validado = contatoSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    mensagem: formData.get("mensagem"),
  });

  if (!validado.success) {
    const campos = validado.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Verifique os campos destacados.",
      errors: {
        nome: campos.nome?.[0],
        email: campos.email?.[0],
        telefone: campos.telefone?.[0],
        mensagem: campos.mensagem?.[0],
      },
    };
  }

  const { nome, email, telefone, mensagem } = validado.data;

  try {
    await enviarEmail({
      para: COMPANY.email,
      assunto: `Novo contato pelo site — ${nome}`,
      html: `
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>E-mail:</strong> ${email}</p>
        <p><strong>Telefone:</strong> ${telefone || "não informado"}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${mensagem.replace(/\n/g, "<br />")}</p>
      `,
    });

    return {
      status: "success",
      message: "Mensagem enviada! Retornaremos em breve pelo e-mail informado.",
    };
  } catch {
    return {
      status: "error",
      message:
        "Não foi possível enviar sua mensagem agora. Tente novamente em instantes ou fale pelo WhatsApp.",
    };
  }
}
