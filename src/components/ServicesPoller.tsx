"use client";

import { useEffect } from "react";
import { useRouter } from "~/i18n/navigation";

export default function ServicesPoller() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 2500);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
