import { supabase } from "./client";

export const INSURER_LOGOS_BUCKET = "insurer-logos";

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
