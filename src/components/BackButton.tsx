"use client";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons/faChevronLeft";
import ActionButton from "@omer-x/bs-ui-kit/ActionButton";
import LinkButton from "@omer-x/bs-ui-kit/LinkButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type BackButtonProps = {
  fallback: string,
};

const BackButton = ({
  fallback,
}: BackButtonProps) => {
  const router = useRouter();
  const [usingFallback, setUsingFallback] = useState(true);

  useEffect(() => {
    const referredByOrigin = document.referrer.startsWith(window.location.origin);
    setUsingFallback(!referredByOrigin || window.history.length < 2);
  }, []);

  return usingFallback ? (
    <LinkButton
      as={Link}
      variant="secondary"
      icon={faChevronLeft}
      text="Back"
      href={fallback}
      size="sm"
    />
  ) : (
    <ActionButton
      variant="secondary"
      icon={faChevronLeft}
      text="Back"
      onClick={router.back}
      size="sm"
    />
  );
};

export default BackButton;
