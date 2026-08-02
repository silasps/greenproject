-- Categorias/assuntos da agenda (nome + cor), reutilizáveis entre eventos —
-- qualquer staff logado pode ver e criar (é só um rótulo compartilhado pela
-- equipe, sem dono).
create table public.categorias_agenda (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cor text not null,
  criado_por uuid references public.usuarios_perfis(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.categorias_agenda enable row level security;

create policy "staff logado vê categorias da agenda"
  on public.categorias_agenda for select
  using (auth.uid() is not null);

create policy "staff logado cria categorias da agenda"
  on public.categorias_agenda for insert
  with check (auth.uid() is not null);

alter table public.agendamentos
  add column categoria_id uuid references public.categorias_agenda(id) on delete set null;
