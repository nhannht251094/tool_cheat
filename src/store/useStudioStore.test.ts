import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { useStudioStore as StudioStore } from "./useStudioStore";
import { importProjectsFromJson } from "../lib/projectExchange";

let useStudioStore: typeof StudioStore;
beforeAll(async () => {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key)
  });
  ({ useStudioStore } = await import("./useStudioStore"));
});
afterAll(() => vi.unstubAllGlobals());

describe("imported project environment", () => {
  it("uses staging when importing and reselecting a staging project", () => {
    const [project] = importProjectsFromJson({
      _meta: { id: "9650", environment: "staging" },
      forms: [{ id: "test", data: { matrixData: "A,K", tableFormat: "2" } }]
    });
    const [devProject] = importProjectsFromJson({
      _meta: { id: "9703", environment: "dev" },
      forms: [{ id: "dev-test", data: { matrixData: "2,3", tableFormat: "2" } }]
    });
    useStudioStore.getState().updateApiRequest({ environment: "DEV" });
    useStudioStore.getState().importProjects([project, devProject]);
    expect(useStudioStore.getState().apiRequest.environment).toBe("STAGING");
    expect(useStudioStore.getState().apiRequest.endpoint).toBe("https://cheat.staging.enostd.gay/9650/inputed");
    useStudioStore.getState().setActiveProject(devProject.projectId);
    expect(useStudioStore.getState().apiRequest.environment).toBe("DEV");
    useStudioStore.getState().setActiveProject(project.projectId);
    expect(useStudioStore.getState().apiRequest.environment).toBe("STAGING");
  });
});
