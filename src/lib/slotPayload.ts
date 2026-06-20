import { matrixToRaw } from "./matrix";

export type SlotFormPayload = {
  serviceId: string;
  userId: string;
  matrixData: string;
  tableFormat: string;
  powerUpSymbolCode: string;
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
  formValues: Record<string, unknown>
): SlotFormPayload {
  const tableFormat = String(formValues.tableFormat || tableFormatFromMatrix(rows, cols));
  const matrixData = matrixToRaw(matrix, tableFormat);
  const payload: SlotFormPayload = {
    serviceId: String(formValues.serviceId ?? DEFAULT_SERVICE_ID),
    userId: String(formValues.userId ?? DEFAULT_USER_ID),
    matrixData,
    tableFormat,
    powerUpSymbolCode: String(
      formValues.powerUpSymbolCode || defaultPowerUpSymbolCode(rows, cols)
    )
  };
  const reservedKeys = new Set([
    "serviceId",
    "userId",
    "matrixData",
    "tableFormat",
    "freegameTableFormat",
    "powerUpSymbolCode"
  ]);
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
