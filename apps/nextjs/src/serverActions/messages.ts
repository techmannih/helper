"use server";

import type { UnsavedFileInfo } from "@/components/fileUploadContext";
import { api } from "@/trpc/server";

export type DraftedEmail = {
  cc: string;
  bcc: string;
  message: string;
  files: UnsavedFileInfo[];
};
