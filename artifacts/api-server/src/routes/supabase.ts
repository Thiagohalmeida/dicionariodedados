import { Router, type IRouter, type Request, type Response } from "express";
import {
  getSupabaseClient,
  getSupabaseAdminClient,
  type BucketName,
} from "../modules/supabase/client";
import { ensureBuckets } from "../modules/supabase/storage";

const router: IRouter = Router();

// In-memory config store (in production, use a proper config table or env file management)
let supabaseConfig = {
  url: process.env.SUPABASE_URL ?? "",
  anonKey: process.env.SUPABASE_ANON_KEY ?? "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  bucketExcel: process.env.SUPABASE_BUCKET_EXCEL_UPLOADS ?? "excel-uploads",
  bucketExports: process.env.SUPABASE_BUCKET_EXPORTS ?? "exports",
};

// GET /api/supabase/config - Get current config (without service role key)
router.get("/supabase/config", (_req: Request, res: Response) => {
  res.json({
    url: supabaseConfig.url,
    anonKey: supabaseConfig.anonKey,
    // Never return service role key
    bucketExcel: supabaseConfig.bucketExcel,
    bucketExports: supabaseConfig.bucketExports,
  });
});

// POST /api/supabase/config - Update config
router.post(
  "/supabase/config",
  async (req: Request, res: Response): Promise<void> => {
    const { url, anonKey, serviceRoleKey, bucketExcel, bucketExports } =
      req.body as Partial<typeof supabaseConfig>;

    if (url !== undefined) supabaseConfig.url = url;
    if (anonKey !== undefined) supabaseConfig.anonKey = anonKey;
    if (serviceRoleKey !== undefined)
      supabaseConfig.serviceRoleKey = serviceRoleKey;
    if (bucketExcel !== undefined) supabaseConfig.bucketExcel = bucketExcel;
    if (bucketExports !== undefined)
      supabaseConfig.bucketExports = bucketExports;

    // Update environment for runtime (in production, persist to .env or config table)
    if (url) process.env.SUPABASE_URL = url;
    if (anonKey) process.env.SUPABASE_ANON_KEY = anonKey;
    if (serviceRoleKey) process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
    if (bucketExcel) process.env.SUPABASE_BUCKET_EXCEL_UPLOADS = bucketExcel;
    if (bucketExports) process.env.SUPABASE_BUCKET_EXPORTS = bucketExports;

    res.json({ success: true, message: "Configuração atualizada" });
  },
);

// GET /api/supabase/status - Check Supabase connection and buckets
router.get(
  "/supabase/status",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
        res.json({
          connected: false,
          buckets: [],
          authEnabled: false,
          error:
            "Supabase não configurado (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessários)",
        });
        return;
      }

      const supabase = getSupabaseAdminClient();

      // Test connection by listing buckets
      const { data: buckets, error: bucketsError } =
        await supabase.storage.listBuckets();

      if (bucketsError) {
        res.json({
          connected: false,
          buckets: [],
          authEnabled: false,
          error: `Erro ao acessar Storage: ${bucketsError.message}`,
        });
        return;
      }

      // Check auth by trying to get auth settings (requires service role)
      let authEnabled = false;
      try {
        const { data: authSettings } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });
        authEnabled = !!authSettings;
      } catch {
        authEnabled = false;
      }

      const bucketInfos =
        buckets?.map((b) => ({
          id: b.id,
          name: b.name,
          public: b.public,
          fileSizeLimit: b.file_size_limit ?? 0,
          createdAt: b.created_at,
        })) ?? [];

      res.json({
        connected: true,
        buckets: bucketInfos,
        authEnabled,
        version: "2.x",
      });
    } catch (err) {
      res.json({
        connected: false,
        buckets: [],
        authEnabled: false,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  },
);

// POST /api/supabase/buckets - Create/verify required buckets
router.post(
  "/supabase/buckets",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      if (!supabaseConfig.url || !supabaseConfig.serviceRoleKey) {
        res.status(400).json({ error: "Supabase não configurado" });
        return;
      }

      await ensureBuckets();

      res.json({
        success: true,
        message: "Buckets verificados/criados com sucesso",
      });
    } catch (err) {
      res
        .status(500)
        .json({
          error: err instanceof Error ? err.message : "Erro ao criar buckets",
        });
    }
  },
);

export default router;
