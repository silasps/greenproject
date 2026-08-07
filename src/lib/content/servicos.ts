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

const transporteEscolarImages = {
  cover: {
    src: "/servicos/vistoria-transporte-escolar/vistoria-transporte-escolar-01.jpg",
    alt: "Veículo de transporte escolar aprovado em vistoria",
  },
  inspecao: {
    src: "/servicos/vistoria-transporte-escolar/vistoria-transporte-escolar-02.jpg",
    alt: "Inspeção dos equipamentos obrigatórios de veículo escolar",
  },
  van: {
    src: "/servicos/vistoria-transporte-escolar/vistoria-transporte-escolar-03.jpg",
    alt: "Van de transporte escolar vistoriada pela Greenproject",
  },
} satisfies Record<string, ServicoImage>;

const pemtImages = {
  cover: {
    src: "/servicos/treinamento-pemt-nr18/treinamento-pemt-nr18-01.jpg",
    alt: "Turma de operadores durante treinamento prático de PEMT em campo",
  },
  indoor: {
    src: "/servicos/treinamento-pemt-nr18/treinamento-pemt-nr18-02.jpg",
    alt: "Treinamento de operação de plataforma elevatória em ambiente interno",
  },
  operador: {
    src: "/servicos/treinamento-pemt-nr18/treinamento-pemt-nr18-03.jpg",
    alt: "Operador treinado em plataforma elevatória tipo tesoura",
  },
} satisfies Record<string, ServicoImage>;

const nr12Images = {
  cover: {
    src: "/servicos/apreciacao-risco-nr12/apreciacao-risco-nr12-01.jpg",
    alt: "Máquina em operação durante avaliação de risco NR-12",
  },
  campo: {
    src: "/servicos/apreciacao-risco-nr12/apreciacao-risco-nr12-02.jpg",
    alt: "Equipamento em operação em canteiro de obras",
  },
  terraplenagem: {
    src: "/servicos/apreciacao-risco-nr12/apreciacao-risco-nr12-03.jpg",
    alt: "Máquinas em operação de terraplenagem",
  },
} satisfies Record<string, ServicoImage>;

// Ainda sem fotos reais de campo pra esse serviço — usando fotos de banco de
// imagens até termos registros próprios pra substituir.
const reclassificacaoImages = {
  cover: {
    src: "/servicos/reclassificacao-sinistro/reclassificacao-sinistro-01.jpg",
    alt: "Veículo com dano de sinistro para avaliação de reclassificação",
  },
  detalhe: {
    src: "/servicos/reclassificacao-sinistro/reclassificacao-sinistro-02.jpg",
    alt: "Detalhe de dano estrutural em veículo sinistrado",
  },
} satisfies Record<string, ServicoImage>;

// Idem: sem foto real de campo pra esse serviço ainda.
const mineradorasImages = {
  cover: {
    src: "/servicos/vistoria-maquinas-mineradoras/vistoria-maquinas-mineradoras-01.jpg",
    alt: "Máquina em processo de mobilização em mineradora",
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
  {
    slug: "vistoria-transporte-escolar",
    titulo: "Laudo de Vistoria para Transporte Escolar",
    resumo:
      "Inspeção semestral de veículos de transporte escolar conforme a Portaria do DETRAN-MG, com laudo técnico e ART para regularização.",
    headline: "Laudo de vistoria para veículos de transporte escolar",
    subheadline:
      "Inspecionamos os equipamentos obrigatórios de segurança e emitimos laudo técnico e ART assinados por engenheiro habilitado no CREA-MG.",
    coverImage: transporteEscolarImages.cover,
    galleryImages: [transporteEscolarImages.inspecao, transporteEscolarImages.van],
    normas: ["DETRAN-MG", "CTB"],
    beneficios: [
      "Manter a frota apta a circular conforme a Portaria 1.498/2019 do DETRAN-MG.",
      "Evitar restrições por equipamentos de segurança fora de conformidade.",
      "Cumprir a exigência de inspeção semestral prevista no art. 136 do CTB.",
      "Reduzir custos de deslocamento com o atendimento realizado na garagem do cliente.",
    ],
    metodologia: [
      {
        titulo: "Agendamento em campo",
        descricao:
          "A vistoria é agendada na garagem ou oficina do cliente, com flexibilidade de dias e horários.",
      },
      {
        titulo: "Inspeção dos equipamentos obrigatórios",
        descricao:
          "Engenheiro mecânico habilitado no CREA-MG verifica os itens de segurança exigidos pela Portaria 1.498/2019.",
      },
      {
        titulo: "Emissão do laudo e ART",
        descricao:
          "O veículo aprovado recebe laudo técnico de inspeção acompanhado da Anotação de Responsabilidade Técnica.",
      },
    ],
    entregaveis: [
      "Laudo técnico de inspeção veicular semestral.",
      "ART (Anotação de Responsabilidade Técnica) do engenheiro responsável.",
      "Registro fotográfico da vistoria realizada.",
    ],
  },
  {
    slug: "treinamento-pemt-nr18",
    titulo: "Treinamento de Operação e Segurança em PEMT",
    resumo:
      "Capacitação de operadores de plataformas elevatórias móveis de trabalho conforme a NR-18, com certificado e carga horária sob medida.",
    headline: "Treinamento de operação segura de PEMT conforme NR-18",
    subheadline:
      "Capacitamos operadores, supervisores e equipes de segurança para operar plataformas elevatórias com conformidade legal e menos risco de acidentes.",
    coverImage: pemtImages.cover,
    galleryImages: [pemtImages.indoor, pemtImages.operador],
    normas: ["NR-18"],
    beneficios: [
      "Colocar a operação em conformidade com a NR-18, evitando multas e interdições.",
      "Reduzir o risco de quedas, esmagamentos, tombamentos e choques elétricos.",
      "Diminuir custos indiretos com afastamentos, manutenção corretiva e paralisações.",
      "Fortalecer a cultura de segurança e a retenção de equipe.",
    ],
    metodologia: [
      {
        titulo: "Conteúdo teórico",
        descricao:
          "Fundamentos de operação segura, riscos e responsabilidades conforme a NR-18.",
      },
      {
        titulo: "Prática com simulações reais",
        descricao:
          "Treinamento com PEMTs próprias ou in-company, com foco em situações reais de operação.",
        imagem: pemtImages.cover,
      },
      {
        titulo: "Avaliação e certificação",
        descricao:
          "Alunos aprovados recebem certificado digital com carga horária de 4 ou 8 horas, conforme a demanda.",
      },
    ],
    entregaveis: [
      "Certificado digital de conclusão do treinamento.",
      "Carga horária de 4 ou 8 horas, a combinar conforme a demanda.",
      "Reciclagem recomendada a cada 2 anos.",
    ],
  },
  {
    slug: "apreciacao-risco-nr12",
    titulo: "Laudo de Apreciação de Risco NR-12",
    resumo:
      "Análise de risco de máquinas e equipamentos conforme a NR-12, com laudo técnico, plano de ação e ART.",
    headline: "Apreciação de risco NR-12 para máquinas e equipamentos",
    subheadline:
      "Identificamos e classificamos os riscos de máquinas e processos conforme a NBR ISO 12100 e a NR-12, com plano de ação para adequação.",
    coverImage: nr12Images.cover,
    galleryImages: [nr12Images.campo, nr12Images.terraplenagem],
    normas: ["NR-12", "NBR ISO 12100"],
    beneficios: [
      "Prevenir acidentes e proteger colaboradores em máquinas e linhas de produção.",
      "Manter conformidade legal com a NR-12, evitando multas e interdições.",
      "Reduzir riscos operacionais e melhorar a eficiência produtiva.",
      "Fomentar um ambiente de trabalho mais seguro.",
    ],
    metodologia: [
      {
        titulo: "Levantamento em campo",
        descricao:
          "Inspeção in loco e coleta de dados sobre máquinas, processos e sistemas de segurança existentes.",
      },
      {
        titulo: "Análise e classificação de riscos",
        descricao:
          "Identificação de perigos conforme a NBR ISO 12100 e demais normas aplicáveis.",
      },
      {
        titulo: "Plano de ação",
        descricao:
          "Recomendações técnicas para eliminação ou mitigação dos riscos identificados.",
      },
    ],
    entregaveis: [
      "Laudo de apreciação de risco com as não conformidades identificadas.",
      "Plano de ação detalhado, com recomendações e prazos.",
      "ART (Anotação de Responsabilidade Técnica) do profissional habilitado.",
    ],
  },
  {
    slug: "reclassificacao-sinistro",
    titulo: "Laudo de Reclassificação de Sinistros",
    resumo:
      "Laudo de recuperabilidade para reclassificar veículos com dano de média ou grande monta, conforme a Resolução Contran nº 810/2020.",
    headline: "Laudo de reclassificação de monta para veículos sinistrados",
    subheadline:
      "Avaliamos a viabilidade técnica de recuperação de veículos com dano de média ou grande monta, para reenquadramento na categoria imediatamente inferior.",
    coverImage: reclassificacaoImages.cover,
    galleryImages: [reclassificacaoImages.detalhe],
    normas: ["CONTRAN", "DETRAN-MG"],
    beneficios: [
      "Reverter classificações de média ou grande monta que impedem a circulação do veículo.",
      "Regularizar veículos com boletim de ocorrência de acidente perante o DETRAN.",
      "Contar com laudo assinado por engenheiro especializado, aceito pelo órgão de trânsito.",
      "Aplicável a motos, carros, caminhonetes, utilitários, caminhões e ônibus.",
    ],
    metodologia: [
      {
        titulo: "Análise da documentação",
        descricao:
          "Avaliação do boletim de ocorrência e da classificação de dano atribuída pela autoridade de trânsito.",
      },
      {
        titulo: "Vistoria técnica do veículo",
        descricao:
          "Verificação das avarias estruturais e dos sistemas de segurança afetados pelo sinistro.",
      },
      {
        titulo: "Classificação e laudo",
        descricao:
          "Emissão do laudo de recuperabilidade conforme a Resolução Contran nº 810/2020.",
      },
    ],
    entregaveis: [
      "Laudo de recuperabilidade (reclassificação de monta) assinado por engenheiro habilitado.",
      "Classificação técnica do dano: pequena, média ou grande monta.",
      "Documentação de apoio para o processo junto ao DETRAN.",
    ],
  },
  {
    slug: "vistoria-maquinas-mineradoras",
    titulo: "Vistoria de Máquinas e Equipamentos em Mineradoras",
    resumo:
      "Projetos mecânicos e elétricos de sistemas de segurança de máquinas para atendimento à NR-12 em processos de mobilização em mineradoras e multinacionais.",
    headline: "Vistoria de máquinas e equipamentos para mineradoras",
    subheadline:
      "Elaboramos projetos e laudos de sistemas de segurança de máquinas para mobilização em mineradoras e multinacionais, conforme a NR-12.",
    coverImage: mineradorasImages.cover,
    galleryImages: [],
    normas: ["NR-12"],
    beneficios: [
      "Atender às exigências de mobilização de máquinas em mineradoras e multinacionais.",
      "Evitar retrabalho e reprovação em auditorias da Secretaria do Trabalho.",
      "Contar com projeto e especificações técnicas elaborados por profissional habilitado.",
      "Garantir que proteções mecânicas e sistemas elétricos sigam a NR-12.",
    ],
    metodologia: [
      {
        titulo: "Levantamento técnico",
        descricao:
          "Análise das máquinas e do risco envolvido em cada processo de mobilização.",
      },
      {
        titulo: "Elaboração do projeto",
        descricao:
          "Projeto, diagrama ou representação esquemática dos sistemas de segurança, em português, conforme a NR-12.",
      },
      {
        titulo: "Acompanhamento da adequação",
        descricao:
          "Apoio técnico à fabricação das proteções mecânicas e montagem do sistema elétrico.",
      },
    ],
    entregaveis: [
      "Projeto técnico dos sistemas de segurança das máquinas.",
      "Especificações técnicas em português, conforme exigido pela NR-12.",
      "ART (Anotação de Responsabilidade Técnica) do engenheiro responsável.",
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
