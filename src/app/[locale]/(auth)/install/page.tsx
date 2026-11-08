import { BaseButton } from "@omer-x/tailwind-ui-kit/button";
import { installApp } from "~/actions/install";

const InstallPage = () => (
  <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900/60 p-8 shadow-2xl backdrop-blur-sm">
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-white">Install Buttler</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Configure your installation to get started. You can configure GitHub OAuth credentials now or set them up later.
      </p>
    </div>
    <form action={installApp} className="space-y-4">
      <div>
        <label htmlFor="clientId" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
          GitHub App Client ID
        </label>
        <input
          id="clientId"
          name="clientId"
          type="text"
          placeholder="e.g. Iv1.abcdef123456"
          className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="clientSecret" className="block text-xs font-medium uppercase tracking-wider text-neutral-400">
          GitHub App Client Secret
        </label>
        <input
          id="clientSecret"
          name="clientSecret"
          type="password"
          placeholder="••••••••••••••••••••••••••••••••"
          className="mt-1.5 w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
        />
      </div>
      <div className="pt-2">
        <BaseButton
          type="submit"
          size="md"
          className="w-full justify-center rounded-lg bg-neutral-100 font-medium text-neutral-900 hover:bg-white focus-visible:outline-neutral-300"
        >
          Complete Installation
        </BaseButton>
      </div>
    </form>
  </div>
);

export default InstallPage;
