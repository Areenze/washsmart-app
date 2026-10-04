/* Photo uploads to the partner-photos storage bucket. */

import { getSupabase } from "./supabase";

const BUCKET = "partner-photos";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function validatePhoto(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Only image files are allowed.";
  if (file.size > MAX_BYTES) return "Each photo must be under 5 MB.";
  return null;
}

/**
 * Upload a photo to `folder/` in the bucket and return its public URL.
 * Folder examples: `applications/<draftId>`, `partners/<partnerId>`.
 */
export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const problem = validatePhoto(file);
  if (problem) throw new Error(problem);
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const { error } = await getSupabase().storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Remove a previously uploaded photo by its public URL. */
export async function deletePhoto(publicUrl: string): Promise<void> {
  const marker = `${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length).split("?")[0];
  await getSupabase().storage.from(BUCKET).remove([path]);
}
