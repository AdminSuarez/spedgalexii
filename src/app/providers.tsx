"use client";

import { SharedFileProvider } from "@/lib/SharedFileContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SharedFileProvider>{children}</SharedFileProvider>;
}
