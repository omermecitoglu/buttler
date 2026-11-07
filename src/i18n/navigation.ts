import { notFound, redirect as redirectToOutside, unauthorized } from "next/navigation";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

export { redirectToOutside, notFound, unauthorized };
