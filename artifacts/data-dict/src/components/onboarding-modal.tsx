import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  ClipboardCheck,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";

const STORAGE_KEY = "validador-dd-onboarding-done";
const SHOW_ONBOARDING_EVENT = "validador-dd:show-onboarding";

let openOnboardingFn: (() => void) | null = null;

export function showOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(SHOW_ONBOARDING_EVENT));
}

export function useResetOnboarding() {
  return showOnboarding;
}

const slides = [
  {
    icon: Database,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    title: "Bem-vindo ao Validador DD",
    subtitle: "Governança de dados em compras de saúde",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Esta plataforma ajuda equipes de compras hospitalares e especialistas
          de dados a <strong className="text-foreground">validar dicionários de dados</strong> entregues
          por fornecedores de sistemas de informação em saúde.
        </p>
        <p>
          Você <strong className="text-foreground">não precisa ser especialista em TI</strong> para
          participar — seu conhecimento sobre o processo de compras é o que faz a diferença.
        </p>
      </div>
    ),
  },
  {
    icon: ClipboardCheck,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
    title: "O que você vai fazer",
    subtitle: "Validação campo a campo",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Para cada campo do dicionário, você responde <strong className="text-foreground">5 perguntas objetivas</strong>:
        </p>
        <ol className="space-y-2">
          {[
            "O campo é utilizado no processo de compras?",
            "O preenchimento é obrigatório?",
            "O nome técnico descreve bem o campo?",
            "O dado vem do sistema correto?",
            "Existe uma regra de negócio definida?",
          ].map((q, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{q}</span>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    icon: BarChart3,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-50",
    title: "Pontuação e Classificação",
    subtitle: "Cada resposta gera um score automático",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cada critério atendido vale <strong className="text-foreground">20 pontos</strong>. O sistema
          classifica automaticamente cada campo:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">Confiável (≥ 90 pts)</p>
              <p className="text-xs text-emerald-600">Campo bem documentado, seguro para uso</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Atenção (60–89 pts)</p>
              <p className="text-xs text-amber-600">Precisa de revisão antes de ser usado</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
            <CheckCircle2 className="h-4 w-4 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Crítico (&lt; 60 pts)</p>
              <p className="text-xs text-red-600">Não deve ser usado sem correções</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: CheckCircle2,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Pronto para começar!",
    subtitle: "Veja os dicionários disponíveis para validação",
    content: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Para validar um dicionário:
        </p>
        <ol className="space-y-2 list-none">
          {[
            'Acesse "Dicionários" no menu lateral',
            "Clique em um dicionário para abri-lo",
            'Selecione um campo e clique em "Validar"',
            "Responda as 5 perguntas e confirme",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </li>
          ))}
        </ol>
        <p className="pt-1">
          Dúvidas? Acesse a página <strong className="text-foreground">Sobre</strong> no menu para
          saber mais sobre o processo.
        </p>
      </div>
    ),
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    openOnboardingFn = () => setOpen(true);

    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(SHOW_ONBOARDING_EVENT, handler);
    return () => window.removeEventListener(SHOW_ONBOARDING_EVENT, handler);
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  function next() {
    if (step < slides.length - 1) setStep((s) => s + 1);
    else finish();
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  const slide = slides[step];
  const Icon = slide.icon;
  const progress = ((step + 1) / slides.length) * 100;
  const isLast = step === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {/* Top bar */}
        <div className="px-6 pt-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">
              Passo {step + 1} de {slides.length}
            </span>
            <button
              onClick={finish}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          <DialogHeader className="space-y-1 text-left">
            <div className={`w-12 h-12 rounded-xl ${slide.iconBg} flex items-center justify-center mb-3`}>
              <Icon className={`h-6 w-6 ${slide.iconColor}`} />
            </div>
            <DialogTitle className="text-lg leading-tight">{slide.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
          </DialogHeader>

          <div>{slide.content}</div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={step === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>

          <div className="flex gap-1">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <Link href="/dictionaries" onClick={finish}>
              <Button size="sm" className="gap-1">
                Começar <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button size="sm" onClick={next} className="gap-1">
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
