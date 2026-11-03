import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { useStudioStore as StudioStore } from "./useStudioStore";
import { importProjectsFromJson } from "../lib/projectExchange";
import { buildSlotFormPayload } from "../lib/slotPayload";

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

function importSeparateProjects() {
  const projects = importProjectsFromJson({
    projects: [
      {
        id: "9650", uuid: "project-a", name: "Project A",
        customFields: [{ name: "onlyA", label: "A setting", defaultData: "a-default" }],
        listSavedForm: [{ id: "form-a", data: { serviceId: "9650", matrixData: "A", tableFormat: "1", onlyA: "a-value" } }]
      },
      {
        id: "9650", uuid: "project-b", name: "Project B",
        customFields: [{ name: "onlyB", label: "B setting", defaultData: "b-default" }],
        listSavedForm: [{ id: "form-b", data: { serviceId: "9650", matrixData: "K", tableFormat: "1", onlyB: "b-value" } }]
      }
    ]
  });
  useStudioStore.setState({ projects: [] });
  useStudioStore.getState().importProjects(projects);
  return projects;
}

describe("project field isolation", () => {
  it("keeps field edits and values separate for two projects using the same game", () => {
    const [projectA, projectB] = importSeparateProjects();
    const otherProject = structuredClone(useStudioStore.getState().projects[1]);
    const field = projectA.fieldConfigs.find(field => field.key === "onlyA")!;
    useStudioStore.getState().updateField(field.id, { key: "renamedA" });
    useStudioStore.getState().updateFormValue("renamedA", "updated-a");
    expect(useStudioStore.getState().projects[1]).toEqual(otherProject);

    useStudioStore.getState().setActiveProject(projectB.projectId);
    expect(useStudioStore.getState().formValues).toMatchObject({ onlyB: "b-value" });
    expect(useStudioStore.getState().formValues).not.toHaveProperty("renamedA");
    expect(useStudioStore.getState().projects[1].fieldConfigs.map(field => field.key)).not.toContain("renamedA");

    useStudioStore.getState().setActiveProject(projectA.projectId);
    expect(useStudioStore.getState().formValues.renamedA).toBe("updated-a");
    expect(useStudioStore.getState().formValues).not.toHaveProperty("onlyB");
  });

  it("loads the remaining project's field values and matrix after deleting the active project", () => {
    const [projectA, projectB] = importSeparateProjects();
    useStudioStore.getState().deleteProject(projectA.projectId);
    const state = useStudioStore.getState();
    expect(state.activeProjectId).toBe(projectB.projectId);
    const payload = buildSlotFormPayload(state.matrix, state.rows, state.cols, state.formValues, projectB.tableFormatKey);
    expect(payload).toMatchObject({ onlyB: "b-value", matrixData: "K" });
    expect(payload).not.toHaveProperty("onlyA");
  });

  it("does not reset the active project's fields when deleting an inactive project", () => {
    const [projectA, projectB] = importSeparateProjects();
    useStudioStore.getState().updateFormValue("onlyA", "edited-a");
    useStudioStore.getState().deleteProject(projectB.projectId);
    expect(useStudioStore.getState().activeProjectId).toBe(projectA.projectId);
    expect(useStudioStore.getState().formValues.onlyA).toBe("edited-a");
    expect(useStudioStore.getState().formValues).not.toHaveProperty("onlyB");
  });
});
afterAll(() => vi.unstubAllGlobals());

describe("imported project environment", () => {
  it("starts on staging and creates new projects on staging even after selecting DEV", () => {
    const initial = useStudioStore.getInitialState();
    expect(initial.apiRequest.environment).toBe("STAGING");
    expect(initial.apiRequest.endpoint).toBe("https://cheat.staging.enostd.gay/9703/inputed");
    useStudioStore.getState().updateApiRequest({ environment: "DEV" });
    useStudioStore.getState().createProject();
    const state = useStudioStore.getState();
    expect(state.apiRequest.environment).toBe("STAGING");
    expect(state.apiRequest.endpoint).toContain("https://cheat.staging.enostd.gay/");
  });

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
