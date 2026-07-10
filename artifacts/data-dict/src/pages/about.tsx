import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  FileSearch,
  BarChart3,
  Users,
  CheckCircle2,
  ArrowRight,
  Database,
  ClipboardCheck,
  TrendingUp,
  Hospital,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Importação do Dicionário",
    description:
      "O especialista de dados importa o dicionário de dados no formato JSON padronizado, contendo os campos técnicos do sistema de informação.",
    icon: Database,
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    number: "02",
    title: "Revisão pelos Especialistas",
    description:
      "Equipe de compras e gestores hospitalares revisam cada campo utilizando 5 critérios de qualidade objetivos, sem necessidade de conhecimento técnico avançado.",
    icon: ClipboardCheck,
    color: "bg-violet-50 text-violet-600 border-violet-100",
  },
  {
    number: "03",
    title: "Pontuação Automática",
    description:
      "O sistema calcula automaticamente o score de qualidade (0–100) para cada campo, classificando-os como Confiável, Atenção ou Crítico.",
    icon: BarChart3,
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    number: "04",
    title: "Governança e Exportação",
    description:
      "O painel de governança consolida as métricas. O dicionário validado pode ser exportado em JSON ou CSV para uso nos processos licitatórios.",
    icon: TrendingUp,
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
];

const criteria = [
  {
    label: "Campo utilizado no processo",
    description: "O campo é de fato usado no fluxo de compras/gestão?",
  },
  {
    label: "Campo obrigatório",
    description: "O preenchimento deste campo é mandatório?",
  },
  {
    label: "Nome técnico correto",
    description: "O nome do campo reflete adequadamente seu conteúdo?",
  },
  {
    label: "Origem do dado correta",
    description: "O dado vem do sistema correto?",
  },
  {
    label: "Possui regra de negócio definida",
    description: "Existe uma regra clara que rege este campo?",
  },
];

const impacts = [
  {
    icon: ShieldCheck,
    title: "Confiabilidade",
    description:
      "Dados validados por quem conhece o processo de negócio, não apenas a tecnologia.",
  },
  {
    icon: Users,
    title: "Colaboração",
    description:
      "Especialistas técnicos e de negócio trabalham juntos para garantir a qualidade.",
  },
  {
    icon: FileSearch,
    title: "Rastreabilidade",
    description:
      "Histórico completo de validações — quem validou, quando e com qual resultado.",
  },
  {
    icon: Hospital,
    title: "Governança em Saúde",
    description:
      "Suporte ao cumprimento de exigências regulatórias em compras hospitalares.",
  },
];

export default function About() {
  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-16">
      {/* Hero */}
      <section className="text-center pt-8 space-y-5">
        <Badge variant="secondary" className="text-xs px-3 py-1">
          Governança de Dados em Saúde
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
          Validação colaborativa de
          <br />
          <span className="text-primary">dicionários de dados</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Uma plataforma que aproxima especialistas técnicos e equipes de
          compras hospitalares para garantir que os dados utilizados em
          processos licitatórios sejam confiáveis, completos e bem documentados.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/dictionaries">
            <Button size="lg" className="gap-2">
              Ver Dicionários <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="outline" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Painel de Governança
            </Button>
          </Link>
        </div>
      </section>

      {/* O que é */}
      <section className="rounded-xl border bg-card p-8 space-y-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wide">
          <BookOpen className="h-4 w-4" /> O que é
        </div>
        <h2 className="text-2xl font-bold">
          Um validador de dicionários de dados para compras em saúde
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Em processos de aquisição de sistemas de informação hospitalar, os
          fornecedores entregam
          <strong> dicionários de dados</strong> — documentos técnicos que
          descrevem os campos, tipos e origens dos dados de seus sistemas. Esses
          documentos são críticos para garantir interoperabilidade, conformidade
          regulatória e qualidade da informação em saúde.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          O <strong>Validador DD</strong> permite que equipes multidisciplinares
          — gestores de TI, especialistas em dados e equipes de compras —
          revisem colaborativamente esses dicionários, aplicando critérios
          objetivos de qualidade e gerando evidências de governança de dados.
        </p>
      </section>

      {/* Como funciona */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm uppercase tracking-wide">
            <ClipboardCheck className="h-4 w-4" /> Como funciona
          </div>
          <h2 className="text-2xl font-bold">Processo em 4 etapas</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`rounded-xl border p-6 space-y-3 ${step.color}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl font-black opacity-20">
                  {step.number}
                </span>
                <step.icon className="h-5 w-5 opacity-70 mt-1" />
              </div>
              <h3 className="font-semibold text-base">{step.title}</h3>
              <p className="text-sm opacity-80 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Critérios de validação */}
      <section className="rounded-xl border bg-card p-8 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wide">
            <CheckCircle2 className="h-4 w-4" /> Critérios de Qualidade
          </div>
          <h2 className="text-2xl font-bold">
            5 perguntas objetivas, 1 score claro
          </h2>
          <p className="text-muted-foreground">
            Cada campo é avaliado com base em 5 critérios binários (sim/não).
            Cada critério atendido vale 20 pontos, totalizando até 100 pontos
            por campo.
          </p>
        </div>
        <div className="space-y-3">
          {criteria.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/40"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </div>
              <div>
                <p className="font-medium text-sm">{c.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
            <p className="text-emerald-700 font-bold text-lg">≥ 90</p>
            <p className="text-emerald-600 text-xs font-medium mt-1">
              Confiável
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
            <p className="text-amber-700 font-bold text-lg">60 – 89</p>
            <p className="text-amber-600 text-xs font-medium mt-1">Atenção</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
            <p className="text-red-700 font-bold text-lg">&lt; 60</p>
            <p className="text-red-600 text-xs font-medium mt-1">Crítico</p>
          </div>
        </div>
      </section>

      {/* Impacto */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm uppercase tracking-wide">
            <TrendingUp className="h-4 w-4" /> Impacto
          </div>
          <h2 className="text-2xl font-bold">Por que isso importa</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {impacts.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 p-5 rounded-xl border bg-card"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA para validadores */}
      <section className="rounded-xl border-2 border-primary/20 bg-primary/5 p-8 text-center space-y-4">
        <AlertTriangle className="h-8 w-8 text-primary mx-auto" />
        <h2 className="text-xl font-bold">
          Você faz parte da equipe de compras?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Sua participação é essencial. Ao validar os campos dos dicionários,
          você garante que os dados reflitam a realidade do processo de
          aquisição — algo que nenhum especialista técnico consegue fazer
          sozinho.
        </p>
        <Link href="/dictionaries">
          <Button size="lg" className="gap-2 mt-2">
            Começar a Validar <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
