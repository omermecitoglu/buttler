import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { getTranslations } from "next-intl/server";
import type { SetupProgress } from "~/core/setup-progress";

const steps = ["cloudflare", "domain", "github", "login"] as const;

export type SetupStepsProps = {
  current: SetupProgress["step"],
};

const SetupSteps = async ({ current }: SetupStepsProps) => {
  const t = await getTranslations("InstallPage.steps");
  const currentIndex = steps.indexOf(current);
  return (
    <ol className="mb-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
      {steps.map((step, index) => (
        <li
          key={step}
          aria-current={index === currentIndex ? "step" : undefined}
          className={cn(
            "text-slate-500",
            index < currentIndex && "text-emerald-400",
            index === currentIndex && "font-semibold text-slate-100",
          )}
        >
          {t("item", { number: index + 1, name: t(step) })}
        </li>
      ))}
    </ol>
  );
};

export default SetupSteps;
