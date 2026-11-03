import { describe, expect, it } from "vitest";
import { buildSlotFormPayload } from "./slotPayload";

describe("API mega format mapping", () => {
  const values = {
    serviceId: "9650", userId: "test-user", tableFormat: "4,4",
    dynamicTableFormat: "22,121", matrixLightningData: "1111,1111"
  };
  const matrix = [["A", "2"], ["A", "K"], ["3", "K"], ["3", "4"]];

  it("sends the current mega layout under the configured API key", () => {
    const payload = buildSlotFormPayload(matrix, 4, 2, values, "matrixLightningData");
    expect(payload.matrixData).toBe("A,3,2,K,4");
    expect(payload.matrixLightningData).toBe("22,121");
    expect(payload).not.toHaveProperty("dynamicTableFormat");
    expect(payload).not.toHaveProperty("matrix");
  });

  it("keeps the existing payload contract for projects without a mapping", () => {
    expect(buildSlotFormPayload(matrix, 4, 2, { ...values, serviceId: "9703" })).toMatchObject({
      tableFormat: "4,4", dynamicTableFormat: "22,121", matrixLightningData: "1111,1111"
    });
  });

  it.each([undefined, "tableFormat"])(
    "sends the 9650 API layout for an old project with mapping %s",
    (mapping) => {
      const payload = buildSlotFormPayload(matrix, 4, 2, values, mapping);
      expect(payload.matrixLightningData).toBe("22,121");
      expect(payload.matrixData).toBe("A,3,2,K,4");
      expect(payload).not.toHaveProperty("dynamicTableFormat");
    }
  );

  it("preserves an explicit custom layout mapping", () => {
    const { matrixLightningData: _stale, ...currentValues } = values;
    expect(buildSlotFormPayload(matrix, 4, 2, currentValues, "customLayout")).toMatchObject({
      customLayout: "22,121", matrixData: "A,3,2,K,4"
    });
  });
});
