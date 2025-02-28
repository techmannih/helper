"use client";

import { type ReactNode } from "react";
import { useNativePlatform } from "@/components/useNativePlatform";
import { cn } from "@/lib/utils";

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const { nativePlatform } = useNativePlatform();

  return (
    <main
      className={cn(
        "flex flex-col min-h-screen text-foreground w-full",

        nativePlatform === "macos" && "pt-6",
      )}
    >
      {children}
    </main>
  );
}
