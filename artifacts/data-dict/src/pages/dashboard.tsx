import React from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteDictionary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboard } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle, Database, AlertTriangle, Clock, PlayCircle, CheckCircle2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { traduzirStatus } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

function getProgressLabel(dict: { totalFields: number; approvedFields: number; status: string }) {
  if (dict.totalFields === 0) return "Sem campos";
  const pct = Math.round((dict.approvedFields / dict.totalFields) * 100);
  if (dict.status === "validated") return `Concluído (${pct}%)`;
  if (dict.status === "in_review") return `Em validação (${pct}%)`;
  if (dict.approvedFields === 0) return `Não iniciado (0%)`;
  return `Em validação (${pct}%)`;
}

function getProgressIcon(status: string, approvedFields: number, totalFields: number) {
  if (status === "validated") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "in_review" || (status === "pending" && approvedFields > 0)) return <PlayCircle className="h-4 w-4 text-blue-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: number; tabela: string } | null>(null);

  const deleteMutation = useDeleteDictionary();

  const handleDeleteClick = (e: React.MouseEvent, dict: { id: number; tabela: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(dict);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteMutation.mutate(
        { id: deleteTarget.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
            toast({ title: "Dicionário excluído com sucesso" });
            setDeleteTarget(null);
          },
          onError: () => {
            toast({ title: "Erro ao excluir dicionário", variant: "destructive" });
            setDeleteTarget(null);
          },
        }
      );
    }
  };

  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Carregando métricas...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground">
          Métricas globais de qualidade e status de validação dos dicionários.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Dicionários
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDictionaries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Campos
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalFields}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Campos Aprovados
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.approvedFields}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalFields > 0
                ? Math.round((data.approvedFields / data.totalFields) * 100)
                : 0}
              % taxa de aprovação
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pontuação Média
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.globalScore ? data.globalScore.toFixed(1) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Média dos campos validados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Dicionários Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentDictionaries.map((dict) => (
                <div key={dict.id} className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/dictionaries/${dict.id}`)}>
                      <div className="font-medium text-sm truncate">{dict.tabela}</div>
                      <div className="text-xs text-muted-foreground">{dict.processo} / {dict.categoria}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getProgressIcon(dict.status, dict.approvedFields, dict.totalFields)}
                      <Badge variant="outline" className={dict.status === "in_review" ? "border-blue-500 text-blue-700 bg-blue-50" : dict.status === "validated" ? "border-green-500 text-green-700 bg-green-50" : ""}>
                        {traduzirStatus(dict.status)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Excluir dicionário"
                        onClick={(e) => handleDeleteClick(e, dict)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Progress
                      value={
                        dict.totalFields > 0
                          ? (dict.approvedFields / dict.totalFields) * 100
                          : 0
                      }
                      className="h-2 flex-1"
                    />
                    <span className="w-10 text-right">{getProgressLabel(dict)}</span>
                  </div>
                </div>
              ))}
              {data.recentDictionaries.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Nenhum dicionário importado ainda.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dicionário?</AlertDialogTitle>
            <AlertDialogDescription>
              O dicionário <strong>"{deleteTarget?.tabela}"</strong> e todos os seus
              campos e validações serão removidos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
