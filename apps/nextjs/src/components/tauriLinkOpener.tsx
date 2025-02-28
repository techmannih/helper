"use client";

import { openUrl } from "@tauri-apps/plugin-opener";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getTauriPlatform } from "@/components/useNativePlatform";

export function TauriLinkOpener() {
  const router = useRouter();

  useEffect(() => {
    if (!getTauriPlatform()) return;

    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      if (anchor.getAttribute("target") === "_blank") {
        const href = anchor.getAttribute("href");
        if (!href) return;

        const url = new URL(href, window.location.origin);

        // Open links relevant to the current origin in the app window
        if (url.origin === window.location.origin) {
          router.push(`${url.pathname}${url.search}`);
        } else {
          event.preventDefault();
          openUrl(url.toString());
        }
      }
    };

    document.addEventListener("click", handleLinkClick);

    return () => {
      document.removeEventListener("click", handleLinkClick);
    };
  }, []);

  return null;
}

export default TauriLinkOpener;
