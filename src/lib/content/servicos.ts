export type ServicoImage = {
  src: string;
  alt: string;
};

export type Servico = {
  slug: string;
  titulo: string;
  resumo: string;
  headline: string;
  subheadline: string;
  coverImage: ServicoImage;
  galleryImages: ServicoImage[];
  normas?: string[];
  beneficios: string[];
  metodologia: Array<{
    titulo: string;
    descricao: string;
    imagem?: ServicoImage;
  }>;
  entregaveis: string[];
};

const opacidadeImages = {
  cover: {
    src: "/servicos/opacidade-fumaca-preta/opacidade-fumaca-preta-01.jpg",
    alt: "Inspeção de opacidade em veículo a diesel",
  },
  medicao: {
    src: "/servicos/opacidade-fumaca-preta/opacidade-fumaca-preta-02.jpg",
    alt: "Equipamento de medição durante teste de fumaça preta",
  },
  campo: {
    src: "/servicos/opacidade-fumaca-preta/opacidade-fumaca-preta-03.jpg",
    alt: "Técnico realizando teste de opacidade em campo",
  },
} satisfies Record<string, ServicoImage>;

const liquidoPenetranteImages = {
  penetrante: {
    src: "/servicos/liquido-penetrante/liquido-penetrante-01.jpg",
    alt: "Aplicação de líquido penetrante em peça metálica",
  },
  limpeza: {
    src: "/servicos/liquido-penetrante/liquido-penetrante-02.jpg",
    alt: "Limpeza da superfície antes do ensaio por líquido penetrante",
  },
  revelador: {
    src: "/servicos/liquido-penetrante/liquido-penetrante-03.jpg",
    alt: "Aplicação de revelador no ensaio por líquido penetrante",
  },
} satisfies Record<string, ServicoImage>;

export const SERVICOS: Servico[] = [
  {
    slug: "opacidade-fumaca-preta",
    titulo: "Laudo de Opacidade / Fumaça Preta",
    resumo:
      "Medição da emissão de fumaça em veículos e equipamentos a diesel, com laudo técnico para controle ambiental e regularização.",
    headline: "Laudo de opacidade e fumaça preta para frota diesel",
    subheadline:
      "A Greenproject realiza o teste no local de operação da frota, registra os resultados e orienta os próximos passos quando há necessidade de ajuste.",
    coverImage: opacidadeImages.cover,
    galleryImages: [opacidadeImages.medicao, opacidadeImages.campo],
    normas: ["CONAMA", "IBAMA"],
    beneficios: [
      "Reduzir risco de autuações ambientais ligadas à emissão de fumaça preta.",
      "Manter veículos e equipamentos a diesel aptos para fiscalizações e contratos.",
      "Acompanhar a condição da frota sem deslocar os veículos para fora da operação.",
      "Identificar indícios de manutenção necessária antes que o problema cresça.",
    ],
    metodologia: [
      {
        titulo: "Triagem e preparação",
        descricao:
          "Conferimos identificação do veículo, condições de ensaio e aquecimento adequado do motor antes das medições.",
      },
      {
        titulo: "Medição com opacímetro",
        descricao:
          "Executamos as acelerações e leituras com equipamento apropriado, registrando os valores obtidos em campo.",
      },
      {
        titulo: "Análise técnica",
        descricao:
          "Comparamos os resultados com os critérios aplicáveis e indicamos quando a frota precisa de correção ou nova avaliação.",
      },
    ],
    entregaveis: [
      "Laudo técnico de opacidade com identificação do veículo avaliado.",
      "Registro dos resultados medidos e parecer técnico conclusivo.",
      "Orientações objetivas para regularização quando houver não conformidade.",
    ],
  },
  {
    slug: "liquido-penetrante",
    titulo: "Ensaio por Líquido Penetrante",
    resumo:
      "Ensaio não destrutivo para revelar descontinuidades superficiais em soldas, peças e componentes metálicos.",
    headline: "Ensaio por líquido penetrante com registro do processo",
    subheadline:
      "Aplicamos o método em etapas controladas para evidenciar trincas, porosidades e outras descontinuidades abertas à superfície.",
    coverImage: liquidoPenetranteImages.penetrante,
    galleryImages: [liquidoPenetranteImages.limpeza, liquidoPenetranteImages.revelador],
    normas: ["INMETRO"],
    beneficios: [
      "Avaliar peças e soldas sem danificar o componente inspecionado.",
      "Encontrar descontinuidades superficiais que podem comprometer segurança e desempenho.",
      "Documentar a condição do componente para manutenção, liberação ou acompanhamento.",
      "Apoiar decisões técnicas em estruturas, equipamentos e conjuntos metálicos.",
    ],
    metodologia: [
      {
        titulo: "Limpeza da superfície",
        descricao:
          "Removemos contaminantes que poderiam esconder defeitos ou interferir na penetração do produto.",
        imagem: liquidoPenetranteImages.limpeza,
      },
      {
        titulo: "Aplicação do penetrante",
        descricao:
          "O líquido é aplicado sobre a região inspecionada e permanece pelo tempo necessário para atingir possíveis aberturas superficiais.",
        imagem: liquidoPenetranteImages.penetrante,
      },
      {
        titulo: "Revelação e interpretação",
        descricao:
          "Após a remoção do excesso, o revelador evidencia indicações para análise e registro técnico.",
        imagem: liquidoPenetranteImages.revelador,
      },
    ],
    entregaveis: [
      "Relatório técnico com método aplicado, área avaliada e registros fotográficos.",
      "Indicações encontradas, interpretação técnica e conclusão do ensaio.",
      "Recomendações para correção, reinspeção ou acompanhamento, quando necessário.",
    ],
  },
];

export type MosaicImage = ServicoImage & { label: string; servicoSlug: string };

export const HOME_MOSAIC_IMAGES: MosaicImage[] = [
  {
    ...opacidadeImages.cover,
    label: "Opacidade / Fumaça Preta",
    servicoSlug: "opacidade-fumaca-preta",
  },
  {
    ...liquidoPenetranteImages.penetrante,
    label: "Líquido Penetrante",
    servicoSlug: "liquido-penetrante",
  },
  {
    ...opacidadeImages.medicao,
    label: "Opacidade / Fumaça Preta",
    servicoSlug: "opacidade-fumaca-preta",
  },
  {
    ...liquidoPenetranteImages.limpeza,
    label: "Líquido Penetrante",
    servicoSlug: "liquido-penetrante",
  },
  {
    ...liquidoPenetranteImages.revelador,
    label: "Líquido Penetrante",
    servicoSlug: "liquido-penetrante",
  },
];

export function getServicoBySlug(slug: string): Servico | undefined {
  return SERVICOS.find((servico) => servico.slug === slug);
}
