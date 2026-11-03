import { describe, expect, it } from "vitest";
import { importProjectsFromJson, importProjectsFromJsonFile } from "./projectExchange";
import { buildSlotFormPayload } from "./slotPayload";

const response = (data: Record<string, unknown>, game = "9650") => ({
  [game]: { data: { id: "same-player-id", sId: game, mx0: ["A", "K1-4", "3"], fmt: ["2", "11"], ...data } }
});

describe("game response export import", () => {
  it("defaults to staging while retaining an explicit DEV selection", () => {
    const file = [[response({ s: 1 })]];
    expect(importProjectsFromJson(file)[0].endpoint).toBe("https://cheat.staging.enostd.gay/9650/inputed");
    expect(importProjectsFromJson(file, { environment: "DEV" })[0].endpoint).toBe("https://cheat.dev.enostd.gay/9650/inputed");
  });

  it("creates ordered forms with unique IDs, original matrix and mega layout", () => {
    const [project] = importProjectsFromJson([[
      response({ s: 1, nm: 8, mx: ["9", "9", "9"], wallet: [{ amount: 999 }] }),
      response({ s: 8, ss: 81, nm: 2 }),
      response({ s: 2, nm: 1 }),
      response({ s: 8, ss: 82 })
    ]]);
    expect(project.serviceId).toBe("9650");
    expect(project.tableFormatKey).toBe("matrixLightningData");
    expect(project.presets).toHaveLength(4);
    expect(new Set(project.presets.map(preset => preset.id)).size).toBe(4);
    expect(project.presets.map(preset => preset.formValues?.stackedTypeMode)).toEqual(["1", "1", "2", "2"]);
    expect(project.presets.map(preset => preset.tableType)).toEqual(["normal", "normal", "free", "free"]);
    const first = project.presets[0];
    expect([first.rows, first.cols]).toEqual([2, 2]);
    expect(first.formValues?.tableFormat).toBe("2,2");
    const payload = buildSlotFormPayload(first.cells, first.rows, first.cols, first.formValues!, project.tableFormatKey);
    expect(payload).toEqual({
      serviceId: "9650", userId: "", matrixData: "A,K1-4,3", tableFormat: "2,2",
      matrixLightningData: "2,11", stackedTypeMode: "1"
    });
    expect(project.fieldConfigs.map(field => field.key)).not.toContain("wallet");
    expect(project.fieldConfigs.map(field => field.key)).not.toContain("id");
  });

  it("uses the filename and selected environment when importing a real file", async () => {
    const file = new File([JSON.stringify([[response({ s: 1 })]])], "[9650-HRHM] Tutorial_USD.json", { type: "application/json" });
    const [project] = await importProjectsFromJsonFile(file, { environment: "STAGING" });
    expect(project.name).toBe("[9650-HRHM] Tutorial_USD");
    expect(project.endpoint).toBe("https://cheat.staging.enostd.gay/9650/inputed");
    expect(project.presets[0].name).toContain("01");
  });

  it("keeps separate batches and games in separate projects and falls back to mx", () => {
    const projects = importProjectsFromJson([
      [response({ s: 1 }), response({ s: 2 }, "9703")],
      [response({ mx0: undefined, mx: ["2", "4", "5"], s: 1 })]
    ]);
    expect(projects.map(project => project.serviceId)).toEqual(["9650", "9703", "9650"]);
    expect(new Set(projects.map(project => project.projectId)).size).toBe(3);
    expect(projects.map(project => project.presets.length)).toEqual([1, 1, 1]);
    expect(projects[2].presets[0].formValues?.matrixData).toBe("2,4,5");
  });

  it("rejects a matrix/layout mismatch instead of silently padding or losing symbols", () => {
    expect(() => importProjectsFromJson([[response({ mx0: ["A"] })]]))
      .toThrow(/response 1.*matrix.*3.*1/i);
  });

  it("accepts a flat response list and keeps game-specific fields separate", () => {
    const projects = importProjectsFromJson([response({ s: 1 }), response({ s: 2 }, "9703")]);
    expect(projects).toHaveLength(2);
    expect(projects[0].fieldConfigs.map(field => field.key)).toContain("stackedTypeMode");
    expect(projects[1].fieldConfigs.map(field => field.key)).not.toContain("stackedTypeMode");
    expect(projects[0].name).not.toBe(projects[1].name);
  });

  it.each([
    [{ fmt: ["20", "11"] }, /fmt/i],
    [{ sId: "9703" }, /game ID/i]
  ])("rejects an invalid response without guessing its layout or game", (data, message) => {
    expect(() => importProjectsFromJson([[response(data)]])).toThrow(message);
  });
});
