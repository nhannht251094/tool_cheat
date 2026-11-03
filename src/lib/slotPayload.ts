import { matrixToRaw } from "./matrix";

export type SlotFormPayload = {
  serviceId: string;
  userId: string;
  matrixData: string;
  tableFormat: string;
} & Record<string, string>;

export const DEFAULT_SERVICE_ID = "9703";
export const DEFAULT_USER_ID = "game_rampusd01";
export const DEFAULT_ENDPOINT = "https://cheat.dev.enostd.gay/9703/inputed";

export function tableFormatFromMatrix(rows: number, cols: number) {
  return Array.from({ length: cols }, () => String(rows)).join(",");
}

export function defaultPowerUpSymbolCode(rows: number, cols: number) {
  return Array.from({ length: rows * cols * 2 }, () => "C3").join(",");
}

export function buildSlotFormPayload(
  matrix: string[][],
  rows: number,
  cols: number,
  formValues: Record<string, unknown>,
  tableFormatKey = "tableFormat"
): SlotFormPayload {
  // Older saved 9650 projects predate API layout mapping. Resolve at send time
  // so web requests and synced Dock forms work without reimporting user data.
  const apiFormatKey = tableFormatKey === "tableFormat" && String(formValues.serviceId) === "9650"
    ? "matrixLightningData"
    : tableFormatKey;
  const tableFormat = String(formValues.tableFormat || tableFormatFromMatrix(rows, cols));
  const dynamicTableFormat = String(formValues.dynamicTableFormat || "");
  const matrixData = matrixToRaw(matrix, tableFormat, dynamicTableFormat);
  const payload: SlotFormPayload = {
    serviceId: String(formValues.serviceId ?? DEFAULT_SERVICE_ID),
    userId: String(formValues.userId ?? DEFAULT_USER_ID),
    matrixData,
    tableFormat
  };
  if (formValues.powerUpSymbolCode != null && formValues.powerUpSymbolCode !== "") {
    payload.powerUpSymbolCode = String(formValues.powerUpSymbolCode);
  }
  const reservedKeys = new Set([
    "serviceId",
    "userId",
    "matrixData",
    "tableFormat",
    "freegameTableFormat",
    "powerUpSymbolCode"
  ]);
  if (apiFormatKey !== "tableFormat") {
    // The editor uses dynamicTableFormat internally; the game may name it differently.
    reservedKeys.add("dynamicTableFormat");
    reservedKeys.add(apiFormatKey);
    if (dynamicTableFormat) payload[apiFormatKey] = dynamicTableFormat;
  }
  Object.entries(formValues).forEach(([key, value]) => {
    if (reservedKeys.has(key) || value == null || value === "") return;
    payload[key] = String(value);
  });
  return payload;
}

export function toUrlEncoded(payload: SlotFormPayload) {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => params.set(key, value));
  return params;
}
