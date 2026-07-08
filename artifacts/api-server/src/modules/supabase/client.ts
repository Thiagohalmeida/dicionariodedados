import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment");
  }

  // Provide WebSocket polyfill for Node.js < 22
  globalThis.WebSocket = globalThis.WebSocket ?? WebSocket;

  supabaseClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      // Use the ws package for realtime connections
    },
  });

  return supabaseClient;
}

export function getSupabaseAdminClient(): SupabaseClient {
  return getSupabaseClient();
}

export const BUCKETS = {
  EXCEL_UPLOADS: "excel-uploads",
  EXPORTS: "exports",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];