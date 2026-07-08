"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Database, HardDrive, Shield, Wrench, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiBase } from "@/lib/utils";

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  bucketExcel: string;
  bucketExports: string;
}

interface BucketInfo {
  id: string;
  name: string;
  public: boolean;
  fileSizeLimit: number;
  createdAt: string;
}

interface SupabaseStatus {
  connected: boolean;
  buckets: BucketInfo[];
  authEnabled: boolean;
  version?: string;
  error?: string;
}

export default function SupabaseConfigPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SupabaseConfig>({
    url: "",
    anonKey: "",
    serviceRoleKey: "",
    bucketExcel: "excel-uploads",
    bucketExports: "exports",
  });
  const [status, setStatus] = useState<SupabaseStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingBuckets, setCreatingBuckets] = useState(false);

  useEffect(() => {
    loadConfig();
    checkStatus();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${getApiBase()}/api/supabase/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  };

  const checkStatus = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${getApiBase()}/api/supabase/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        setStatus({ connected: false, buckets: [], authEnabled: false, error: "Failed to connect" });
      }
    } catch (err) {
      setStatus({ connected: false, buckets: [], authEnabled: false, error: "Connection failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${getApiBase()}/api/supabase/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast({ title: "Configuração salva", description: "As configurações do Supabase foram atualizadas." });
        checkStatus();
      } else {
        const err = await res.json();
        toast({ title: "Erro ao salvar", description: err.error ?? "Falha ao salvar configuração", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro", description: "Erro de conexão ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBuckets = async () => {
    setCreatingBuckets(true);
    try {
      const res = await fetch(`${getApiBase()}/api/supabase/buckets`, {
        method: "POST",
      });
      if (res.ok) {
        toast({ title: "Buckets criados", description: "Buckets de storage foram criados/verificados." });
        checkStatus();
      } else {
        const err = await res.json();
        toast({ title: "Erro", description: err.error ?? "Falha ao criar buckets", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro", description: "Erro de conexão", variant: "destructive" });
    } finally {
      setCreatingBuckets(false);
    }
  };

  const handleTestConnection = async () => {
    checkStatus();
  };

  const ConnectionStatus = () => {
    if (!status) return <Badge variant="outline">Desconhecido</Badge>;
    if (testing) return <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Testando...</Badge>;
    return status.connected ? (
      <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>
    ) : (
      <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Desconectado</Badge>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuração do Supabase</h1>
        <p className="text-muted-foreground">
          Configure a conexão com o Supabase para Storage, Auth e validação DDL em tempo real.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Status da Conexão
          </CardTitle>
          <CardDescription>
            Verifique se o Supabase está acessível e os buckets estão configurados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-muted-foreground">Conexão com o banco PostgreSQL e Storage</p>
            </div>
            <ConnectionStatus />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Autenticação</p>
              <p className="text-sm text-muted-foreground">Supabase Auth habilitado</p>
            </div>
            <Badge variant={status?.authEnabled ? "default" : "secondary"}>
              {status?.authEnabled ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          {status?.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {status.error}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleTestConnection} disabled={testing} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Testar Conexão
            </Button>
            <Button onClick={handleCreateBuckets} disabled={creatingBuckets} variant="outline" className="gap-2">
              <HardDrive className="h-4 w-4" /> {creatingBuckets ? "Criando..." : "Criar/Verificar Buckets"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full max-w-2xl">
          <TabsTrigger value="config">Conexão</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="ddl">Validação DDL</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Credenciais de Conexão
              </CardTitle>
              <CardDescription>
                URL do projeto, chave anônima e chave de serviço. A chave de serviço <strong>nunca</strong> é exposta no frontend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Projeto Supabase</Label>
                <Input
                  placeholder="https://seu-projeto.supabase.co"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  type="url"
                />
              </div>
              <div className="space-y-2">
                <Label>Chave Anônima (anon key)</Label>
                <Input
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={config.anonKey}
                  onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
                  type="password"
                />
                <p className="text-xs text-muted-foreground">Usada para operações do lado do cliente (futuro)</p>
              </div>
              <div className="space-y-2">
                <Label>Chave de Serviço (service_role key)</Label>
                <Input
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={config.serviceRoleKey}
                  onChange={(e) => setConfig({ ...config, serviceRoleKey: e.target.value })}
                  type="password"
                />
                <p className="text-xs text-muted-foreground">Usada apenas no backend para operações admin. <strong>Nunca compartilhe.</strong></p>
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Configuração"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Buckets de Storage
              </CardTitle>
              <CardDescription>
                Configure os buckets para upload de Excel e exportação de DDL/Data Contract.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 p-4 border rounded-lg">
                  <Label>Bucket para Uploads de Excel</Label>
                  <Input
                    placeholder="excel-uploads"
                    value={config.bucketExcel}
                    onChange={(e) => setConfig({ ...config, bucketExcel: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Arquivos .xlsx/.xlsm enviados pelos usuários</p>
                </div>
                <div className="space-y-2 p-4 border rounded-lg">
                  <Label>Bucket para Exportações</Label>
                  <Input
                    placeholder="exports"
                    value={config.bucketExports}
                    onChange={(e) => setConfig({ ...config, bucketExports: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">DDL (.sql), Data Contract (.json), CSV</p>
                </div>
              </div>
              {status && status.buckets.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Buckets Existentes</h4>
                  <div className="grid gap-2 md:grid-cols-3">
                    {status.buckets.map((bucket) => (
                      <div key={bucket.id} className="p-3 border rounded-lg bg-card">
                        <p className="font-mono text-sm">{bucket.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {bucket.public ? "Público" : "Privado"} · {bucket.fileSizeLimit / 1024 / 1024}MB
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ddl" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Validação DDL Pré-Produção
              </CardTitle>
              <CardDescription>
                Teste a criação de tabelas no PostgreSQL real antes de promover para produção.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Como funciona</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Selecione um dicionário existente</li>
                  <li>O sistema gera o DDL (CREATE TABLE) baseado nos campos</li>
                  <li>Executa o DDL em um schema temporário ({"staging_<id>_<timestamp>"})</li>
                  <li>Se válido: faz rollback e retorna sucesso</li>
                  <li>Se inválido: retorna erro detalhado do PostgreSQL</li>
                </ol>
              </div>
              <div className="space-y-2">
                <Label>Testar Validação DDL</Label>
                <p className="text-sm text-muted-foreground">
                  Acesse um dicionário em {"/dictionaries/:id"} e use o endpoint {"POST /api/dictionaries/:id/validate-ddl"}
                </p>
                <Button variant="outline" className="gap-2" onClick={() => window.open("/dictionaries", "_blank")}>
                  Ir para Dicionários
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}