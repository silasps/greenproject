-- Dados da empresa que aparecem no PDF de orçamento oficial — editáveis em
-- Configurações caso mudem (endereço, telefone etc.), sem precisar de deploy.
create table public.dados_empresa (
  id boolean primary key default true check (id),
  razao_social text not null,
  cnpj text not null,
  endereco text not null,
  telefone text not null,
  updated_at timestamptz not null default now()
);

insert into public.dados_empresa (id, razao_social, cnpj, endereco, telefone) values (
  true,
  'Greenproject Engenharia Mecânica LTDA',
  '44.660.456/0001-53',
  'R. Monsenhor Messias, 1093 - Flamengo, Contagem - MG',
  '(31) 99790-1568'
);

alter table public.dados_empresa enable row level security;

create policy "staff le dados_empresa"
  on public.dados_empresa for select
  using (public.get_my_role() is not null);

create policy "gerencia edita dados_empresa"
  on public.dados_empresa for update
  using (public.get_my_role() = 'gerencia')
  with check (public.get_my_role() = 'gerencia');
