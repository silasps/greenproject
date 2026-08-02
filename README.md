# Greenproject Engenharia Mecânica

Sistema web da **Greenproject Engenharia Mecânica**, empresa especializada em **ensaio de opacidade** (medição de fumaça preta em veículos e máquinas a diesel, conforme normas IBAMA/CONAMA) e emissão de laudos técnicos.

O projeto reúne três frentes em uma única aplicação **Next.js**:

- **Site público** — institucional, catálogo de serviços e autenticação.
- **Painel interno** (login obrigatório) — agenda/CRM, cadastro de clientes e veículos, execução do ensaio técnico, emissão de laudo em PDF, orçamento automático e módulo de RH (DP).
- **Verificação pública sem login** — páginas de consulta de laudo (`/laudo/[codigo]`) e de proposta comercial (`/proposta/[token]`) para conferência de documentos por terceiros.

Modelo **single-tenant** (uma única empresa, sem multi-organização).

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Banco / Auth / Storage | Supabase (Postgres, Auth, Storage) |
| Estilo | Tailwind CSS v4 + shadcn + `@base-ui/react` |
| Editor rich-text | Tiptap |
| Geração de PDF | jsPDF, jsPDF-AutoTable, pdf-lib, pdfjs-dist |
| Validação de formulários | React Hook Form + Zod |
| Linguagem | TypeScript |

Toda a lógica de servidor roda via **Server Components** e **Server Actions** do Next.js, sem back-end separado.

## Documentação

A arquitetura completa do sistema (schema, regras de negócio, fluxos e convenções) está documentada em [`system.architecture.md`](./system.architecture.md).

## Como rodar localmente

```bash
# instalar dependências
npm install

# configurar variáveis de ambiente
cp .env.example .env.local
# preencha as chaves do Supabase e demais variáveis

# ambiente de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | Executa o linter (ESLint) |

## Estrutura do projeto

```
src/
├── app/            # Rotas (App Router) — site público, painel e áreas protegidas
├── components/      # Componentes de UI reutilizáveis
├── lib/             # Clientes Supabase, utilitários e regras de negócio
└── proxy.ts         # Middleware (Next 16 renomeou middleware.ts → proxy.ts)
supabase/             # Migrations e configuração do Supabase
public/               # Assets estáticos (marca, imagens de serviços)
```

## Licença

Projeto privado e proprietário — © Greenproject Engenharia Mecânica. Uso restrito.
