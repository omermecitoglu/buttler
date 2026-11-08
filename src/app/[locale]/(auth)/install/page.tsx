import { installApp } from "~/actions/install";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

const InstallPage = () => (
  <Card className="max-w-md">
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">Install Buttler</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Configure your installation to get started. You can configure GitHub OAuth credentials now or set them up later.
      </p>
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
        <Button type="submit" size="md" className="w-full">
          Complete Installation
        </Button>
      </div>
    </form>
  </Card>
);

export default InstallPage;
