import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const backgroundSource = readFileSync(new URL("../../extension/background.js", import.meta.url), "utf8");

function startBackground(initialStorage) {
  const storage = structuredClone(initialStorage);
  const requests = [];
  let listener;
  runInNewContext(backgroundSource, {
    URL,
    URLSearchParams,
    chrome: {
      runtime: {
        onInstalled: { addListener: () => undefined },
        onMessage: { addListener: (handler) => { listener = handler; } }
      },
      storage: {
        local: {
          get: async (defaults) => Object.fromEntries(
            Object.entries(defaults).map(([key, value]) => [key, key in storage ? storage[key] : value])
          ),
          set: async (patch) => { Object.assign(storage, patch); }
        }
      },
      tabs: { query: async () => [] }
    },
    fetch: async (endpoint, options) => {
      requests.push({ endpoint, payload: Object.fromEntries(options.body) });
      return { ok: true, status: 200, text: async () => "OK" };
    }
  });
  return {
    requests,
    dispatch: (message) => new Promise(resolve => listener(message, {}, resolve))
  };
}

const selectedConfig = {
  endpoint: "https://cheat.staging.enostd.gay/9650/inputed",
  serviceId: "9650",
  userId: "test-user",
  currency: "USD",
  matrixData: "2,3,A,K1",
  tableFormat: "2,2",
  matrixLightningData: "11,11",
  stackedTypeMode: "1"
};

describe("Dock extension request payload", () => {
  it("does not inject default or stale refill into a form that omits refill", async () => {
    const background = startBackground({
      currentProjectId: "9650",
      currentFormId: "normal",
      powerUpSymbolCode: "OLD,REFILL",
      formsByProject: { "9650": [{ id: "normal", config: selectedConfig }] }
    });
    await background.dispatch({ type: "SEND_FORM" });
    expect(background.requests[0].payload).not.toHaveProperty("powerUpSymbolCode");
    expect(background.requests[0].payload).toEqual({
      serviceId: "9650", userId: "test-user", currency: "USD", matrixData: "2,3,A,K1",
      tableFormat: "2,2", matrixLightningData: "11,11", stackedTypeMode: "1"
    });
    expect(background.requests[0].endpoint).toBe("https://cheat.staging.enostd.gay/9650/inputed");
  });

  it("clears the previous form's refill when selecting a form without one", async () => {
    const background = startBackground({});
    await background.dispatch({
      type: "SAVE_FORMS", currentProjectId: "9650", currentFormId: "refill",
      forms: [
        { id: "refill", config: { ...selectedConfig, powerUpSymbolCode: "2,K1" } },
        { id: "normal", config: selectedConfig }
      ]
    });
    await background.dispatch({ type: "SEND_FORM" });
    expect(background.requests[0].payload.powerUpSymbolCode).toBe("2,K1");
    await background.dispatch({ type: "SELECT_FORM", id: "normal" });
    await background.dispatch({ type: "SEND_FORM" });
    expect(background.requests[1].payload).not.toHaveProperty("powerUpSymbolCode");
  });

  it("keeps the Dock user override while preserving the selected form's API fields", async () => {
    const background = startBackground({
      dockUserId: "dock-user",
      currentFormId: "normal",
      forms: [{ id: "normal", config: { ...selectedConfig, powerUpSymbolCode: "9,K2" } }]
    });
    await background.dispatch({ type: "SEND_FORM" });
    expect(background.requests[0].payload).toMatchObject({
      userId: "dock-user", matrixLightningData: "11,11", powerUpSymbolCode: "9,K2", stackedTypeMode: "1"
    });
  });
});
