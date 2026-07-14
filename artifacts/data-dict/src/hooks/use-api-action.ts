"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, apiRequestBlob } from "@/lib/api-request";

interface UseApiActionOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function useApiAction() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const execute = async <T>(
    fn: () => Promise<T>,
    options: UseApiActionOptions = {},
  ): Promise<T | null> => {
    setIsLoading(true);
    try {
      const result = await fn();
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (error) {
      const err = error as Error;
      if (options.onError) {
        options.onError(err);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const executeWithToast = async <T>(
    fn: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string,
  ): Promise<T | null> => {
    return execute(fn, {
      onSuccess: (data) => {
        if (successMessage) {
          toast({
            title: successMessage,
            description: "Operação realizada com sucesso.",
          });
        }
      },
      onError: (err) => {
        toast({
          title: errorMessage ?? "Erro",
          description: err.message ?? "Não foi possível completar a operação.",
          variant: "destructive",
        });
      },
    });
  };

  return { isLoading, execute, executeWithToast };
}

export function useApiExport() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const exportFile = async (
    path: string,
    options: {
      onSuccess?: (data: { content: string; filename: string; mimeType: string }) => void;
      onError?: (error: Error) => void;
    } = {},
  ) => {
    setIsLoading(true);
    try {
      const result = await apiRequestBlob({ path });
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      return result;
    } catch (error) {
      const err = error as Error;
      if (options.onError) {
        options.onError(err);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const exportWithToast = async (
    path: string,
    successTitle?: string,
    errorTitle?: string,
  ) => {
    return exportFile(path, {
      onSuccess: ({ content, filename, mimeType }) => {
        triggerDownload(content, filename, mimeType);
        if (successTitle) {
          toast({
            title: successTitle,
            description: "Arquivo baixado com sucesso.",
          });
        }
      },
      onError: (err) => {
        toast({
          title: errorTitle ?? "Erro ao exportar",
          description: err.message ?? "Não foi possível gerar o arquivo.",
          variant: "destructive",
        });
      },
    });
  };

  return { isLoading, exportFile, exportWithToast };
}

function triggerDownload(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}