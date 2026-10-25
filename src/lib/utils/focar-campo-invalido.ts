type CampoFocavel = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Foca o primeiro campo que falta preencher: primeiro o que o navegador já
 * marca como inválido (required vazio), senão o primeiro vazio de um grupo
 * "pelo menos um dos dois" marcado com data-um-de (ex.: WhatsApp/telefone).
 */
export function focarPrimeiroCampoInvalido(form: HTMLFormElement | null) {
  if (!form) return;

  const invalido = form.querySelector<CampoFocavel>(":invalid");
  if (invalido) {
    invalido.focus();
    return;
  }

  const grupo = Array.from(form.querySelectorAll<HTMLInputElement>("[data-um-de]"));
  const nomes = new Set(grupo.map((el) => el.dataset.umDe));
  for (const nome of nomes) {
    const campos = grupo.filter((el) => el.dataset.umDe === nome);
    if (campos.every((el) => !el.value.trim())) {
      campos[0]?.focus();
      return;
    }
  }
}

/** Rótulo visível do campo, sem complementos entre parênteses (ex.: "Data de início (sex)"). */
function rotuloDoCampo(campo: CampoFocavel): string {
  const texto = campo.labels?.[0]?.textContent ?? campo.getAttribute("aria-label") ?? campo.name;
  return texto.replace(/\s*\(.*\)\s*$/, "").trim();
}

/**
 * Lista, pelo rótulo, o que falta preencher — mesmo critério de
 * `focarPrimeiroCampoInvalido`. Usado em forms com `noValidate`: o balão
 * nativo do navegador some (ou nem aparece) dentro de modal rolável no
 * celular, então o form mostra a lista no ErrorModal.
 */
export function listarCamposPendentes(form: HTMLFormElement | null): string[] {
  if (!form) return [];

  const pendentes = Array.from(form.querySelectorAll<CampoFocavel>(":invalid"))
    .filter((el) => el.type !== "hidden")
    .map(rotuloDoCampo);

  const grupo = Array.from(form.querySelectorAll<HTMLInputElement>("[data-um-de]"));
  const nomes = new Set(grupo.map((el) => el.dataset.umDe));
  for (const nome of nomes) {
    const campos = grupo.filter((el) => el.dataset.umDe === nome);
    if (campos.every((el) => !el.value.trim())) pendentes.push(campos.map(rotuloDoCampo).join(" ou "));
  }

  return Array.from(new Set(pendentes.filter(Boolean)));
}
