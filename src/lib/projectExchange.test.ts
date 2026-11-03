import { describe, expect, it } from "vitest";
import { exportProjectsToJson, importProjectsFromJson } from "./projectExchange";
import { buildSlotFormPayload } from "./slotPayload";

// Same export structure and representative values as the 9650 forms export.
const snapshotExport = {
  version: 1,
  project: { id: "9650", uuid: "project-9650", name: "9650" },
  projectSnapshot: {
    id: "9650",
    uuid: "project-9650",
    name: "9650",
    environment: "staging",
    userId: "",
    defaultTableFormat: "4,5,5,5,5,4",
    defaultDynamicFormat: "1111,11111,11111,11111,11111,1111",
    tableFormatKey: "matrixLightningData",
    customFields: [{ name: "userId", type: "text", defaultData: "game_", isRequired: true }]
  },
  forms: [
    {
      uuid: "normal-form",
      name: "No Win",
      formData: {
        tableFormat: "4,5,5,5,5,4",
        dynamicTableFormat: "1111,11111,11111,11111,11111,1111",
        stackedTypeMode: "2",
        jackpotTypeRight: "1",
        matrix: "2,2,3,2,3,3,3,3,3,4,4,4,4,4,5,2,2,2,2,6,6,K1,6,2,7,7,7,7"
      },
      createdAt: 100,
      updatedAt: 200
    },
    {
      uuid: "mega-form",
      name: "Free game 2",
      formData: {
        tableFormat: "4,5,5,5,5,4",
        dynamicTableFormat: "1111,11111,11111,11111,11111,1111",
        matrixLightningData: "112,1112,1112,1112,1112,112",
        matrix: "A,2,2,3,A,3,3,4,A,4,4,5,5,5,5,6,6,6,6,7,4,4",
        powerUpSymbolCode: "2,K1"
      }
    },
    { uuid: "deleted-form", name: "Deleted", formData: { matrix: "8" }, deletedAt: 300 }
  ]
};

describe("snapshot forms import", () => {
  it("keeps the game, staging endpoint, form identity and original matrix", () => {
    const [project] = importProjectsFromJson(snapshotExport);
    expect(project.serviceId).toBe("9650");
    expect(project.uuid).toBe("project-9650");
    expect(project.endpoint).toBe("https://cheat.staging.enostd.gay/9650/inputed");
    const preset = project.presets[0];
    expect(preset.id).toBe("normal-form");
    expect([preset.rows, preset.cols]).toEqual([5, 6]);
    expect(preset.createdAt).toBe(100);
    expect(buildSlotFormPayload(preset.cells, preset.rows, preset.cols, preset.formValues!)).toMatchObject({
      serviceId: "9650",
      matrixData: "2,2,3,2,3,3,3,3,3,4,4,4,4,4,5,2,2,2,2,6,6,K1,6,2,7,7,7,7"
    });
  });

  it("does not resurrect deleted forms", () => {
    expect(importProjectsFromJson(snapshotExport)[0].presets.map(preset => preset.id))
      .toEqual(["normal-form", "mega-form"]);
  });

  it("uses the explicit API mega format to decode compressed matrix symbols", () => {
    const [project] = importProjectsFromJson(snapshotExport);
    const preset = project.presets[1];
    expect(preset.formValues?.dynamicTableFormat).toBe("112,1112,1112,1112,1112,112");
    expect(buildSlotFormPayload(preset.cells, preset.rows, preset.cols, preset.formValues!).matrixData)
      .toBe("A,2,2,3,A,3,3,4,A,4,4,5,5,5,5,6,6,6,6,7,4,4");
    expect(preset.formValues?.powerUpSymbolCode).toBe("2,K1");
  });

  it("leaves an unspecified user ID empty instead of choosing another account", () => {
    const [project] = importProjectsFromJson(snapshotExport);
    expect(project.fieldConfigs.find(field => field.key === "userId")?.defaultValue).toBe("");
  });

  it("does not inherit optional cheat values from a different saved form", () => {
    const [project] = importProjectsFromJson(snapshotExport);
    const preset = project.presets[1];
    const values = {
      ...Object.fromEntries(project.fieldConfigs.map(field => [field.key, field.defaultValue])),
      ...preset.formValues
    };
    const payload = buildSlotFormPayload(preset.cells, preset.rows, preset.cols, values, project.tableFormatKey);
    expect(payload).not.toHaveProperty("stackedTypeMode");
    expect(payload).not.toHaveProperty("jackpotTypeRight");
    expect(payload.powerUpSymbolCode).toBe("2,K1");
  });

  it("preserves the API format mapping when exported and imported again", () => {
    const [project] = importProjectsFromJson(exportProjectsToJson(importProjectsFromJson(snapshotExport)));
    expect(project.tableFormatKey).toBe("matrixLightningData");
    expect(project.presets[1].formValues?.dynamicTableFormat).toBe("112,1112,1112,1112,1112,112");
  });

  it("continues to import the existing saved-forms format", () => {
    const [project] = importProjectsFromJson({
      _meta: { id: "9703", environment: "dev" },
      forms: [{ id: "legacy", data: { matrixData: "A,K,2,3", tableFormat: "2,2" } }]
    });
    expect(project.serviceId).toBe("9703");
    expect(project.endpoint).toBe("https://cheat.dev.enostd.gay/9703/inputed");
    expect(project.presets[0].cells).toEqual([["A", "2"], ["K", "3"]]);
  });
});

describe("imported field ownership", () => {
  it("keeps two projects of the same game separate in a saved-forms export", () => {
    const projects = importProjectsFromJson({
      _meta: {
        id: "9650",
        customFields: [{ name: "onlyA", label: "A setting" }, { name: "onlyB", label: "B setting" }]
      },
      forms: [
        { id: "a", projectId: "project-a", projectName: "Project A", data: { serviceId: "9650", matrixData: "A", tableFormat: "1", onlyA: "a-value" } },
        { id: "b", projectId: "project-b", projectName: "Project B", data: { serviceId: "9650", matrixData: "K", tableFormat: "1", onlyB: "b-value" } }
      ]
    });
    expect(projects).toHaveLength(2);
    expect(projects.map(project => project.serviceId)).toEqual(["9650", "9650"]);
    expect(projects.map(project => project.name)).toEqual(["Project A", "Project B"]);
    expect(projects[0].fieldConfigs.map(field => field.key)).toContain("onlyA");
    expect(projects[0].fieldConfigs.map(field => field.key)).not.toContain("onlyB");
    expect(projects[1].fieldConfigs.map(field => field.key)).toContain("onlyB");
    expect(projects[1].fieldConfigs.map(field => field.key)).not.toContain("onlyA");
    expect(new Set(projects.map(project => project.projectId)).size).toBe(2);
  });

  it("scopes shared import metadata to the forms of each game", () => {
    const projects = importProjectsFromJson({
      _meta: {
        fieldsConfig: { onlyA: { defaultData: "a" }, onlyB: { defaultData: "b" } },
        customFields: [{ name: "onlyA" }, { name: "onlyB" }]
      },
      forms: [
        { id: "a", data: { serviceId: "9650", matrixData: "A", tableFormat: "1", onlyA: "a-value" } },
        { id: "b", data: { serviceId: "9703", matrixData: "K", tableFormat: "1", onlyB: "b-value" } }
      ]
    });
    expect(projects[0].fieldConfigs.map(field => field.key)).not.toContain("onlyB");
    expect(projects[1].fieldConfigs.map(field => field.key)).not.toContain("onlyA");
  });

  it("uses the envelope game ID when forms carry project IDs without serviceId", () => {
    const projects = importProjectsFromJson({
      _meta: { id: "9650" },
      forms: [
        { id: "a", projectId: "project-a", data: { matrixData: "A", tableFormat: "1", onlyA: "a" } },
        { id: "b", projectId: "project-b", data: { matrixData: "K", tableFormat: "1", onlyB: "b" } }
      ]
    });
    expect(projects).toHaveLength(2);
    expect(projects.map(project => project.endpoint)).toEqual([
      "https://cheat.staging.enostd.gay/9650/inputed",
      "https://cheat.staging.enostd.gay/9650/inputed"
    ]);
    const roundTrip = importProjectsFromJson(exportProjectsToJson(projects));
    expect(roundTrip.map(project => project.uuid)).toEqual(["project-a", "project-b"]);
    expect(roundTrip[0].fieldConfigs.map(field => field.key)).not.toContain("onlyB");
    expect(roundTrip[1].fieldConfigs.map(field => field.key)).not.toContain("onlyA");
  });

  it("still recognizes numeric projectId as a game ID in legacy form exports", () => {
    const projects = importProjectsFromJson({
      forms: [
        { id: "a", projectId: "9650", data: { matrixData: "A", tableFormat: "1" } },
        { id: "b", data: { projectId: "9703", matrixData: "K", tableFormat: "1" } }
      ]
    });
    expect(projects.map(project => project.serviceId)).toEqual(["9650", "9703"]);
  });
});
