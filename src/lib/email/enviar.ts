import nodemailer from "nodemailer";

let transportador: ReturnType<typeof nodemailer.createTransport> | null = null;

function obterTransportador() {
  if (transportador) return transportador;
  transportador = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: Number(process.env.BREVO_SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASSWORD },
  });
  return transportador;
}

/** Envia um e-mail transacional via Brevo (SMTP). Lança erro se as credenciais não estiverem configuradas. */
export async function enviarEmail({ para, assunto, html }: { para: string; assunto: string; html: string }) {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD) {
    throw new Error("E-mail não configurado — defina BREVO_SMTP_USER e BREVO_SMTP_PASSWORD.");
  }
  await obterTransportador().sendMail({
    from: process.env.EMAIL_FROM,
    to: para,
    subject: assunto,
    html,
  });
}
