export type Environment = "DEV" | "STAGING" | "PROD";

export type HttpMethod = "GET" | "POST" | "PUT";

export type MatrixMode = "visual" | "raw";

export type FieldType =
  | "text"
  | "number"
  | "select"
  | "checkbox"
  | "textarea"
  | "json";

export type FieldConfig = {
  id: string;
  label: string;
  key: string;
  type: FieldType;
  defaultValue: string | number | boolean;
  required: boolean;
  readonly: boolean;
  hidden: boolean;
  placeholder?: string;
  validation?: string;
  category: string;
  collapsed?: boolean;
};

export type MatrixPreset = {
  id: string;
  name: string;
  scenario: string;
  rows: number;
  cols: number;
  cells: string[][];
  formValues?: Record<string, unknown>;
  tableType?: string;
  createdAt?: number;
  updatedAt: number;
};

export type Project = {
  projectId: string;
  uuid: string;
  name: string;
  serviceId?: string;
  endpoint: string;
  token: string;
  defaultMatrix: string[][];
  fieldConfigs: FieldConfig[];
  savedForms: Record<string, unknown>[];
  presets: MatrixPreset[];
  updatedAt: number;
};

export type ApiHeader = {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
};

export type ApiRequest = {
  method: HttpMethod;
  endpoint: string;
  token: string;
  headers: ApiHeader[];
  autoSend: boolean;
  websocket: boolean;
  environment: Environment;
};

export type ApiResponse = {
  id: string;
  status: number;
  timeMs: number;
  ok: boolean;
  body: unknown;
  createdAt: number;
};

export type RequestLog = {
  id: string;
  projectName: string;
  method: HttpMethod;
  endpoint: string;
  matrix: string[][];
  payload: unknown;
  response?: ApiResponse;
  createdAt: number;
};
