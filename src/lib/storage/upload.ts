import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadArquivo(
  bucket: "laudos" | "propostas" | "arquivos-internos" | "servicos",
  path: string,
  file: File
) {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(`Falha no upload (${path}): ${error.message}`);
  return path;
}

export function publicUrl(bucket: "laudos" | "propostas" | "servicos", path: string) {
  const admin = createAdminClient();
  return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function signedUrl(path: string, expiresInSeconds = 3600) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("arquivos-internos")
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Falha ao gerar link (${path}): ${error.message}`);
  return data.signedUrl;
}

/**
 * Mesma ideia do `baixarArquivoInterno` abaixo: um path salvo no banco mas
 * ausente/corrompido no Storage (upload que falhou na metade, arquivo
 * apagado manualmente) não pode derrubar a página inteira num Server
 * Component só porque um link assinado não pôde ser gerado — engole o erro
 * e deixa quem chamou decidir o que mostrar no lugar (ex.: não renderizar
 * aquela foto/certificado).
 */
export async function signedUrlSeguro(path: string | null | undefined, expiresInSeconds = 3600): Promise<string | null> {
  if (!path) return null;
  try {
    return await signedUrl(path, expiresInSeconds);
  } catch {
    return null;
  }
}

export async function baixarArquivoInterno(pathNoBucket: string | null | undefined): Promise<Buffer | null> {
  if (!pathNoBucket) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("arquivos-internos").download(pathNoBucket);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export type TipoArquivo = "pdf" | "jpeg" | "png" | "webp" | "desconhecido";

// Alguns campos aceitam "PDF ou foto" (ex.: certificado de calibração do
// equipamento) — precisa saber qual é de verdade pelos bytes, não só
// confiar no nome/extensão salva (já existiu um caso real de imagem WebP
// salva com o path terminando em .pdf).
export function detectarTipoArquivo(buf: Buffer): TipoArquivo {
  if (buf.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";
  if (buf.subarray(0, 3).toString("hex") === "ffd8ff") return "jpeg";
  if (buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") {
    return "webp";
  }
  return "desconhecido";
}
