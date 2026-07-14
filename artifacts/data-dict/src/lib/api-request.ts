"use client";

import { getApiBase } from "@/lib/utils";

export interface ApiRequestOptions extends RequestInit {
  path: string;
}

export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
  const { path, ...fetchOptions } = options;
  const baseUrl = getApiBase();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `Erro ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function apiRequestBlob(
  options: ApiRequestOptions,
): Promise<{ content: string; filename: string; mimeType: string }> {
  const { path, ...fetchOptions } = options;
  const baseUrl = getApiBase();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `Erro ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  const content = await response.text();
  const filename =
    response.headers
      .get("content-disposition")
      ?.split("filename=")[1]
      ?.replace(/["']/g, "") ?? "download";

  const mimeType = response.headers.get("content-type") ?? "application/octet-stream";

  return { content, filename, mimeType };
}

export function triggerDownload(
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