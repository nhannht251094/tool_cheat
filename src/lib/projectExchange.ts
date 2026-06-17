import { matrixToRaw, rawToMatrixAuto } from "./matrix";
import {
  DEFAULT_ENDPOINT,
  DEFAULT_SERVICE_ID,
  DEFAULT_USER_ID,
  defaultPowerUpSymbolCode
} from "./slotPayload";
import type { FieldConfig, FieldType, MatrixPreset, Project } from "../types/studio";

type ExternalFieldConfig = {
  enabled?: boolean;
  defaultData?: unknown;
  des?: string;
};

type ExternalCustomField = {
  name?: string;
  label?: string;
  type?: string;
  defaultData?: unknown;
  des?: string;
  isRequired?: boolean;
};

type ExternalSavedForm = {
  id?: string;
  name?: string;
  data?: Record<string, unknown>;
  tableType?: string;
  createdAt?: number;
  updatedAt?: number;
};

type ExternalProject = {
  uuid?: string;
  id?: string;
  name?: string;
  environment?: string;
  fieldsConfig?: Record<string, ExternalFieldConfig>;
  customFields?: ExternalCustomField[];
  defaultTableFormat?: string;
  defaultDynamicFormat?: string;
  customInputedFormats?: unknown[];
  tableFormatKey?: string;
  isDynamicFormat?: boolean;
  listSavedForm?: ExternalSavedForm[];
};

type ExternalEnvelope = {
  _meta?: {
    type?: string;
    version?: string;
    exportedAt?: string;
    count?: number;
  };
  projects?: ExternalProject[];
};

type ExternalSavedFormsEnvelope = {
  _meta?: ExternalEnvelope["_meta"] & {
    uuid?: string;
    id?: string;
    projectName?: string;
    environment?: string;
    fieldsConfig?: Record<string, ExternalFieldConfig>;
    customFields?: ExternalCustomField[];
    defaultTableFormat?: string;
    defaultDynamicFormat?: string;
    customInputedFormats?: unknown[];
    tableFormatKey?: string;
    isDynamicFormat?: boolean;
  };
  forms?: ExternalSavedForm[];
};

const BUILT_IN_FIELD_KEYS = new Set([
  "serviceId",
  "userId",
  "matrixData",
  "tableFormat",
  "freegameTableFormat",
  "powerUpSymbolCode"
]);

const BUILT_IN_FIELD_ORDER = [
  "serviceId",
  "userId",
  "matrixData",
  "tableFormat",
  "freegameTableFormat",
  "powerUpSymbolCode"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback: unknown = "") {
  return value == null || value === "" ? String(fallback ?? "") : String(value);
}

function asDefaultValue(value: unknown): string | number | boolean {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value == null) return "";
  return JSON.stringify(value);
}

function asFieldType(value: unknown): FieldType {
  const next = String(value || "text");
  return ["text", "number", "select", "checkbox", "textarea", "json"].includes(next)
    ? (next as FieldType)
    : "text";
}

function fieldTypeFromValue(value: unknown): FieldType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "checkbox";
  if (isRecord(value) || Array.isArray(value)) return "json";
  return "text";
}

function endpointForProject(projectId: string, environment?: string) {
  const env = String(environment || "staging").toLowerCase();
  if (env === "prod" || env === "production") return `https://cheat.enostd.gay/${projectId}/inputed`;
  return `https://cheat.staging.enostd.gay/${projectId}/inputed`;
}

function fieldFromExternal(
  key: string,
  config: ExternalFieldConfig | undefined,
  defaultValue: unknown,
  index: number,
  type: FieldType = fieldTypeFromValue(defaultValue)
): FieldConfig {
  const isMatrix = key === "matrixData";
  return {
    id: `field-${key}-${index}`,
    label: config?.des || key,
    key,
    type: isMatrix ? "textarea" : type,
    defaultValue: asDefaultValue(defaultValue ?? config?.defaultData ?? ""),
    required: key === "serviceId" || key === "userId" || key === "matrixData" || key === "tableFormat",
    readonly: false,
    hidden: isMatrix || config?.enabled === false,
    placeholder: asString(config?.defaultData),
    category: BUILT_IN_FIELD_KEYS.has(key) ? "Form Data" : "Custom"
  };
}

function uniqueKeys(keys: string[]) {
  return Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean)));
}

function matrixPresetFromSavedForm(
  savedForm: ExternalSavedForm,
  fallbackTableFormat: string,
  projectId: string,
  index: number
): MatrixPreset {
  const data = savedForm.data ?? {};
  const tableFormat = asString(data.tableFormat, fallbackTableFormat);
  const matrixData = asString(data.matrixData, "");
  const parsed = rawToMatrixAuto(matrixData, tableFormat);
  const createdAt = savedForm.createdAt ?? Date.now() + index;

  return {
    id: savedForm.id || `preset-${createdAt}`,
    name: savedForm.name || `Form ${index + 1}`,
    scenario: savedForm.tableType || "normal",
    tableType: savedForm.tableType || "normal",
    rows: parsed.rows,
    cols: parsed.cols,
    cells: parsed.matrix,
    formValues: {
      serviceId: projectId,
      ...data,
      tableFormat
    },
    createdAt,
    updatedAt: savedForm.updatedAt ?? createdAt
  };
}

function projectFromExternal(external: ExternalProject, index: number): Project {
  const projectId = asString(external.id, DEFAULT_SERVICE_ID);
  const forms = external.listSavedForm ?? [];
  const firstFormData = forms[0]?.data ?? {};
  const fallbackTableFormat = asString(
    firstFormData.tableFormat,
    external.defaultTableFormat || external.fieldsConfig?.tableFormat?.defaultData || "4,4,4,4,4"
  );
  const firstMatrix = rawToMatrixAuto(
    asString(firstFormData.matrixData, external.fieldsConfig?.matrixData?.defaultData || ""),
    fallbackTableFormat
  );

  const customFieldsByKey = new Map(
    (external.customFields ?? []).map((field, fieldIndex) => [
      asString(field.name, `custom_${fieldIndex + 1}`),
      field
    ])
  );
  const fieldKeys = uniqueKeys([
    ...BUILT_IN_FIELD_ORDER,
    ...Object.keys(external.fieldsConfig ?? {}),
    ...Array.from(customFieldsByKey.keys()),
    ...forms.flatMap((form) => Object.keys(form.data ?? {}))
  ]);

  const fieldConfigs = fieldKeys.map((key, fieldIndex) => {
    const customField = customFieldsByKey.get(key);
    const defaultValue =
      key === "serviceId"
        ? projectId
        : key === "userId"
          ? firstFormData.userId ?? external.fieldsConfig?.userId?.defaultData ?? DEFAULT_USER_ID
          : key === "matrixData"
            ? firstFormData.matrixData ?? external.fieldsConfig?.matrixData?.defaultData ?? ""
            : key === "tableFormat"
              ? firstFormData.tableFormat ?? external.fieldsConfig?.tableFormat?.defaultData ?? fallbackTableFormat
              : key === "powerUpSymbolCode"
                ? firstFormData.powerUpSymbolCode ??
                  external.fieldsConfig?.powerUpSymbolCode?.defaultData ??
                  defaultPowerUpSymbolCode(firstMatrix.rows, firstMatrix.cols)
                : firstFormData[key] ?? external.fieldsConfig?.[key]?.defaultData ?? customField?.defaultData ?? "";

    if (customField) {
      return {
        id: `field-custom-${key}-${fieldIndex}`,
        label: customField.label || key,
        key,
        type: asFieldType(customField.type || fieldTypeFromValue(defaultValue)),
        defaultValue: asDefaultValue(defaultValue),
        required: Boolean(customField.isRequired),
        readonly: false,
        hidden: false,
        placeholder: asString(customField.defaultData),
        validation: customField.des,
        category: "Custom"
      };
    }

    return fieldFromExternal(key, external.fieldsConfig?.[key], defaultValue, fieldIndex);
  });

  const presets = forms.map((form, formIndex) =>
    matrixPresetFromSavedForm(form, fallbackTableFormat, projectId, formIndex)
  );

  return {
    projectId: `project-${projectId}-${external.uuid || index}`,
    uuid: external.uuid || crypto.randomUUID(),
    name: external.name || projectId,
    endpoint: endpointForProject(projectId, external.environment),
    token: "",
    defaultMatrix: firstMatrix.matrix,
    fieldConfigs,
    savedForms: forms as Record<string, unknown>[],
    presets,
    updatedAt: Math.max(...presets.map((preset) => preset.updatedAt), Date.now())
  };
}

function projectFromSavedFormsEnvelope(envelope: ExternalSavedFormsEnvelope): Project {
  const meta = envelope._meta ?? {};
  return projectFromExternal(
    {
      uuid: meta.uuid,
      id: meta.id,
      name: meta.projectName || meta.id,
      environment: meta.environment,
      fieldsConfig: meta.fieldsConfig,
      customFields: meta.customFields,
      defaultTableFormat: meta.defaultTableFormat,
      defaultDynamicFormat: meta.defaultDynamicFormat,
      customInputedFormats: meta.customInputedFormats,
      tableFormatKey: meta.tableFormatKey,
      isDynamicFormat: meta.isDynamicFormat,
      listSavedForm: envelope.forms
    },
    0
  );
}

function isProject(value: unknown): value is Project {
  return isRecord(value) && typeof value.projectId === "string" && Array.isArray(value.fieldConfigs);
}

export function importProjectsFromJson(value: unknown): Project[] {
  if (Array.isArray(value) && value.every(isProject)) return value;

  if (isRecord(value)) {
    const envelope = value as ExternalEnvelope;
    if (Array.isArray(envelope.projects)) {
      return envelope.projects.map(projectFromExternal);
    }

    const savedFormsEnvelope = value as ExternalSavedFormsEnvelope;
    if (Array.isArray(savedFormsEnvelope.forms)) {
      return [projectFromSavedFormsEnvelope(savedFormsEnvelope)];
    }
  }

  throw new Error("Unsupported project JSON format");
}

export async function importProjectsFromJsonFile(file: File): Promise<Project[]> {
  const text = await file.text();
  return importProjectsFromJson(JSON.parse(text));
}

function fieldConfigsToExternal(fields: FieldConfig[]) {
  return fields.reduce<Record<string, ExternalFieldConfig>>((acc, field) => {
    if (!BUILT_IN_FIELD_KEYS.has(field.key)) return acc;
    acc[field.key] = {
      enabled: !field.hidden,
      defaultData: field.defaultValue,
      des: field.label
    };
    return acc;
  }, {});
}

function customFieldsToExternal(fields: FieldConfig[]): ExternalCustomField[] {
  return fields
    .filter((field) => !BUILT_IN_FIELD_KEYS.has(field.key))
    .map((field) => ({
      name: field.key,
      label: field.label,
      type: field.type,
      defaultData: field.defaultValue,
      des: field.validation || field.placeholder || "",
      isRequired: field.required
    }));
}

function projectToExternal(project: Project): ExternalProject {
  const serviceId = asString(
    project.fieldConfigs.find((field) => field.key === "serviceId")?.defaultValue,
    project.name.match(/\d+/)?.[0] || DEFAULT_SERVICE_ID
  );

  return {
    uuid: project.uuid,
    id: serviceId,
    name: project.name,
    environment: project.endpoint.includes("staging") ? "staging" : "prod",
    fieldsConfig: fieldConfigsToExternal(project.fieldConfigs),
    customFields: customFieldsToExternal(project.fieldConfigs),
    customInputedFormats: [
      {
        id: "default-format",
        name: "Default Format",
        normalFormat:
          asString(project.fieldConfigs.find((field) => field.key === "tableFormat")?.defaultValue) ||
          "4,4,4,4,4",
        freeFormat:
          asString(
            project.fieldConfigs.find((field) => field.key === "freegameTableFormat")?.defaultValue
          ) || "4,4,4,4,4",
        dynamicFormat: "",
        createdAt: Date.now(),
        isDefault: true
      }
    ],
    isDynamicFormat: false,
    tableFormatKey: "tableFormat",
    defaultTableFormat:
      asString(project.fieldConfigs.find((field) => field.key === "tableFormat")?.defaultValue) ||
      "4,4,4,4,4",
    defaultDynamicFormat: "1111,1111,1111,1111,1111",
    listSavedForm: project.presets.map((preset) => {
      const tableFormat = asString(preset.formValues?.tableFormat, "4,4,4,4,4");
      return {
        id: preset.id,
        name: preset.name,
        data: {
          ...preset.formValues,
          serviceId,
          matrixData: matrixToRaw(preset.cells, tableFormat),
          tableFormat
        },
        tableType: preset.tableType || preset.scenario || "normal",
        createdAt: preset.createdAt ?? preset.updatedAt,
        updatedAt: preset.updatedAt
      };
    })
  };
}

export function exportProjectsToJson(projects: Project[]) {
  return {
    _meta: {
      type: "gameApiTester_projects",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      count: projects.length
    },
    projects: projects.map(projectToExternal)
  };
}
