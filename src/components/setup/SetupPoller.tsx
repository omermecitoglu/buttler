"use client";

import { useEffect } from "react";
import { useRouter } from "~/i18n/navigation";

const INTERVAL = 5_000;

/** Checks the domain again by rendering the page */
const SetupPoller = () => {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, INTERVAL);
    return () => clearInterval(interval);
  }, [router]);

  return null;
};

export default SetupPoller;
