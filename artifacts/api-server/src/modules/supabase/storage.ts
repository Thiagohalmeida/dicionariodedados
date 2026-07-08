import { getSupabaseClient, type BucketName, BUCKETS } from "./client";

export interface UploadResult {
  path: string;
  fullPath: string;
  size: number;
}

export interface SignedUrlResult {
  signedUrl: string;
  expiresAt: number;
}

export async function ensureBuckets(): Promise<void> {
  const supabase = getSupabaseClient();

  for (const bucket of Object.values(BUCKETS)) {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucket);

    if (!exists) {
      const { error } = await supabase.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
      });
      if (error) {
        throw new Error(`Failed to create bucket ${bucket}: ${error.message}`);
      }
    }
  }
}

export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: Buffer | Uint8Array,
  contentType: string,
  options?: { upsert?: boolean }
): Promise<UploadResult> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: options?.upsert ?? false,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return {
    path: data.path,
    fullPath: data.fullPath,
    size: file.byteLength,
  };
}

export async function downloadFile(bucket: BucketName, path: string): Promise<Buffer> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteFile(bucket: BucketName, path: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

export async function createSignedUrl(
  bucket: BucketName,
  path: string,
  expiresInSeconds = 3600
): Promise<SignedUrlResult> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error(`Signed URL creation failed: ${error.message}`);
  }

  return {
    signedUrl: data.signedUrl,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
}

export async function listFiles(bucket: BucketName, folderPath?: string): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage.from(bucket).list(folderPath, {
    limit: 1000,
  });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return data?.map((f) => f.name) ?? [];
}

export async function getPublicUrl(bucket: BucketName, path: string): Promise<string> {
  const supabase = getSupabaseClient();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function generateExcelUploadPath(filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${timestamp}-${sanitized}`;
}

export function generateExportPath(format: "ddl" | "data-contract" | "csv" | "json", tableName: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  return `exports/${format}/${tableName}_${timestamp}.${format === "data-contract" ? "json" : format}`;
}