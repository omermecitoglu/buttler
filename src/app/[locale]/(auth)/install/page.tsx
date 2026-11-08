import { getPublicOrigin } from "@omer-x/next-utils";
import { installApp } from "~/actions/install";
import ManifestForm from "~/components/ManifestForm";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

const InstallPage = async () => {
  const publicOrigin = await getPublicOrigin();

  return (
    <Card className="max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Install Buttler</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Set up your GitHub App in one click, or enter your credentials manually below.
        </p>
      </div>
      <ManifestForm publicOrigin={publicOrigin} />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900 px-2 font-medium text-slate-500">Or configure manually</span>
        </div>
      </div>
      <form action={installApp} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="clientId">GitHub App Client ID</Label>
          <Input
            id="clientId"
            name="clientId"
            type="text"
            placeholder="e.g. Iv1.abcdef123456"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientSecret">GitHub App Client Secret</Label>
          <Input
            id="clientSecret"
            name="clientSecret"
            type="password"
            placeholder="••••••••••••••••••••••••••••••••"
          />
        </div>
        <div className="pt-2">
          <Button type="submit" variant="secondary" size="md" className="w-full">
            Complete Installation
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default InstallPage;
