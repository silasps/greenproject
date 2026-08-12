-- Conteúdo editorial da página pública /sobre — gerenciado pela gerência em
-- /painel/site/sobre. Singleton (mesmo truque de dados_empresa: `id
-- boolean primary key default true check (id)` trava a tabela em 1 linha).
--
-- Os 3 "diferenciais" (cards com ícone) têm ícone fixo no código (não são
-- escolhidos pela gerência) — só título/descrição de cada um são
-- editáveis, na ordem [Atendimento em campo, Registro técnico claro,
-- Responsabilidade técnica].
create table public.pagina_sobre (
  id boolean primary key default true check (id),
  headline text not null,
  introducao text not null,
  como_trabalhamos_1 text not null,
  como_trabalhamos_2 text not null,
  diferenciais jsonb not null default '[]', -- [{ titulo, descricao }] x3
  atualizado_por uuid references public.usuarios_perfis(id),
  atualizado_em timestamptz not null default now()
);

insert into public.pagina_sobre
  (id, headline, introducao, como_trabalhamos_1, como_trabalhamos_2, diferenciais)
values (
  true,
  'Engenharia mecânica com responsabilidade técnica, no lugar onde sua operação acontece',
  'Somos uma empresa de engenharia mecânica e segurança do trabalho voltada a inspeções, testes e laudos técnicos, com atendimento direto na garagem, empresa ou local de operação do cliente.',
  'A Greenproject Engenharia Mecânica LTDA conduz seus ensaios e laudos in loco, evitando que o cliente precise deslocar veículos ou parar a rotina de operação para ser atendido. Cada serviço é conduzido por engenharia especializada, com foco em conformidade, segurança e rastreabilidade dos resultados.',
  'O foco atual da operação é o laudo de opacidade e fumaça preta para frotas a diesel, atendendo aos critérios do CONAMA e do IBAMA. Além dele, oferecemos todo o portfólio de laudos, inspeções e treinamentos de engenharia mecânica e segurança do trabalho.',
  jsonb_build_array(
    jsonb_build_object('titulo', 'Atendimento em campo', 'descricao', 'A equipe vai até você, reduzindo deslocamento e parada da operação.'),
    jsonb_build_object('titulo', 'Registro técnico claro', 'descricao', 'Laudos organizados para auditorias, fiscalizações e gestão interna.'),
    jsonb_build_object('titulo', 'Responsabilidade técnica', 'descricao', 'Serviços conduzidos por engenharia especializada, com foco em conformidade.')
  )
);

alter table public.pagina_sobre enable row level security;

create policy "staff le pagina_sobre"
  on public.pagina_sobre for select
  using (public.get_my_role() is not null);

create policy "gerencia edita pagina_sobre"
  on public.pagina_sobre for update
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');
