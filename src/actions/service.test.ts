import { beforeEach, describe, expect, it, vi } from "vitest";
import { MissingSecretValueError } from "~/operations/updateService";
import {
  createServiceAction,
  deleteServiceAction,
  importServices,
  redeployService,
  restartService,
  startService,
  stopService,
  triggerBuild,
  updateDevicesAction,
  updateInternetAccessAction,
  updateServiceAction,
} from "./service";

const mockGetService = vi.fn();
const mockGetDeployableService = vi.fn();
const mockCreateService = vi.fn();
const mockStartServiceContainer = vi.fn();
const mockStopServiceContainer = vi.fn();
const mockRestartServiceContainer = vi.fn();
const mockIsImagePresentLocally = vi.fn();
const mockMarkServicePulling = vi.fn();
const mockIsServiceBuilding = vi.fn();
const mockIsServicePulling = vi.fn();
const mockIsServiceDeploying = vi.fn();
const mockIsServiceDeleting = vi.fn();
const mockMarkServiceDeleting = vi.fn();
const mockAssertServiceNotDeleting = vi.fn();
const mockPullAndDeployService = vi.fn();
const mockAfter = vi.fn();
const mockFindLatestImage = vi.fn();
const mockStartBuilding = vi.fn();
const mockUpdateService = vi.fn();
const mockDeleteService = vi.fn();
const mockGetSharedVolumes = vi.fn();
const mockGetServiceRuntimeState = vi.fn();
const mockRemoveServiceContainers = vi.fn();
const mockRemoveServiceImages = vi.fn();
const mockRemoveServiceNetworks = vi.fn();
const mockRemoveLinkNetworks = vi.fn();
const mockDeleteFromReverseProxy = vi.fn();
const mockRemoveVolumes = vi.fn();
const mockSyncDomains = vi.fn();
const mockDeleteBuildLog = vi.fn();
const mockRequireAdmin = vi.fn();
const mockRefresh = vi.fn();
const mockUpdateTag = vi.fn();
const mockRedirect = vi.fn();
const mockGetInheritedVariables = vi.fn();
const mockImportServiceRecipe = vi.fn();
const mockSyncReverseProxyLinks = vi.fn();
const mockSyncReverseProxyConfig = vi.fn();

vi.mock("~/database", () => ({
  default: {},
}));

vi.mock("~/operations/getService", () => ({
  default: (...args: unknown[]) => mockGetService(...args),
}));

vi.mock("~/operations/getInheritedVariables", () => ({
  default: (...args: unknown[]) => mockGetInheritedVariables(...args),
}));

vi.mock("~/operations/getDeployableService", () => ({
  default: (...args: unknown[]) => mockGetDeployableService(...args),
}));

vi.mock("~/operations/createService", () => ({
  default: (...args: unknown[]) => mockCreateService(...args),
}));

vi.mock("~/operations/importServiceRecipe", () => ({
  default: (...args: unknown[]) => mockImportServiceRecipe(...args),
}));

vi.mock("~/operations/updateService", () => ({
  default: (...args: unknown[]) => mockUpdateService(...args),
  MissingSecretValueError: class extends Error {},
}));

vi.mock("server-only", () => ({}));

vi.mock("~/core/auth", () => ({
  requireUser: vi.fn(),
  requireAdmin: () => mockRequireAdmin() as unknown,
}));

vi.mock("~/operations/deleteService", () => ({
  default: (...args: unknown[]) => mockDeleteService(...args),
}));

vi.mock("~/operations/getSharedVolumes", () => ({
  default: (...args: unknown[]) => mockGetSharedVolumes(...args),
}));

vi.mock("~/core/cloudflare/domains", () => ({
  syncDomains: (...args: unknown[]) => mockSyncDomains(...args),
}));

vi.mock("~/core/docker/internet", () => ({
  removeServiceNetworks: (...args: unknown[]) => mockRemoveServiceNetworks(...args),
}));

vi.mock("~/core/docker/links", () => ({
  removeLinkNetworks: (...args: unknown[]) => mockRemoveLinkNetworks(...args),
  syncReverseProxyLinks: (...args: unknown[]) => mockSyncReverseProxyLinks(...args),
}));

vi.mock("~/core/nginx", () => ({
  deleteFromReverseProxy: (...args: unknown[]) => mockDeleteFromReverseProxy(...args),
  syncReverseProxyConfig: (...args: unknown[]) => mockSyncReverseProxyConfig(...args),
}));

vi.mock("~/core/docker/removal", () => ({
  removeServiceContainers: (...args: unknown[]) => mockRemoveServiceContainers(...args),
  removeServiceImages: (...args: unknown[]) => mockRemoveServiceImages(...args),
  removeVolumes: (...args: unknown[]) => mockRemoveVolumes(...args),
  isVolumeName: (name: string) => (/^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/).test(name),
}));

vi.mock("~/core/build", () => ({
  deleteBuildLog: (...args: unknown[]) => mockDeleteBuildLog(...args),
  findLatestImage: (...args: unknown[]) => mockFindLatestImage(...args),
  startBuilding: (...args: unknown[]) => mockStartBuilding(...args),
}));

vi.mock("~/core/docker/status", () => ({
  getServiceRuntimeState: (...args: unknown[]) => mockGetServiceRuntimeState(...args),
  startServiceContainer: (...args: unknown[]) => mockStartServiceContainer(...args),
  stopServiceContainer: (...args: unknown[]) => mockStopServiceContainer(...args),
  restartServiceContainer: (...args: unknown[]) => mockRestartServiceContainer(...args),
  isImagePresentLocally: (...args: unknown[]) => mockIsImagePresentLocally(...args),
  markServicePulling: (...args: unknown[]) => mockMarkServicePulling(...args),
  isServiceBuilding: (...args: unknown[]) => mockIsServiceBuilding(...args),
  isServicePulling: (...args: unknown[]) => mockIsServicePulling(...args),
  isServiceDeploying: (...args: unknown[]) => mockIsServiceDeploying(...args),
  isServiceDeleting: (...args: unknown[]) => mockIsServiceDeleting(...args),
  markServiceDeleting: (...args: unknown[]) => mockMarkServiceDeleting(...args),
  assertServiceNotDeleting: (...args: unknown[]) => mockAssertServiceNotDeleting(...args),
  pullAndDeployService: (...args: unknown[]) => mockPullAndDeployService(...args),
}));

vi.mock("next/server", () => ({
  after: (...args: unknown[]) => mockAfter(...args),
}));

vi.mock("next/cache", () => ({
  refresh: (...args: unknown[]) => mockRefresh(...args),
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

vi.mock("~/i18n/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

describe("service lifecycle server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsServiceBuilding.mockReturnValue(false);
    mockIsServicePulling.mockReturnValue(false);
  });

  const sampleService = {
    id: "srv-test",
    name: "Web Service",
    type: "dockerhub",
  };

  describe("startService", () => {
    it("starts container directly if image is already present", async () => {
      mockGetDeployableService.mockResolvedValue({
        ...sampleService,
        repository: "redis",
        branch: "alpine",
      });
      mockIsImagePresentLocally.mockResolvedValue(true);
      const res = await startService("srv-test");
      expect(mockStartServiceContainer).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
      expect(res).toEqual({ outcome: "started" });
    });

    it("marks service pulling and starts background task if image is not present", async () => {
      mockGetDeployableService.mockResolvedValue({
        ...sampleService,
        repository: "postgres",
        branch: "15",
      });
      mockIsImagePresentLocally.mockResolvedValue(false);
      const res = await startService("srv-test");
      expect(mockMarkServicePulling).toHaveBeenCalledWith("srv-test", true);
      expect(mockRefresh).toHaveBeenCalled();
      expect(res).toEqual({ outcome: "pulling" });
    });

    it("builds a github service in the background if it has no image", async () => {
      const service = { ...sampleService, type: "github", repository: "acme/app", branch: "dev" };
      mockGetDeployableService.mockResolvedValue(service);
      mockFindLatestImage.mockResolvedValue(null);
      expect(await startService("srv-test")).toEqual({ outcome: "building" });
      expect(mockStartBuilding).toHaveBeenCalledWith(service);
      expect(mockStartServiceContainer).not.toHaveBeenCalled();
    });

    it("starts a github service from its existing image", async () => {
      mockGetDeployableService.mockResolvedValue({ ...sampleService, type: "github" });
      mockFindLatestImage.mockResolvedValue("sha256:abc");
      await startService("srv-test");
      expect(mockStartServiceContainer).toHaveBeenCalled();
      expect(mockStartBuilding).not.toHaveBeenCalled();
    });

    it("throws if service is not found in database", async () => {
      mockGetDeployableService.mockResolvedValue(null);
      await expect(startService("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
      expect(mockStartServiceContainer).not.toHaveBeenCalled();
    });
  });

  describe("stopService", () => {
    it("stops container and refreshes the page", async () => {
      mockGetService.mockResolvedValue(sampleService);
      const res = await stopService("srv-test");
      expect(mockStopServiceContainer).toHaveBeenCalledWith(sampleService);
      expect(mockRefresh).toHaveBeenCalled();
      expect(res).toEqual({ outcome: "stopped" });
    });

    it("throws if service is not found in database", async () => {
      mockGetService.mockResolvedValue(null);
      await expect(stopService("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
    });
  });

  describe("restartService", () => {
    it("restarts container and refreshes the page", async () => {
      mockGetDeployableService.mockResolvedValue(sampleService);
      const res = await restartService("srv-test");
      expect(mockRestartServiceContainer).toHaveBeenCalledWith(sampleService);
      expect(mockRefresh).toHaveBeenCalled();
      expect(res).toEqual({ outcome: "restarted" });
    });

    it("throws if service is not found in database", async () => {
      mockGetDeployableService.mockResolvedValue(null);
      await expect(restartService("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
    });
  });

  describe("triggerBuild", () => {
    it("builds a github service", async () => {
      const service = { ...sampleService, type: "github" };
      mockGetDeployableService.mockResolvedValue(service);
      expect(await triggerBuild("srv-test")).toEqual({ outcome: "building" });
      expect(mockStartBuilding).toHaveBeenCalledWith(service);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("does not queue another build during a build", async () => {
      mockGetDeployableService.mockResolvedValue({ ...sampleService, type: "github" });
      mockIsServiceBuilding.mockReturnValue(true);
      expect(await triggerBuild("srv-test")).toEqual({ outcome: "building" });
      expect(mockStartBuilding).not.toHaveBeenCalled();
    });

    it.each(["dockerhub", "system"])("rejects %s services", async type => {
      mockGetDeployableService.mockResolvedValue({ ...sampleService, type });
      await expect(triggerBuild("srv-test")).rejects.toThrow("Service cannot be built: srv-test");
      expect(mockStartBuilding).not.toHaveBeenCalled();
    });

    it("throws if service is not found in database", async () => {
      mockGetDeployableService.mockResolvedValue(null);
      await expect(triggerBuild("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
    });
  });

  describe("redeployService", () => {
    it("pulls and deploys a dockerhub service after the response", async () => {
      mockGetDeployableService.mockResolvedValue(sampleService);
      expect(await redeployService("srv-test")).toEqual({ outcome: "pulling" });
      expect(mockMarkServicePulling).toHaveBeenCalledWith("srv-test", true);
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPullAndDeployService).not.toHaveBeenCalled();
      const [task] = mockAfter.mock.calls[0] as [() => Promise<void>];
      await task();
      expect(mockPullAndDeployService).toHaveBeenCalledWith(sampleService);
    });

    it("logs the errors of the background task", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockGetDeployableService.mockResolvedValue(sampleService);
      mockPullAndDeployService.mockRejectedValueOnce(new Error("no network"));
      await redeployService("srv-test");
      const [task] = mockAfter.mock.calls[0] as [() => Promise<void>];
      await expect(task()).resolves.toBeUndefined();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("does not pull again during a pull", async () => {
      mockGetDeployableService.mockResolvedValue(sampleService);
      mockIsServicePulling.mockReturnValue(true);
      expect(await redeployService("srv-test")).toEqual({ outcome: "pulling" });
      expect(mockAfter).not.toHaveBeenCalled();
    });

    it("runs the last known image of other services again", async () => {
      const service = { ...sampleService, type: "github" };
      mockGetDeployableService.mockResolvedValue(service);
      expect(await redeployService("srv-test")).toEqual({ outcome: "restarted" });
      expect(mockRestartServiceContainer).toHaveBeenCalledWith(service);
    });
  });

  describe("createServiceAction", () => {
    it("validates and creates a service with configurations and redirects", async () => {
      mockCreateService.mockReturnValue({ id: "srv-new", type: "github" });
      const formData = new FormData();
      formData.set("name", "My API Service");
      formData.set("type", "github");
      formData.set("repository", "org/repo");
      formData.set("branch", "main");
      formData.set("ports", JSON.stringify([{ external: 3000, internal: 3000 }]));
      formData.set("environmentVariables", JSON.stringify([
        { key: "NODE_ENV", value: "production" },
        { key: "NPM_TOKEN", value: "t", scope: "build", isSecret: true },
      ]));
      formData.set("volumes", JSON.stringify([{ name: "app-data", containerPath: "/data" }]));
      formData.set("sharedVariables", JSON.stringify([{ key: "API_URL", template: "http://{host}:3000" }]));
      formData.set("internetAccess", "yes");

      await createServiceAction("en", {}, formData);

      const environmentVariables = [
        { key: "NODE_ENV", value: "production", scope: "runtime", isSecret: false },
        { key: "NPM_TOKEN", value: "t", scope: "build", isSecret: true },
      ];
      expect(mockCreateService).toHaveBeenCalledWith(expect.anything(), {
        name: "My API Service",
        type: "github",
        repository: "org/repo",
        branch: "main",
        internetAccess: true,
        ports: [{ external: 3000, internal: 3000 }],
        environmentVariables,
        volumes: [{ name: "app-data", containerPath: "/data" }],
        sharedVariables: [{ key: "API_URL", template: "http://{host}:3000" }],
      });
      expect(mockStartBuilding).toHaveBeenCalledWith({
        id: "srv-new",
        type: "github",
        ports: [{ external: 3000, internal: 3000 }],
        environmentVariables,
        volumes: [{ name: "app-data", containerPath: "/data" }],
      });
      expect(mockUpdateTag).toHaveBeenCalledWith("getAllServices()");
      expect(mockRedirect).toHaveBeenCalledWith({ locale: "en", href: "/services" });
    });

    it("makes the variables of services without a build step available at runtime", async () => {
      mockCreateService.mockReturnValue({ id: "srv-dh", type: "dockerhub" });
      const formData = new FormData();
      formData.set("name", "Cache");
      formData.set("type", "dockerhub");
      formData.set("repository", "redis");
      formData.set("branch", "latest");
      formData.set("internetAccess", "no");
      formData.set("environmentVariables", JSON.stringify([
        { key: "PASSWORD", value: "p", scope: "build", isSecret: true },
      ]));

      await createServiceAction("en", {}, formData);

      expect(mockCreateService).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        environmentVariables: [{ key: "PASSWORD", value: "p", scope: "runtime", isSecret: true }],
      }));
    });

    it("rejects shared variables with the same key", async () => {
      const formData = new FormData();
      formData.set("name", "Database");
      formData.set("type", "dockerhub");
      formData.set("repository", "postgres");
      formData.set("branch", "16");
      formData.set("internetAccess", "no");
      formData.set("sharedVariables", JSON.stringify([
        { key: "DATABASE_URL", template: "a" },
        { key: "DATABASE_URL", template: "b" },
      ]));

      const errors = await createServiceAction("en", {}, formData);

      expect(errors).toMatchObject({ sharedVariables: "DUPLICATE_SHARED_VARIABLES" });
      expect(mockCreateService).not.toHaveBeenCalled();
    });

    it("returns validation errors if required fields are missing", async () => {
      const formData = new FormData();
      formData.set("name", "");
      formData.set("type", "github");
      formData.set("repository", " ");
      formData.set("branch", "");

      const errors = await createServiceAction("en", {}, formData);

      // The form maps these codes to the messages of each field
      expect(errors).toEqual({
        name: "SERVICE_NAME_REQUIRED",
        repository: "REPOSITORY_REQUIRED",
        branch: "BRANCH_REQUIRED",
        internetAccess: "INTERNET_ACCESS_REQUIRED",
      });
      expect(mockCreateService).not.toHaveBeenCalled();
    });

    it("requires a name for every volume", async () => {
      const formData = new FormData();
      formData.set("name", "Waha");
      formData.set("type", "dockerhub");
      formData.set("repository", "waha");
      formData.set("branch", "latest");
      formData.set("internetAccess", "yes");
      formData.set("volumes", JSON.stringify([{ name: " ", containerPath: "/sessions" }]));

      const errors = await createServiceAction("en", {}, formData);

      expect(errors).toEqual({ volumes: "VOLUME_NAME_REQUIRED" });
      expect(mockCreateService).not.toHaveBeenCalled();
    });

    it("rejects a volume name that Docker doesn't accept", async () => {
      const formData = new FormData();
      formData.set("name", "Waha");
      formData.set("type", "dockerhub");
      formData.set("repository", "waha");
      formData.set("branch", "latest");
      formData.set("internetAccess", "yes");
      formData.set("volumes", JSON.stringify([{ name: "Waha Sessions", containerPath: "/sessions" }]));

      const errors = await createServiceAction("en", {}, formData);

      expect(errors).toEqual({ volumes: "INVALID_VOLUME_NAME" });
      expect(mockCreateService).not.toHaveBeenCalled();
    });

    it("accepts an absolute path on the host as a volume", async () => {
      mockCreateService.mockReturnValue({ id: "srv-dh", type: "dockerhub" });
      const formData = new FormData();
      formData.set("name", "Waha");
      formData.set("type", "dockerhub");
      formData.set("repository", "waha");
      formData.set("branch", "latest");
      formData.set("internetAccess", "yes");
      formData.set("volumes", JSON.stringify([{ name: "/srv/waha sessions", containerPath: "/sessions" }]));

      await createServiceAction("en", {}, formData);

      expect(mockCreateService).toHaveBeenCalled();
    });

    it("requires a choice for internet access", async () => {
      const formData = new FormData();
      formData.set("name", "Cache");
      formData.set("type", "dockerhub");
      formData.set("repository", "redis");
      formData.set("branch", "latest");

      const errors = await createServiceAction("en", {}, formData);

      expect(errors).toEqual({ internetAccess: "INTERNET_ACCESS_REQUIRED" });
      expect(mockCreateService).not.toHaveBeenCalled();
    });

    it("creates a service without internet access", async () => {
      mockCreateService.mockReturnValue({ id: "srv-dh", type: "dockerhub" });
      const formData = new FormData();
      formData.set("name", "Cache");
      formData.set("type", "dockerhub");
      formData.set("repository", "redis");
      formData.set("branch", "latest");
      formData.set("internetAccess", "no");

      await createServiceAction("en", {}, formData);

      expect(mockCreateService).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ internetAccess: false }));
    });

    it("returns error message if createService operation throws", async () => {
      mockCreateService.mockImplementation(() => {
        throw new Error("DB error");
      });
      const formData = new FormData();
      formData.set("name", "Test Service");
      formData.set("type", "dockerhub");
      formData.set("repository", "redis");
      formData.set("branch", "alpine");
      formData.set("internetAccess", "yes");

      const res = await createServiceAction("en", {}, formData);
      expect(res).toEqual({ "[error]": "create_failed" });
    });
  });
});

describe("updateServiceAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetInheritedVariables.mockResolvedValue([]);
  });

  function createFormData() {
    const formData = new FormData();
    formData.append("name", "app");
    formData.append("repository", "redis");
    formData.append("branch", "alpine");
    formData.append("environmentVariables", JSON.stringify([
      { key: "TOKEN", value: null, scope: "both", isSecret: true },
    ]));
    return formData;
  }

  it("saves the service and updates its caches", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "dockerhub", environmentVariables: [] });
    expect(await updateServiceAction("srv", {}, createFormData())).toEqual({});
    expect(mockUpdateService).toHaveBeenCalledWith({}, "srv", {
      name: "app",
      repository: "redis",
      branch: "alpine",
      // Docker Hub services don't have a build step
      environmentVariables: [{ key: "TOKEN", value: null, scope: "runtime", isSecret: true }],
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("getAllServices()");
    expect(mockUpdateTag).toHaveBeenCalledWith("getSingleService(srv)");
    expect(mockUpdateTag).toHaveBeenCalledWith("getInheritedVariablesOfService(...)");
  });

  it("rejects a new variable with the name of an inherited one", async () => {
    mockGetInheritedVariables.mockResolvedValue([{ name: "TOKEN" }]);
    mockGetService.mockResolvedValue({ id: "srv", type: "dockerhub", environmentVariables: [] });
    expect(await updateServiceAction("srv", {}, createFormData())).toEqual({ "[error]": "inherited_variable_name" });
    expect(mockUpdateService).not.toHaveBeenCalled();
    // A variable that was saved before is kept
    mockGetService.mockResolvedValue({ id: "srv", type: "dockerhub", environmentVariables: [{ key: "TOKEN" }] });
    expect(await updateServiceAction("srv", {}, createFormData())).toEqual({});
  });

  it("leaves the parts that are not submitted untouched", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "github" });
    const formData = new FormData();
    formData.append("ports", "[]");
    expect(await updateServiceAction("srv", {}, formData)).toEqual({});
    const [, , changes] = mockUpdateService.mock.calls[0] as [unknown, unknown, Record<string, unknown>];
    expect(Object.entries(changes).filter(([, value]) => value !== undefined)).toEqual([["ports", []]]);
  });

  describe("recreating the container", () => {
    const service = { id: "srv", type: "dockerhub" };

    function createPortsFormData() {
      const formData = new FormData();
      formData.append("ports", JSON.stringify([{ external: 8080, internal: 80 }]));
      formData.append("recreate", "on");
      return formData;
    }

    beforeEach(() => {
      mockGetService.mockResolvedValue(service);
      mockGetDeployableService.mockResolvedValue(service);
      mockGetServiceRuntimeState.mockResolvedValue({ status: "running" });
    });

    it("recreates the container after the changes are saved", async () => {
      expect(await updateServiceAction("srv", {}, createPortsFormData())).toEqual({});
      expect(mockRestartServiceContainer).toHaveBeenCalledWith(service);
      expect(mockRestartServiceContainer).toHaveBeenCalledAfter(mockUpdateService);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("doesn't pass the choice on as a change", async () => {
      await updateServiceAction("srv", {}, createPortsFormData());
      const [, , changes] = mockUpdateService.mock.calls[0] as [unknown, unknown, Record<string, unknown>];
      expect(changes).not.toHaveProperty("recreate");
    });

    it("changes nothing while the service is being pulled", async () => {
      mockGetServiceRuntimeState.mockResolvedValue({ status: "pulling" });
      expect(await updateServiceAction("srv", {}, createPortsFormData())).toEqual({ "[error]": "service_busy" });
      expect(mockUpdateService).not.toHaveBeenCalled();
      expect(mockRestartServiceContainer).not.toHaveBeenCalled();
    });

    it("keeps the saved changes when the container can't be recreated", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockRestartServiceContainer.mockRejectedValue(new Error("no docker"));
      expect(await updateServiceAction("srv", {}, createPortsFormData())).toEqual({ "[error]": "recreate_failed" });
      expect(mockUpdateService).toHaveBeenCalled();
    });
  });

  it("rejects a volume name that Docker doesn't accept", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "dockerhub" });
    const formData = new FormData();
    formData.append("volumes", JSON.stringify([{ name: "Waha Sessions", containerPath: "/sessions" }]));
    expect(await updateServiceAction("srv", {}, formData)).toHaveProperty("volumes");
    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it("asks for the values of the secrets that cannot be kept", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "github", environmentVariables: [] });
    mockUpdateService.mockImplementation(() => {
      throw new MissingSecretValueError("TOKEN");
    });
    expect(await updateServiceAction("srv", {}, createFormData())).toEqual({ "[error]": "secret_value_required" });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it.each([null, { id: "srv", type: "system" }])("rejects services that cannot be edited", async service => {
    mockGetService.mockResolvedValue(service);
    expect(await updateServiceAction("srv", {}, createFormData())).toEqual({ "[error]": "update_failed" });
    expect(mockUpdateService).not.toHaveBeenCalled();
  });
});

describe("deleteServiceAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetService.mockResolvedValue({
      id: "srv",
      type: "github",
      volumes: [{ name: "data" }, { name: "cache" }, { name: "shared" }],
      domains: [{ hostname: "app.example.com" }],
    });
    mockGetServiceRuntimeState.mockResolvedValue({ status: "running" });
    mockGetSharedVolumes.mockResolvedValue(["shared"]);
    mockDeleteFromReverseProxy.mockImplementation((_id: string, remove: () => Promise<boolean>) => remove());
  });

  function submit(volumes?: string[]) {
    const formData = new FormData();
    if (volumes) formData.append("volumes", JSON.stringify(volumes));
    return deleteServiceAction("srv", "en", {}, formData);
  }

  it("deletes the service with its container and images, but keeps its volumes", async () => {
    await submit();
    expect(mockRemoveServiceContainers).toHaveBeenCalledWith("srv");
    expect(mockRemoveServiceImages).toHaveBeenCalledWith("srv");
    expect(mockRemoveVolumes).not.toHaveBeenCalled();
    expect(mockDeleteService).toHaveBeenCalledWith({}, "srv");
    expect(mockDeleteBuildLog).toHaveBeenCalledWith("srv");
    expect(mockUpdateTag).toHaveBeenCalledWith("getAllServices()");
    expect(mockUpdateTag).toHaveBeenCalledWith("getSingleService(srv)");
    expect(mockRedirect).toHaveBeenCalledWith({ locale: "en", href: "/services" });
  });

  it("removes the internet and link networks after the container", async () => {
    await submit();
    expect(mockRemoveServiceNetworks).toHaveBeenCalledWith("srv");
    expect(mockRemoveServiceNetworks).toHaveBeenCalledAfter(mockRemoveServiceContainers);
    expect(mockRemoveServiceNetworks).toHaveBeenCalledBefore(mockDeleteService);
    expect(mockRemoveLinkNetworks).toHaveBeenCalledWith("srv");
    expect(mockRemoveLinkNetworks).toHaveBeenCalledAfter(mockRemoveServiceContainers);
    expect(mockRemoveLinkNetworks).toHaveBeenCalledBefore(mockDeleteService);
  });

  it("keeps the service if its link networks can't be removed", async () => {
    mockRemoveLinkNetworks.mockRejectedValue(new Error("no docker"));
    expect(await submit()).toEqual({ "[error]": "delete_failed" });
    expect(mockDeleteService).not.toHaveBeenCalled();
  });

  it("keeps the service if Nginx can't be reloaded without its domains", async () => {
    mockDeleteFromReverseProxy.mockRejectedValue(new Error("broken"));
    expect(await submit()).toEqual({ "[error]": "delete_failed" });
    expect(mockDeleteFromReverseProxy).toHaveBeenCalledWith("srv", expect.any(Function));
    expect(mockDeleteService).not.toHaveBeenCalled();
  });

  it("withdraws its domains before they are not served anymore", async () => {
    await submit();
    expect(mockSyncDomains.mock.calls).toEqual([[{ withoutService: "srv" }], []]);
    expect(mockSyncDomains).toHaveBeenCalledBefore(mockRemoveServiceContainers);
  });

  it("makes its domains public again if it's kept", async () => {
    mockRemoveServiceImages.mockRejectedValue(new Error("boom"));
    await submit();
    expect(mockSyncDomains).toHaveBeenLastCalledWith();
    const [
      ,
      restored,
    ] = mockSyncDomains.mock.invocationCallOrder;
    expect(restored).toBeGreaterThan(mockRemoveServiceImages.mock.invocationCallOrder[0]);
  });

  it("doesn't need Cloudflare without domains", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "github", volumes: [], domains: [] });
    await submit();
    expect(mockSyncDomains).not.toHaveBeenCalled();
    expect(mockDeleteService).toHaveBeenCalled();
  });

  it("only deletes the chosen volumes", async () => {
    await submit(["data"]);
    expect(mockRemoveVolumes).toHaveBeenCalledWith(["data"]);
    expect(mockDeleteService).toHaveBeenCalled();
  });

  it("keeps all volumes if none of them is chosen", async () => {
    await submit([]);
    expect(mockRemoveVolumes).not.toHaveBeenCalled();
    expect(mockDeleteService).toHaveBeenCalled();
  });

  it("keeps the chosen volumes that are shared, or that belong to other services", async () => {
    await submit(["cache", "shared", "other"]);
    expect(mockRemoveVolumes).toHaveBeenCalledWith(["cache"]);
  });

  it("rejects invalid volumes before anything is deleted", async () => {
    const formData = new FormData();
    formData.append("volumes", "data");
    expect(await deleteServiceAction("srv", "en", {}, formData)).toEqual({ volumes: "INVALID_VOLUMES" });
    expect(mockRemoveServiceContainers).not.toHaveBeenCalled();
  });

  it("ignores a build log that can't be deleted", async () => {
    mockDeleteBuildLog.mockRejectedValue(new Error("EACCES"));
    await submit();
    expect(mockRedirect).toHaveBeenCalled();
  });

  it("rejects the users who are not the admin", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("403"));
    await expect(submit(["data"])).rejects.toThrow("403");
    expect(mockRemoveServiceContainers).not.toHaveBeenCalled();
    expect(mockDeleteService).not.toHaveBeenCalled();
  });

  it.each([null, { id: "srv", type: "system", volumes: [] }])("rejects services that cannot be deleted", async service => {
    mockGetService.mockResolvedValue(service);
    expect(await submit()).toEqual({ "[error]": "delete_failed" });
    expect(mockRemoveServiceContainers).not.toHaveBeenCalled();
    expect(mockDeleteService).not.toHaveBeenCalled();
  });

  it.each(["building", "pulling"])("rejects services that are %s", async status => {
    mockGetServiceRuntimeState.mockResolvedValue({ status });
    expect(await submit()).toEqual({ "[error]": "service_busy" });
    expect(mockRemoveServiceContainers).not.toHaveBeenCalled();
  });

  it.each([
    mockIsServiceBuilding,
    mockIsServicePulling,
    mockIsServiceDeploying,
    mockIsServiceDeleting,
  ])("rejects services that became busy while their state was read", async mock => {
    mock.mockReturnValue(true);
    expect(await submit()).toEqual({ "[error]": "service_busy" });
    expect(mockMarkServiceDeleting).not.toHaveBeenCalled();
    expect(mockRemoveServiceContainers).not.toHaveBeenCalled();
  });

  it("marks the service as being deleted for as long as the deletion goes on", async () => {
    await submit(["data"]);
    expect(mockMarkServiceDeleting.mock.calls).toEqual([["srv", true], ["srv", false]]);
    expect(mockMarkServiceDeleting).toHaveBeenCalledBefore(mockSyncDomains);
    expect(mockMarkServiceDeleting.mock.invocationCallOrder[1]).toBeGreaterThan(mockDeleteService.mock.invocationCallOrder[0]);
  });

  it("removes the mark if the deletion fails", async () => {
    mockRemoveVolumes.mockRejectedValue(new Error("boom"));
    expect(await submit(["data"])).toEqual({ "[error]": "delete_failed" });
    expect(mockMarkServiceDeleting).toHaveBeenLastCalledWith("srv", false);
  });

  it.each([
    mockRemoveServiceContainers,
    mockRemoveServiceImages,
    mockRemoveVolumes,
  ])("keeps the service if Docker fails", async mock => {
    mock.mockRejectedValue(new Error("boom"));
    expect(await submit(["data"])).toEqual({ "[error]": "delete_failed" });
    expect(mockDeleteService).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe("updateInternetAccessAction", () => {
  const service = { id: "srv", type: "dockerhub" };

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetService.mockResolvedValue(service);
    mockGetDeployableService.mockResolvedValue(service);
    mockGetServiceRuntimeState.mockResolvedValue({ status: "running" });
  });

  function createFormData(internetAccess: string, recreate = false) {
    const formData = new FormData();
    formData.set("internetAccess", internetAccess);
    if (recreate) formData.set("recreate", "on");
    return formData;
  }

  it("saves the choice without touching the container", async () => {
    expect(await updateInternetAccessAction("srv", {}, createFormData("no"))).toEqual({ "[success]": "saved" });
    expect(mockUpdateService).toHaveBeenCalledWith({}, "srv", { internetAccess: false });
    expect(mockUpdateTag).toHaveBeenCalledWith("getSingleService(srv)");
    expect(mockRestartServiceContainer).not.toHaveBeenCalled();
  });

  it("recreates the container after the choice is saved", async () => {
    expect(await updateInternetAccessAction("srv", {}, createFormData("yes", true))).toEqual({ "[success]": "recreated" });
    expect(mockUpdateService).toHaveBeenCalledWith({}, "srv", { internetAccess: true });
    expect(mockRestartServiceContainer).toHaveBeenCalledWith(service);
    expect(mockRestartServiceContainer).toHaveBeenCalledAfter(mockUpdateService);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("changes nothing while the service is being built", async () => {
    mockGetServiceRuntimeState.mockResolvedValue({ status: "building" });
    expect(await updateInternetAccessAction("srv", {}, createFormData("no", true))).toEqual({ "[error]": "service_busy" });
    expect(mockUpdateService).not.toHaveBeenCalled();
    expect(mockRestartServiceContainer).not.toHaveBeenCalled();
  });

  it("keeps the saved choice when the container can't be recreated", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockRestartServiceContainer.mockRejectedValue(new Error("no docker"));
    expect(await updateInternetAccessAction("srv", {}, createFormData("no", true))).toEqual({ "[error]": "recreate_failed" });
    expect(mockUpdateService).toHaveBeenCalled();
  });

  it("requires a choice", async () => {
    const errors = await updateInternetAccessAction("srv", {}, new FormData());
    expect(errors).toHaveProperty("internetAccess");
    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it("refuses system services", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "system" });
    expect(await updateInternetAccessAction("srv", {}, createFormData("no"))).toEqual({ "[error]": "update_failed" });
    expect(mockUpdateService).not.toHaveBeenCalled();
  });
});

describe("updateDevicesAction", () => {
  const service = { id: "srv", type: "dockerhub" };

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetService.mockResolvedValue(service);
    mockGetDeployableService.mockResolvedValue(service);
    mockGetServiceRuntimeState.mockResolvedValue({ status: "running" });
  });

  function createFormData(devices: string, recreate = false) {
    const formData = new FormData();
    formData.set("devices", devices);
    if (recreate) formData.set("recreate", "on");
    return formData;
  }

  it("saves the device kinds without touching the container", async () => {
    expect(await updateDevicesAction("srv", {}, createFormData('["usb-printer"]'))).toEqual({ "[success]": "saved" });
    expect(mockUpdateService).toHaveBeenCalledWith({}, "srv", { devices: ["usb-printer"] });
    expect(mockUpdateTag).toHaveBeenCalledWith("getSingleService(srv)");
    expect(mockRestartServiceContainer).not.toHaveBeenCalled();
  });

  it("removes every device when none is chosen", async () => {
    expect(await updateDevicesAction("srv", {}, createFormData("[]"))).toEqual({ "[success]": "saved" });
    expect(mockUpdateService).toHaveBeenCalledWith({}, "srv", { devices: [] });
  });

  it("recreates the container after the devices are saved", async () => {
    expect(await updateDevicesAction("srv", {}, createFormData('["usb-printer"]', true))).toEqual({ "[success]": "recreated" });
    expect(mockRestartServiceContainer).toHaveBeenCalledWith(service);
    expect(mockRestartServiceContainer).toHaveBeenCalledAfter(mockUpdateService);
  });

  it("changes nothing while the service is being built", async () => {
    mockGetServiceRuntimeState.mockResolvedValue({ status: "building" });
    expect(await updateDevicesAction("srv", {}, createFormData("[]", true))).toEqual({ "[error]": "service_busy" });
    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it("refuses unknown device kinds", async () => {
    const errors = await updateDevicesAction("srv", {}, createFormData('["camera"]'));
    expect(errors).toHaveProperty("devices");
    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it("refuses system services", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "system" });
    expect(await updateDevicesAction("srv", {}, createFormData("[]"))).toEqual({ "[error]": "update_failed" });
    expect(mockUpdateService).not.toHaveBeenCalled();
  });
});

describe("importServices", () => {
  const service = {
    id: "old-id",
    name: "db",
    type: "dockerhub",
    repository: "postgres",
    branch: "latest",
    internetAccess: true,
    ports: [],
    volumes: [],
    environmentVariables: [],
    domains: [],
    sharedVariables: [],
  };

  function file(services: object[] = [service], version: unknown = 1) {
    return JSON.stringify({ version, services, links: [] });
  }

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetDeployableService.mockImplementation((_db: unknown, id: string) => Promise.resolve({ id, type: "dockerhub" }));
  });

  it("rejects the users who are not the admin", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("403"));
    await expect(importServices(file())).rejects.toThrow("403");
    expect(mockImportServiceRecipe).not.toHaveBeenCalled();
  });

  it.each(["not json", "null", JSON.stringify({ version: 1, services: [{ name: "db" }], links: [] })])(
    "rejects a file that isn't an export",
    async content => {
      expect(await importServices(content)).toEqual({ status: "invalid" });
      expect(mockImportServiceRecipe).not.toHaveBeenCalled();
    },
  );

  it("rejects the files of other versions", async () => {
    expect(await importServices(file([service], 2))).toEqual({ status: "unsupported_version" });
    expect(mockImportServiceRecipe).not.toHaveBeenCalled();
  });

  it("lists the conflicts without deploying anything", async () => {
    const conflicts = [{ type: "name", name: "db" }];
    mockImportServiceRecipe.mockResolvedValue({ conflicts });
    expect(await importServices(file())).toEqual({ status: "conflicts", conflicts });
    expect(mockMarkServicePulling).not.toHaveBeenCalled();
    expect(mockStartBuilding).not.toHaveBeenCalled();
  });

  it("only deploys the services without empty secrets", async () => {
    mockImportServiceRecipe.mockResolvedValue({ services: [
      { id: "db-id", name: "db", hasSecrets: true },
      { id: "cache-id", name: "cache", hasSecrets: false },
    ] });

    expect(await importServices(file())).toEqual({ status: "imported", deployed: ["cache"], waiting: ["db"] });
    expect(mockMarkServicePulling).toHaveBeenCalledExactlyOnceWith("cache-id", true);
    expect(mockSyncReverseProxyLinks).not.toHaveBeenCalled();
    expect(mockUpdateTag).toHaveBeenCalledWith("getAllServices()");
  });

  it("serves the imported domains even if the reverse proxy can't be reloaded", async () => {
    mockImportServiceRecipe.mockResolvedValue({ services: [{ id: "db-id", name: "db", hasSecrets: false }] });
    mockSyncReverseProxyConfig.mockRejectedValue(new Error("reload failed"));

    const result = await importServices(file([{ ...service, domains: [{ hostname: "db.example.com", port: 5432 }] }]));

    expect(result).toEqual({ status: "imported", deployed: ["db"], waiting: [] });
    expect(mockSyncReverseProxyLinks).toHaveBeenCalled();
    expect(mockSyncDomains).toHaveBeenCalled();
  });
});
