import { supabase } from "./client";

export const INSURER_LOGOS_BUCKET = "insurer-logos";
export const POLICY_PDFS_BUCKET = "policy-pdfs";

/**
 * Uploads an image file for an insurer and returns the public URL.
 * Bucket must exist and be public in Supabase Storage.
 */
export async function uploadInsurerLogo(
  insurerId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${insurerId}/logo.${ext}`;

  const { error } = await supabase.storage
    .from(INSURER_LOGOS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(INSURER_LOGOS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Uploads a PDF file for a policy and returns the public URL.
 * Bucket must exist and be public in Supabase Storage.
 */
export async function uploadPolicyPdf(
  policyId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const uniqueId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80);
  const path = `${policyId}/${uniqueId}-${safeName}`;

  const { error } = await supabase.storage
    .from(POLICY_PDFS_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/pdf",
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(POLICY_PDFS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}
