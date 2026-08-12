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
