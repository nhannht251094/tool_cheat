import { createUuid } from "./id";
import { DEFAULT_ENVIRONMENT } from "./apiEndpoint";
import type { Environment } from "../types/studio";

export type ProjectImportOptions = {
  environment?: Environment;
  sourceName?: string;
};

type ResponseForm = {
  id: string;
  name: string;
  tableType: string;
  data: Record<string, unknown>;
};

type ResponseProject = {
  id: string;
  uuid: string;
  name: string;
  environment: Environment;
  tableFormatKey?: string;
  listSavedForm: ResponseForm[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Convert only known response fields into request fields. Response metadata such
// as wallet, player ID, wins and nextMode must not become cheat parameters.
export function gameResponseProjects(value: unknown, options: ProjectImportOptions) {
  if (!Array.isArray(value) || !value.length) return undefined;
  const batches = value.every(Array.isArray) ? value : [value];
  const looksLikeResponses = batches.some(batch => batch.some((item: unknown) =>
    isRecord(item) && Object.entries(item).some(([key, wrapped]) =>
      /^\d+$/.test(key) && isRecord(wrapped) && isRecord(wrapped.data)
    )
  ));
  if (!looksLikeResponses) return undefined;

  const projects: ResponseProject[] = [];
  batches.forEach((batch, batchIndex) => {
    const byGame = new Map<string, ResponseProject>();
    batch.forEach((item: unknown, responseIndex: number) => {
      const label = `Batch ${batchIndex + 1}, response ${responseIndex + 1}`;
      if (!isRecord(item) || !Object.keys(item).length) throw new Error(`${label}: missing game response.`);
      for (const [serviceId, wrapped] of Object.entries(item)) {
        if (!/^\d+$/.test(serviceId) || !isRecord(wrapped) || !isRecord(wrapped.data)) {
          throw new Error(`${label}: invalid game response wrapper.`);
        }
        const data = wrapped.data;
        if (data.sId != null && String(data.sId) !== serviceId) {
          throw new Error(`${label}: game ID does not match sId.`);
        }
        if (!Array.isArray(data.fmt) || !data.fmt.length || !data.fmt.every(span => /^[1-9]+$/.test(String(span)))) {
          throw new Error(`${label}: fmt must contain positive digit spans for each reel.`);
        }
        const layout = data.fmt.map(String);
        const matrix = data.mx0 ?? data.mx;
        const expected = layout.reduce((sum, spans) => sum + spans.length, 0);
        if (!Array.isArray(matrix) || matrix.length !== expected) {
          throw new Error(`${label}: matrix requires ${expected} symbols, received ${Array.isArray(matrix) ? matrix.length : 0}.`);
        }
        if (!matrix.every(symbol => (typeof symbol === "string" || typeof symbol === "number") && String(symbol).trim() && !/[,;|\s]/.test(String(symbol)))) {
          throw new Error(`${label}: invalid matrix symbol.`);
        }
        const state = Number(data.s);
        const subState = Number(data.ss);
        const mode = state === 2 || subState === 82 ? "2" : state === 1 || subState === 81 ? "1" : "";
        const tableType = mode === "2" ? "free" : "normal";
        const name = `${String(responseIndex + 1).padStart(2, "0")} · ${state === 8 ? "Respin · " : ""}${mode === "2" ? "Free" : mode === "1" ? "Normal" : "Response"}`;
        const form: ResponseForm = {
          id: `response-${batchIndex + 1}-${responseIndex + 1}-${createUuid()}`,
          name,
          tableType,
          data: {
            serviceId,
            userId: "",
            matrixData: matrix.join(","),
            tableFormat: layout.map(spans => [...spans].reduce((sum, span) => sum + Number(span), 0)).join(","),
            dynamicTableFormat: layout.join(","),
            ...(serviceId === "9650" ? { stackedTypeMode: mode } : {})
          }
        };
        let project = byGame.get(serviceId);
        if (!project) {
          const sourceName = options.sourceName?.replace(/\.json$/i, "") || `${serviceId} Responses`;
          project = {
            id: serviceId,
            uuid: createUuid(),
            name: `${sourceName}${batches.length > 1 ? ` · Batch ${batchIndex + 1}` : ""}`,
            environment: options.environment ?? DEFAULT_ENVIRONMENT,
            tableFormatKey: serviceId === "9650" ? "matrixLightningData" : undefined,
            listSavedForm: []
          };
          byGame.set(serviceId, project);
        }
        project.listSavedForm.push(form);
      }
    });
    if (byGame.size > 1) {
      for (const project of byGame.values()) project.name += ` · ${project.id}`;
    }
    projects.push(...byGame.values());
  });
  return { projects };
}
