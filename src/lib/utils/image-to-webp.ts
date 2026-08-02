// Comprime uma imagem para WebP direto no navegador, antes do upload.
// Perda de qualidade: WebP com quality ~0.82 é compressão "lossy" (com
// perda), igual o JPEG — mas nessa faixa a perda é imperceptível a olho
// nu, mesmo se a foto precisar ser recuperada depois para conferência ou
// impressa dentro do laudo. Não é um formato de arquivamento sem perdas;
// se um dia for preciso guardar a foto original bit-a-bit (ex.: perícia),
// esse não é o caminho — mas para evidência fotográfica de um laudo, é o
// equilíbrio padrão de mercado entre qualidade e tamanho de arquivo.
export async function comprimirParaWebp(
  file: File,
  { quality = 0.82, maxDimension = 1600 } = {},
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
