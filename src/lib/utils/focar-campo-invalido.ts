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
