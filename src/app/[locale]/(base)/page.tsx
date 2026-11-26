import { Suspense } from "react";
import Authorized from "~/components/auth/Authorized";
import HomeGraph from "~/components/home/HomeGraph";

export default function(_page: PageProps<"/[locale]">) {
  return (
    <Suspense fallback={null}>
      <Authorized>
        <HomeGraph />
      </Authorized>
    </Suspense>
  );
}
