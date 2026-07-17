import React, { useState } from "react";
import {
  useListDictionaries,
  useDeleteDictionary,
  useUpdateDictionary,
  getListDictionariesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, PlayCircle, CheckCircle2, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { traduzirStatus } from "@/lib/utils";

function getStatusBadgeVariant(status: string) {
  if (status === "in_review") return "default";
  if (status === "validated") return "secondary";
  return "outline";
}

function getStatusIcon(status: string) {
  if (status === "validated") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "in_review") return <PlayCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

type DictItem = {
  id: number;
  tabela: string;
  processo: string;
  categoria: string;
  status: string;
  totalFields: number;
  approvedFields: number;
  avgScore: number | null;
};

export default function DictionariesList() {
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const { data: pageData, isLoading } = useListDictionaries({
    page,
    limit: LIMIT,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useDeleteDictionary();
  const updateMutation = useUpdateDictionary();

  const dictionaries = pageData?.data ?? [];
  const total = pageData?.total ?? 0;
  const totalPages = pageData?.totalPages ?? 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const [deleteTarget, setDeleteTarget] = useState<DictItem | null>(null);
  const [editTarget, setEditTarget] = useState<DictItem | null>(null);
  const [editForm, setEditForm] = useState({
    processo: "",
    categoria: "",
    tabela: "",
  });

  function openEdit(dict: DictItem) {
    setEditForm({
      processo: dict.processo,
      categoria: dict.categoria,
      tabela: dict.tabela,
    });
    setEditTarget(dict);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          toast({
            title: "Dicionário excluído",
            description: `"${deleteTarget.tabela}" foi removido com sucesso.`,
          });
          queryClient.invalidateQueries({
            queryKey: getListDictionariesQueryKey(),
          });
          setDeleteTarget(null);
        },
        onError: () => {
          toast({
            title: "Erro ao excluir",
            description: "Não foi possível excluir o dicionário.",
            variant: "destructive",
          });
          setDeleteTarget(null);
        },
      },
    );
  }

  function handleUpdate() {
    if (!editTarget) return;
    if (
      !editForm.processo.trim() ||
      !editForm.categoria.trim() ||
      !editForm.tabela.trim()
    ) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(
      { id: editTarget.id, data: editForm },
      {
        onSuccess: () => {
          toast({
            title: "Dicionário atualizado",
            description: "As informações foram salvas com sucesso.",
          });
          queryClient.invalidateQueries({
            queryKey: getListDictionariesQueryKey(),
          });
          setEditTarget(null);
        },
        onError: () => {
          toast({
            title: "Erro ao atualizar",
            description: "Não foi possível salvar as alterações.",
            variant: "destructive",
          });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Carregando dicionários...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dicionários de Dados
          </h1>
          <p className="text-muted-foreground">
            Gerencie e valide seus dicionários de dados.
          </p>
        </div>
        <Button asChild>
          <Link href="/dictionaries/new">
            <Plus className="mr-2 h-4 w-4" /> Importar Dicionário
          </Link>
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tabela</TableHead>
              <TableHead>Processo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Pontuação Média</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dictionaries.map((dict) => {
              const progress =
                dict.totalFields > 0
                  ? (dict.approvedFields / dict.totalFields) * 100
                  : 0;
              return (
                <TableRow key={dict.id}>
                  <TableCell className="font-medium">{dict.tabela}</TableCell>
                  <TableCell>{dict.processo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(dict.status)}
                      <Badge variant={getStatusBadgeVariant(dict.status)} className="gap-1">
                        {traduzirStatus(dict.status)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="w-[200px]">
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {dict.avgScore ? dict.avgScore.toFixed(1) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dictionaries/${dict.id}`}>Validar</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Editar"
                        onClick={() => openEdit(dict as DictItem)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Excluir"
                        onClick={() => setDeleteTarget(dict as DictItem)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {dictionaries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhum dicionário encontrado. Importe um para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "Nenhum dicionário"
            : `Exibindo ${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)} de ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="px-2">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      </div>

      {/* Dialog de exclusão */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir dicionário?</AlertDialogTitle>
            <AlertDialogDescription>
              O dicionário <strong>"{deleteTarget?.tabela}"</strong> e todos os
              seus campos e validações serão removidos permanentemente. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de edição */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Dicionário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-processo">Processo</Label>
              <Input
                id="edit-processo"
                value={editForm.processo}
                onChange={(e) =>
                  setEditForm({ ...editForm, processo: e.target.value })
                }
                placeholder="Ex: Compras Hospitalares"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-categoria">Categoria</Label>
              <Input
                id="edit-categoria"
                value={editForm.categoria}
                onChange={(e) =>
                  setEditForm({ ...editForm, categoria: e.target.value })
                }
                placeholder="Ex: RFQ / Medicamentos"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-tabela">Nome da Tabela</Label>
              <Input
                id="edit-tabela"
                value={editForm.tabela}
                onChange={(e) =>
                  setEditForm({ ...editForm, tabela: e.target.value })
                }
                placeholder="Ex: rfp_item"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
