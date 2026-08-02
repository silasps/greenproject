-- Categoria da agenda não tem dono (qualquer staff cria, ver 0012) — então
-- editar/excluir seguem a mesma regra do insert: qualquer staff logado.
-- Excluir uma categoria não apaga os eventos que a usam (categoria_id tem
-- "on delete set null"), só tira a marcação deles.
create policy "staff logado edita categorias da agenda"
  on public.categorias_agenda for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "staff logado exclui categorias da agenda"
  on public.categorias_agenda for delete
  using (auth.uid() is not null);
