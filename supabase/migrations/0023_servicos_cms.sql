-- Conteúdo de "Serviços" do site público, antes hardcoded em
-- src/lib/content/servicos.ts, passa a ser gerenciável pela gerência
-- (role 'gerencia') direto no painel — sem precisar de deploy de código
-- pra trocar texto/foto ou criar/remover um serviço.
--
-- galeria/metodologia usam jsonb (mesmo padrão de propostas.custos_extras e
-- testes_opacidade.fotos_extras) em vez de tabelas filhas — sempre lidos/
-- gravados como uma unidade só, não precisam de join.
--
-- Leitura pública (visitante anônimo do site) segue o mesmo padrão de
-- laudo/proposta: sem policy de SELECT pra "anon", a página pública lê via
-- createAdminClient() no servidor, filtrando publicado = true.

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  resumo text not null,
  headline text not null,
  subheadline text not null,
  normas text[] not null default '{}',
  beneficios text[] not null default '{}',
  entregaveis text[] not null default '{}',
  cover_image_url text not null,
  cover_image_alt text not null,
  -- true = a foto de capa entra no mosaico "Fotos reais" da home.
  cover_destaque_mosaico boolean not null default false,
  -- [{ url, alt, destaque_mosaico }]
  galeria jsonb not null default '[]',
  -- [{ titulo, descricao, imagem_url?, imagem_alt? }]
  metodologia jsonb not null default '[]',
  ordem integer not null default 0,
  publicado boolean not null default true,
  criado_por uuid references public.usuarios_perfis(id),
  atualizado_por uuid references public.usuarios_perfis(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.servicos enable row level security;

create policy "staff le servicos"
  on public.servicos for select
  using (public.get_my_role() is not null);

create policy "gerencia gerencia servicos"
  on public.servicos for all
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');

-- atualizado_em é setado explicitamente pela server action a cada update
-- (mesmo padrão de equipamentos/actions.ts) — sem trigger de banco.

-- ─────────────────────────────────────────────────────────────────
-- Seed: os 7 serviços que já existem em produção (src/lib/content/
-- servicos.ts), com os mesmos textos e os mesmos caminhos de imagem
-- estática (/servicos/..., /hero/...) — zero regressão visual, o site
-- passa a ler do banco mostrando exatamente o que já mostrava.
-- ─────────────────────────────────────────────────────────────────

insert into public.servicos
  (slug, titulo, resumo, headline, subheadline, normas, beneficios, entregaveis,
   cover_image_url, cover_image_alt, cover_destaque_mosaico, galeria, metodologia, ordem)
values
(
  'opacidade-fumaca-preta',
  'Laudo de Opacidade / Fumaça Preta',
  'Medição da emissão de fumaça em veículos e equipamentos a diesel, com laudo técnico para controle ambiental e regularização.',
  'Laudo de opacidade e fumaça preta para frota diesel',
  'A Greenproject realiza o teste no local de operação da frota, registra os resultados e orienta os próximos passos quando há necessidade de ajuste.',
  array['CONAMA', 'IBAMA'],
  array[
    'Reduzir risco de autuações ambientais ligadas à emissão de fumaça preta.',
    'Manter veículos e equipamentos a diesel aptos para fiscalizações e contratos.',
    'Acompanhar a condição da frota sem deslocar os veículos para fora da operação.',
    'Identificar indícios de manutenção necessária antes que o problema cresça.'
  ],
  array[
    'Laudo técnico de opacidade com identificação do veículo avaliado.',
    'Registro dos resultados medidos e parecer técnico conclusivo.',
    'Orientações objetivas para regularização quando houver não conformidade.'
  ],
  '/servicos/opacidade-fumaca-preta/opacidade-fumaca-preta-01.jpg',
  'Inspeção de opacidade em veículo a diesel',
  true,
  jsonb_build_array(
    jsonb_build_object('url', '/servicos/opacidade-fumaca-preta/opacidade-fumaca-preta-02.jpg', 'alt', 'Equipamento de medição durante teste de fumaça preta', 'destaque_mosaico', true),
    jsonb_build_object('url', '/servicos/opacidade-fumaca-preta/opacidade-fumaca-preta-03.jpg', 'alt', 'Técnico realizando teste de opacidade em campo', 'destaque_mosaico', false)
  ),
  jsonb_build_array(
    jsonb_build_object('titulo', 'Triagem e preparação', 'descricao', 'Conferimos identificação do veículo, condições de ensaio e aquecimento adequado do motor antes das medições.'),
    jsonb_build_object('titulo', 'Medição com opacímetro', 'descricao', 'Executamos as acelerações e leituras com equipamento apropriado, registrando os valores obtidos em campo.'),
    jsonb_build_object('titulo', 'Análise técnica', 'descricao', 'Comparamos os resultados com os critérios aplicáveis e indicamos quando a frota precisa de correção ou nova avaliação.')
  ),
  0
),
(
  'liquido-penetrante',
  'Ensaio por Líquido Penetrante',
  'Ensaio não destrutivo para revelar descontinuidades superficiais em soldas, peças e componentes metálicos.',
  'Ensaio por líquido penetrante com registro do processo',
  'Aplicamos o método em etapas controladas para evidenciar trincas, porosidades e outras descontinuidades abertas à superfície.',
  array['INMETRO'],
  array[
    'Avaliar peças e soldas sem danificar o componente inspecionado.',
    'Encontrar descontinuidades superficiais que podem comprometer segurança e desempenho.',
    'Documentar a condição do componente para manutenção, liberação ou acompanhamento.',
    'Apoiar decisões técnicas em estruturas, equipamentos e conjuntos metálicos.'
  ],
  array[
    'Relatório técnico com método aplicado, área avaliada e registros fotográficos.',
    'Indicações encontradas, interpretação técnica e conclusão do ensaio.',
    'Recomendações para correção, reinspeção ou acompanhamento, quando necessário.'
  ],
  '/servicos/liquido-penetrante/liquido-penetrante-01.jpg',
  'Aplicação de líquido penetrante em peça metálica',
  true,
  jsonb_build_array(
    jsonb_build_object('url', '/servicos/liquido-penetrante/liquido-penetrante-02.jpg', 'alt', 'Limpeza da superfície antes do ensaio por líquido penetrante', 'destaque_mosaico', true),
    jsonb_build_object('url', '/servicos/liquido-penetrante/liquido-penetrante-03.jpg', 'alt', 'Aplicação de revelador no ensaio por líquido penetrante', 'destaque_mosaico', true)
  ),
  jsonb_build_array(
    jsonb_build_object('titulo', 'Limpeza da superfície', 'descricao', 'Removemos contaminantes que poderiam esconder defeitos ou interferir na penetração do produto.', 'imagem_url', '/servicos/liquido-penetrante/liquido-penetrante-02.jpg', 'imagem_alt', 'Limpeza da superfície antes do ensaio por líquido penetrante'),
    jsonb_build_object('titulo', 'Aplicação do penetrante', 'descricao', 'O líquido é aplicado sobre a região inspecionada e permanece pelo tempo necessário para atingir possíveis aberturas superficiais.', 'imagem_url', '/servicos/liquido-penetrante/liquido-penetrante-01.jpg', 'imagem_alt', 'Aplicação de líquido penetrante em peça metálica'),
    jsonb_build_object('titulo', 'Revelação e interpretação', 'descricao', 'Após a remoção do excesso, o revelador evidencia indicações para análise e registro técnico.', 'imagem_url', '/servicos/liquido-penetrante/liquido-penetrante-03.jpg', 'imagem_alt', 'Aplicação de revelador no ensaio por líquido penetrante')
  ),
  1
),
(
  'vistoria-transporte-escolar',
  'Laudo de Vistoria para Transporte Escolar',
  'Inspeção semestral de veículos de transporte escolar conforme a Portaria do DETRAN-MG, com laudo técnico e ART para regularização.',
  'Laudo de vistoria para veículos de transporte escolar',
  'Inspecionamos os equipamentos obrigatórios de segurança e emitimos laudo técnico e ART assinados por engenheiro habilitado no CREA-MG.',
  array['DETRAN-MG', 'CTB'],
  array[
    'Manter a frota apta a circular conforme a Portaria 1.498/2019 do DETRAN-MG.',
    'Evitar restrições por equipamentos de segurança fora de conformidade.',
    'Cumprir a exigência de inspeção semestral prevista no art. 136 do CTB.',
    'Reduzir custos de deslocamento com o atendimento realizado na garagem do cliente.'
  ],
  array[
    'Laudo técnico de inspeção veicular semestral.',
    'ART (Anotação de Responsabilidade Técnica) do engenheiro responsável.',
    'Registro fotográfico da vistoria realizada.'
  ],
  '/servicos/vistoria-transporte-escolar/vistoria-transporte-escolar-01.jpg',
  'Veículo de transporte escolar aprovado em vistoria',
  false,
  jsonb_build_array(
    jsonb_build_object('url', '/servicos/vistoria-transporte-escolar/vistoria-transporte-escolar-02.jpg', 'alt', 'Inspeção dos equipamentos obrigatórios de veículo escolar', 'destaque_mosaico', false),
    jsonb_build_object('url', '/servicos/vistoria-transporte-escolar/vistoria-transporte-escolar-03.jpg', 'alt', 'Van de transporte escolar vistoriada pela Greenproject', 'destaque_mosaico', false)
  ),
  jsonb_build_array(
    jsonb_build_object('titulo', 'Agendamento em campo', 'descricao', 'A vistoria é agendada na garagem ou oficina do cliente, com flexibilidade de dias e horários.'),
    jsonb_build_object('titulo', 'Inspeção dos equipamentos obrigatórios', 'descricao', 'Engenheiro mecânico habilitado no CREA-MG verifica os itens de segurança exigidos pela Portaria 1.498/2019.'),
    jsonb_build_object('titulo', 'Emissão do laudo e ART', 'descricao', 'O veículo aprovado recebe laudo técnico de inspeção acompanhado da Anotação de Responsabilidade Técnica.')
  ),
  2
),
(
  'treinamento-pemt-nr18',
  'Treinamento de Operação e Segurança em PEMT',
  'Capacitação de operadores de plataformas elevatórias móveis de trabalho conforme a NR-18, com certificado e carga horária sob medida.',
  'Treinamento de operação segura de PEMT conforme NR-18',
  'Capacitamos operadores, supervisores e equipes de segurança para operar plataformas elevatórias com conformidade legal e menos risco de acidentes.',
  array['NR-18'],
  array[
    'Colocar a operação em conformidade com a NR-18, evitando multas e interdições.',
    'Reduzir o risco de quedas, esmagamentos, tombamentos e choques elétricos.',
    'Diminuir custos indiretos com afastamentos, manutenção corretiva e paralisações.',
    'Fortalecer a cultura de segurança e a retenção de equipe.'
  ],
  array[
    'Certificado digital de conclusão do treinamento.',
    'Carga horária de 4 ou 8 horas, a combinar conforme a demanda.',
    'Reciclagem recomendada a cada 2 anos.'
  ],
  '/servicos/treinamento-pemt-nr18/treinamento-pemt-nr18-01.jpg',
  'Turma de operadores durante treinamento prático de PEMT em campo',
  false,
  jsonb_build_array(
    jsonb_build_object('url', '/servicos/treinamento-pemt-nr18/treinamento-pemt-nr18-02.jpg', 'alt', 'Treinamento de operação de plataforma elevatória em ambiente interno', 'destaque_mosaico', false),
    jsonb_build_object('url', '/servicos/treinamento-pemt-nr18/treinamento-pemt-nr18-03.jpg', 'alt', 'Operador treinado em plataforma elevatória tipo tesoura', 'destaque_mosaico', false)
  ),
  jsonb_build_array(
    jsonb_build_object('titulo', 'Conteúdo teórico', 'descricao', 'Fundamentos de operação segura, riscos e responsabilidades conforme a NR-18.'),
    jsonb_build_object('titulo', 'Prática com simulações reais', 'descricao', 'Treinamento com PEMTs próprias ou in-company, com foco em situações reais de operação.', 'imagem_url', '/servicos/treinamento-pemt-nr18/treinamento-pemt-nr18-01.jpg', 'imagem_alt', 'Turma de operadores durante treinamento prático de PEMT em campo'),
    jsonb_build_object('titulo', 'Avaliação e certificação', 'descricao', 'Alunos aprovados recebem certificado digital com carga horária de 4 ou 8 horas, conforme a demanda.')
  ),
  3
),
(
  'apreciacao-risco-nr12',
  'Laudo de Apreciação de Risco NR-12',
  'Análise de risco de máquinas e equipamentos conforme a NR-12, com laudo técnico, plano de ação e ART.',
  'Apreciação de risco NR-12 para máquinas e equipamentos',
  'Identificamos e classificamos os riscos de máquinas e processos conforme a NBR ISO 12100 e a NR-12, com plano de ação para adequação.',
  array['NR-12', 'NBR ISO 12100'],
  array[
    'Prevenir acidentes e proteger colaboradores em máquinas e linhas de produção.',
    'Manter conformidade legal com a NR-12, evitando multas e interdições.',
    'Reduzir riscos operacionais e melhorar a eficiência produtiva.',
    'Fomentar um ambiente de trabalho mais seguro.'
  ],
  array[
    'Laudo de apreciação de risco com as não conformidades identificadas.',
    'Plano de ação detalhado, com recomendações e prazos.',
    'ART (Anotação de Responsabilidade Técnica) do profissional habilitado.'
  ],
  '/servicos/apreciacao-risco-nr12/apreciacao-risco-nr12-01.jpg',
  'Máquina em operação durante avaliação de risco NR-12',
  false,
  jsonb_build_array(
    jsonb_build_object('url', '/servicos/apreciacao-risco-nr12/apreciacao-risco-nr12-02.jpg', 'alt', 'Equipamento em operação em canteiro de obras', 'destaque_mosaico', false),
    jsonb_build_object('url', '/servicos/apreciacao-risco-nr12/apreciacao-risco-nr12-03.jpg', 'alt', 'Máquinas em operação de terraplenagem', 'destaque_mosaico', false)
  ),
  jsonb_build_array(
    jsonb_build_object('titulo', 'Levantamento em campo', 'descricao', 'Inspeção in loco e coleta de dados sobre máquinas, processos e sistemas de segurança existentes.'),
    jsonb_build_object('titulo', 'Análise e classificação de riscos', 'descricao', 'Identificação de perigos conforme a NBR ISO 12100 e demais normas aplicáveis.'),
    jsonb_build_object('titulo', 'Plano de ação', 'descricao', 'Recomendações técnicas para eliminação ou mitigação dos riscos identificados.')
  ),
  4
),
(
  'reclassificacao-sinistro',
  'Laudo de Reclassificação de Sinistros',
  'Laudo de recuperabilidade para reclassificar veículos com dano de média ou grande monta, conforme a Resolução Contran nº 810/2020.',
  'Laudo de reclassificação de monta para veículos sinistrados',
  'Avaliamos a viabilidade técnica de recuperação de veículos com dano de média ou grande monta, para reenquadramento na categoria imediatamente inferior.',
  array['CONTRAN', 'DETRAN-MG'],
  array[
    'Reverter classificações de média ou grande monta que impedem a circulação do veículo.',
    'Regularizar veículos com boletim de ocorrência de acidente perante o DETRAN.',
    'Contar com laudo assinado por engenheiro especializado, aceito pelo órgão de trânsito.',
    'Aplicável a motos, carros, caminhonetes, utilitários, caminhões e ônibus.'
  ],
  array[
    'Laudo de recuperabilidade (reclassificação de monta) assinado por engenheiro habilitado.',
    'Classificação técnica do dano: pequena, média ou grande monta.',
    'Documentação de apoio para o processo junto ao DETRAN.'
  ],
  '/servicos/reclassificacao-sinistro/reclassificacao-sinistro-01.jpg',
  'Veículo com dano de sinistro para avaliação de reclassificação',
  false,
  jsonb_build_array(
    jsonb_build_object('url', '/servicos/reclassificacao-sinistro/reclassificacao-sinistro-02.jpg', 'alt', 'Detalhe de dano estrutural em veículo sinistrado', 'destaque_mosaico', false)
  ),
  jsonb_build_array(
    jsonb_build_object('titulo', 'Análise da documentação', 'descricao', 'Avaliação do boletim de ocorrência e da classificação de dano atribuída pela autoridade de trânsito.'),
    jsonb_build_object('titulo', 'Vistoria técnica do veículo', 'descricao', 'Verificação das avarias estruturais e dos sistemas de segurança afetados pelo sinistro.'),
    jsonb_build_object('titulo', 'Classificação e laudo', 'descricao', 'Emissão do laudo de recuperabilidade conforme a Resolução Contran nº 810/2020.')
  ),
  5
),
(
  'vistoria-maquinas-mineradoras',
  'Vistoria de Máquinas e Equipamentos em Mineradoras',
  'Projetos mecânicos e elétricos de sistemas de segurança de máquinas para atendimento à NR-12 em processos de mobilização em mineradoras e multinacionais.',
  'Vistoria de máquinas e equipamentos para mineradoras',
  'Elaboramos projetos e laudos de sistemas de segurança de máquinas para mobilização em mineradoras e multinacionais, conforme a NR-12.',
  array['NR-12'],
  array[
    'Atender às exigências de mobilização de máquinas em mineradoras e multinacionais.',
    'Evitar retrabalho e reprovação em auditorias da Secretaria do Trabalho.',
    'Contar com projeto e especificações técnicas elaborados por profissional habilitado.',
    'Garantir que proteções mecânicas e sistemas elétricos sigam a NR-12.'
  ],
  array[
    'Projeto técnico dos sistemas de segurança das máquinas.',
    'Especificações técnicas em português, conforme exigido pela NR-12.',
    'ART (Anotação de Responsabilidade Técnica) do engenheiro responsável.'
  ],
  '/servicos/vistoria-maquinas-mineradoras/vistoria-maquinas-mineradoras-01.jpg',
  'Máquina em processo de mobilização em mineradora',
  false,
  '[]',
  jsonb_build_array(
    jsonb_build_object('titulo', 'Levantamento técnico', 'descricao', 'Análise das máquinas e do risco envolvido em cada processo de mobilização.'),
    jsonb_build_object('titulo', 'Elaboração do projeto', 'descricao', 'Projeto, diagrama ou representação esquemática dos sistemas de segurança, em português, conforme a NR-12.'),
    jsonb_build_object('titulo', 'Acompanhamento da adequação', 'descricao', 'Apoio técnico à fabricação das proteções mecânicas e montagem do sistema elétrico.')
  ),
  6
);
