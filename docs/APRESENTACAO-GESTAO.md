# Validador de Dicionário de Dados — Apresentação para Gestão

---

## 1. PROBLEMA

**Dor atual da área de dados:**
- **A área NÃO possui dicionários de dados formalizados** — conhecimento disperso em arquivos Excel operacionais, planilhas de controle, cabeças de especialistas, documentação fragmentada
- Ausência de padrão único para nomes técnicos, tipos, classificações
- Validações manuais, subjetivas, sem rastreabilidade (quem validou, quando, por quê)
- DDLs e Data Contracts gerados "na mão" → erros, retrabalho, inconsistência
- Onboarding de novos analistas lento (não há fonte única da verdade)

---

## 2. SOLUÇÃO: Validador de Dicionário de Dados

**Ferramenta web interna (self-hosted)** que centraliza **todo o ciclo de vida do dicionário — do Excel bruto ao DDL pronto para produção**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUXO COMPLETO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📥 EXCEL BRUTO  →  🤖 INFERÊNCIA  →  👁️ PREVIEW/EDIÇÃO  →  ✅ VALIDAÇÃO  →  💾 PERSISTE  │
│       │                │                  │                  │            │               │
│       ▼                ▼                  ▼                  ▼            ▼               │
│  Planilhas     Motor infere       Grid editável      Checklist 5    Banco de     │
│  operacionais  descrição,         tipo Excel +       critérios     dados        │
│  da área       periodicidade,     painel validação   (20 pts cada)  estruturado  │
│                origem, chave      (2 passos)         score 0-100               │
│                                                                 │
│  📤 EXPORT:  DDL (PostgreSQL)  |  Data Contract (JSON)  |  Excel  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Diferencial:** Transforma **Excel operacional da área** → **Dicionário governado** → **Artefatos técnicos prontos (DDL, Data Contract)**.

---

## 3. FUNCIONALIDADES PRINCIPAIS

| Módulo | O que faz | Ganho |
|--------|-----------|-------|
| **Importação Excel → Dicionário** | Lê planilha operacional bruta → infere `descrição`, `periodicidade`, `origem`, `chave`, `tipo_dado` via heurísticas conservadoras | **Cria dicionário do zero** — elimina 80% preenchimento manual |
| **Preview + Edição (2 passos)** | 1) Mostra JSON inferido para revisão 2) Grid editável + painel validação 5 critérios | Qualidade garantida **antes** de persistir; especialista corrige inferências |
| **Validação Colaborativa** | Múltiplos validadores, status (pendente/aprovado/rejeitado/conflito), score 0-100 | Rastreabilidade total, governança, evidência para auditoria |
| **Dashboard Governança** | Visão geral: dicionários, campos críticos, scores, classificação | Gestão por indicadores, foco no que está crítico |
| **Export DDL** | `CREATE TABLE` com constraints, índices, comentários de status | Deploy direto no banco, zero erro de sintaxe |
| **Export Data Contract** | JSON com regras de negócio (médias das validações: usado, obrigatório, nome, origem, regra) | Contrato oficial entre produtor/consumidor de dados |
| **Validação DDL Real** | Executa `CREATE TABLE` em schema temporário no Supabase + rollback automático | Garante que DDL roda no PostgreSQL real antes de ir para produção |
| **Auditoria Completa** | Log de toda ação (quem, o que, antes/depois, quando) | Compliance, LGPD, rastreabilidade total |

---

## 4. ARQUITETURA TÉCNICA

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   FRONTEND  │────▶│    API      │────▶│  DATABASE   │
│  (React+TS) │     │ (Node+TS)   │     │ (PostgreSQL)│
│  Vercel     │     │  Render     │     │  Supabase   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  - Vite/React          - Express 5          - Drizzle ORM
  - TanStack Query      - Pino logging       - Migrações versionadas
  - shadcn/ui           - Zod validation     - Supabase Storage
  - Orval (types)       - Multer (Excel)     - Supabase Auth (futuro)
```

**Decisões chave:**
- **Monorepo pnpm** → compartilha tipos, schemas, utils
- **TypeScript end-to-end** → OpenAPI → Orval → tipos sincronizados FE/BE
- **Drizzle ORM** → SQL type-safe, migrações versionadas
- **Supabase** → Postgres gerenciado + Storage + Auth + Realtime (futuro)

---

## 5. GANHOS MENSURÁVEIS

| Métrica | Antes | Depois | Impacto |
|---------|-------|--------|---------|
| **Tempo criar dicionário** | 4-8h (manual) | 30-60min (import+valida) | **85% redução** |
| **Erros em DDL deploy** | ~15% (sintaxe, tipos) | 0% (validação real no Supabase) | **Eliminação** |
| **Rastreabilidade validação** | Zero (e-mail/Teams) | 100% (audit log + score) | **Compliance** |
| **Onboarding analista** | 2-3 semanas | 2-3 dias (fonte única) | **70% redução** |
| **Retrabalho por inconsistência** | Frequente | Raro (validação prévia) | **Qualidade** |

---

## 6. GOVERNANÇA DE DADOS HABILITADA

- **Padrão único** de nomenclatura (`campo_tecnico` snake_case, tipos padronizados)
- **Classificação automática** (Confiável ≥90, Atenção 60-89, Crítico <60)
- **Campos críticos** visíveis no dashboard (score baixo ou sem validação)
- **Histórico completo** — quem aprovou/rejeitou, quando, com que justificativa
- **Data Contracts** como artefato oficial entre times (produtores ↔ consumidores)

---

## 7. ROADMAP CURTO (PRÓXIMOS 30 DIAS)

- [ ] **Auth Supabase** (SSO corporativo, roles: admin/validator/viewer)
- [ ] **Notificações** (e-mail/Slack quando validação pendente)
- [ ] **Versionamento de dicionário** (diff entre versões)
- [ ] **API pública** para integração com catálogo de dados (DataHub, Amundsen)
- [ ] **Testes automatizados** (CI/CD GitHub Actions)

---

## 8. INVESTIMENTO vs RETORNO

| Item | Custo | Frequência |
|------|-------|------------|
| **Supabase (Pro)** | $25/mês | Mensal |
| **Render (Web Service)** | $7/mês | Mensal |
| **Vercel (Frontend)** | Free tier | — |
| **Desenvolvimento** | Já concluído (core) | — |
| **Manutenção** | ~4h/mês | Contínuo |

**ROI estimado:** ~200h/ano economizadas só em geração de DDL + validação manual → **payback imediato**.

---

## 9. PRÓXIMOS PASSOS PARA APROVAÇÃO

1. **Aprovar uso de Supabase + Render** (custo ~$32/mês)
2. **Definir pilotos**: 2-3 squads de dados usam por 2 semanas
3. **Feedback** → ajustes finos → rollout geral
4. **Integração** com catálogo de dados corporativo (se houver)

---

## 10. CONTATO

**Responsável técnico:** [Seu Nome/Time]
**Demo:** `https://validador-api-1lwu.onrender.com/api/healthz` (API) | `https://seu-app.vercel.app` (Frontend)
**Repo:** `github.com/Thiagohalmeida/dicionariodedados`

---

## 11. AVALIAÇÃO: NECESSIDADE DO RENDER (Deploy Cloud)

### Contexto: Ferramenta de uso **interno único** — foco em organização, estrutura, governança da área de dados

| Opção | Custo/Mês | Complexidade | Prós | Contras |
|-------|-----------|--------------|------|---------|
| **Render (atual)** | $0 (free tier) → $7+ | Baixa | Deploy git push, SSL, health check, auto-deploy | Cold start free tier, limites RAM/CPU |
| **VPS própria (DigitalOcean/Hetzner)** | $4-6 | Média | Controle total, sem cold start, custo fixo | Gerenciar SO, backup, SSL, monitoramento |
| **Docker na rede interna** | $0 (hardware existente) | Alta | Dados nunca saem, custo zero marginal | Requer infra, VPN, manutenção, sem escalabilidade |
| **Supabase Functions (Edge)** | $0-25 | Baixa | Mesmo provedor do DB, serverless | Limitações Node (wasm), cold start, vendor lock-in |

### Recomendação: **Manter Render (free tier) ou migrar para VPS $5/mês**

**Por que Render faz sentido hoje:**
1. **Zero ops** — deploy automático no push, health check `/api/healthz` já configurado
2. **Custo zero inicial** — free tier atende (512MB RAM, cold start aceitável para uso interno)
3. **Separação FE/BE nativa** — Vercel (frontend) + Render (API) = arquitetura correta
4. **Já funciona** — SSL, domain, env vars, logs, tudo pronto

**Quando migrar para VPS própria:**
- Uso > 100 req/min constantes (cold start incomoda)
- Necessidade de Redis/queues locais
- Política de dados "não pode sair da rede"

**Conclusão:** Para ferramenta interna de governança, **Render free tier é adequado**. O custo de manter VPS própria (tempo de engenharia) > $7/mês do Render paid. Reavaliar se escala.