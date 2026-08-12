-- Slides do carrossel da home (Hero) — antes hardcoded em
-- src/components/marketing/hero.tsx, agora gerenciados pela gerência em
-- /painel/site/hero. Substitui o array `SLIDES` (7 itens).
--
-- Simplificação consciente: o array antigo tinha recortes (object-position)
-- diferentes pra mobile e desktop, com uma foto própria só pro slide de
-- opacidade no mobile. Uma única imagem por slide é bem mais simples de
-- gerenciar num formulário — `posicao` (object-position) fica no banco
-- pra preservar o enquadramento já ajustado nos 7 slides existentes, mas
-- não é editável pelo formulário do painel (some da UI); troca de foto
-- usa sempre a mesma posição salva, ajuste fino continua sendo tarefa de
-- dev se algum dia for preciso.
--
-- Limites de caracteres (pedido explícito: sem isso o card sobreposto na
-- foto pode ficar alto demais e atropelar o resto do layout do Hero):
-- servico até 40 caracteres (maior atual: "Vistoria de Transporte Escolar", 31),
-- descricao até 160 (maior atual: 132) — checados no banco E na Server Action.
create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  servico text not null check (char_length(servico) <= 40),
  imagem_url text not null,
  imagem_alt text not null,
  posicao text not null default '50% 50%',
  descricao text not null check (char_length(descricao) <= 160),
  link_href text not null,
  ordem integer not null default 0,
  criado_por uuid references public.usuarios_perfis(id),
  atualizado_por uuid references public.usuarios_perfis(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.hero_slides enable row level security;

create policy "staff le hero_slides"
  on public.hero_slides for select
  using (public.get_my_role() is not null);

create policy "gerencia gerencia hero_slides"
  on public.hero_slides for all
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');

insert into public.hero_slides
  (servico, imagem_url, imagem_alt, posicao, descricao, link_href, ordem)
values
(
  'Opacidade / Fumaça Preta',
  '/hero/opacidade-slide-original.jpg',
  'Opacímetro sendo utilizado durante teste de fumaça preta em campo',
  '30% 62%',
  'Medição da emissão de fumaça em veículos e equipamentos a diesel, com laudo técnico para controle ambiental e regularização.',
  '/servicos/opacidade-fumaca-preta',
  0
),
(
  'Líquido Penetrante',
  '/hero/liquido-penetrante-slide-original.jpg',
  'Técnico da Greenproject aplicando líquido penetrante em gancho de guindaste',
  '72% 38%',
  'Ensaio não destrutivo para revelar descontinuidades superficiais em soldas, peças e componentes metálicos.',
  '/servicos/liquido-penetrante',
  1
),
(
  'Vistoria de Transporte Escolar',
  '/hero/transporte-escolar.jpg',
  'Frota de veículos de transporte escolar durante vistoria',
  '60% 55%',
  'Inspeção semestral de veículos de transporte escolar conforme a Portaria do DETRAN-MG, com laudo técnico e ART.',
  '/servicos/vistoria-transporte-escolar',
  2
),
(
  'Treinamento PEMT (NR-18)',
  '/hero/treinamento-pemt.jpg',
  'Treinamento de operação segura de plataforma elevatória',
  '50% 30%',
  'Capacitação de operadores de plataformas elevatórias móveis de trabalho conforme a NR-18, com certificado.',
  '/servicos/treinamento-pemt-nr18',
  3
),
(
  'Apreciação de Risco NR-12',
  '/hero/apreciacao-risco-nr12.jpg',
  'Máquinas e equipamentos em operação de terraplanagem',
  '50% 55%',
  'Análise de risco de máquinas e equipamentos conforme a NR-12, com laudo técnico, plano de ação e ART.',
  '/servicos/apreciacao-risco-nr12',
  4
),
(
  'Reclassificação de Sinistros',
  '/hero/reclassificacao-sinistro.jpg',
  'Veículo sinistrado para laudo de reclassificação',
  '70% 55%',
  'Laudo de recuperabilidade para reclassificar veículos com dano de média ou grande monta, conforme a Resolução Contran nº 810/2020.',
  '/servicos/reclassificacao-sinistro',
  5
),
(
  'Vistoria de Máquinas',
  '/hero/mineradoras.jpg',
  'Máquina de mineração em processo de mobilização',
  '65% 50%',
  'Projetos mecânicos e elétricos de sistemas de segurança de máquinas para mobilização em mineradoras, conforme a NR-12.',
  '/servicos/vistoria-maquinas-mineradoras',
  6
);
