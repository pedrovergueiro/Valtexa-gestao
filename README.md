# ValTexa — Sistema de Gestão Corporativa (ERP v1.0)

Plataforma web interna de gestão corporativa da ValTexa, startup de tecnologia agrícola.

## Fundadores e Credenciais de Acesso

| Cargo | Nome | Email | Senha |
|-------|------|-------|-------|
| **COO** — Operações Gerais | Pedro Lucas Vergueiro | `pedro@valtexa.com` | `Valtexa@Pedro2026` |
| **CEO** — Negócios & Estratégia | Murilo | `murilo@valtexa.com` | `Valtexa@Murilo2026` |
| **CTO** — Tecnologia, IA & Rover V3 | Gabriel | `gabriel@valtexa.com` | `Valtexa@Gabriel2026` |
| **CPO** — Produto, UX & Requisitos | Nicholas | `nicholas@valtexa.com` | `Valtexa@Nicholas2026` |

> **Senha mestre de emergência:** `Valtexa@2026` (funciona com qualquer email acima)

## Como Executar

```bash
# Instalar dependências
npm install

# Resetar o banco de dados e aplicar seed
npx prisma migrate reset --force
npx prisma db seed

# Iniciar em modo desenvolvimento
npm run dev
```

O sistema estará disponível em **http://localhost:3000**.

## Organograma

```
                     VALTEXA
                        |
             COO — Pedro Lucas Vergueiro
                /       |       \
               /         |        \
           CEO          CTO       CPO
          Murilo       Gabriel   Nicholas
             |           |         |
       Negócios e    Tecnologia  Produto e
       estratégia    e engenharia requisitos
```

Os colaboradores devem ser adicionados manualmente pelos executivos através do sistema, conforme a empresa crescer.

## Stack Tecnológica

- **Frontend:** Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes
- **Banco de Dados:** SQLite (via Prisma ORM)
- **Autenticação:** JWT com cookies HttpOnly

## Módulos Disponíveis

- **Visão Geral** — Dashboard executivo consolidado
- **Minha Agenda** — Agenda pessoal do colaborador
- **Agenda Executiva** — Planejamento semanal da liderança (COO)
- **Tarefas** — Gestão hierárquica de tarefas com checklists
- **Projetos** — Acompanhamento de projetos por setor
- **Organograma** — Estrutura organizacional visual
- **Setores e Equipes** — Gestão departamental
- **Reuniões & Atas** — Convocação, pautas e registros
- **Base de Conhecimento** — Documentação interna
- **Relatórios** — Indicadores e métricas
- **Assistente IA** — Chat com inteligência artificial

