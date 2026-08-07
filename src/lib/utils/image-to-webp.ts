// Comprime uma imagem para WebP direto no navegador, antes do upload.
// Perda de qualidade: WebP ainda é "lossy" (com perda) mesmo em quality
// alto — não existe WebP 100% sem perda vindo de canvas.toBlob. quality
// 0.95 + maxDimension 2000 é o mínimo de perda que ainda vale a pena
// comprimir (evita mandar HEIC/RAW de 10+ MB do celular), importante
// principalmente pra foto da etiqueta com o número em destaque, que
// precisa continuar legível de perto. Se um dia for preciso guardar a
// foto original bit-a-bit (ex.: perícia), esse não é o caminho.
export async function comprimirParaWebp(
  file: File,
  { quality = 0.95, maxDimension = 2000 } = {},
): Promise<File> {
  if (file.type === "image/svg+xml" || !file.type.startsWith("image/")) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (Math.max(width, height) > maxDimension) {
    const escala = maxDimension / Math.max(width, height);
    width = Math.round(width * escala);
    height = Math.round(height * escala);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) return file;

  const novoNome = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], novoNome, { type: "image/webp" });
}
