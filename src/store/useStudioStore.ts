import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createMatrix,
  freespinMatrix,
  matrixToRaw,
  rawToMatrixAuto,
  nearWinMatrix,
  randomMatrix,
  rawToMatrix,
  scatterMatrix,
  sequentialMatrix,
  wildMatrix
} from "../lib/matrix";
import {
  DEFAULT_ENDPOINT,
  DEFAULT_SERVICE_ID,
  DEFAULT_USER_ID,
  defaultPowerUpSymbolCode,
  tableFormatFromMatrix
} from "../lib/slotPayload";
import type {
  ApiRequest,
  ApiResponse,
  FieldConfig,
  MatrixMode,
  MatrixPreset,
  Project,
  RequestLog
} from "../types/studio";

type GeneratorType = "random" | "sequential" | "nearWin" | "freespin" | "scatter" | "wild";

type StudioState = {
  projects: Project[];
  activeProjectId: string;
  activePresetId: string;
  projectSearch: string;
  rows: number;
  cols: number;
  matrix: string[][];
  rawMatrix: string;
  matrixMode: MatrixMode;
  lockedReels: number[];
  undoStack: string[][][];
  redoStack: string[][][];
  selectedCell: { row: number; col: number };
  apiRequest: ApiRequest;
  lastResponse?: ApiResponse;
  requestLogs: RequestLog[];
  formValues: Record<string, unknown>;
  userIdHistory: string[];
  setProjectSearch: (value: string) => void;
  setActiveProject: (projectId: string) => void;
  createProject: () => void;
  renameProject: (projectId: string, name: string) => void;
  updateProjectServiceId: (projectId: string, serviceId: string) => void;
  duplicateProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  importProjects: (projects: Project[]) => void;
  setMatrixSize: (rows: number, cols: number) => void;
  setCell: (row: number, col: number, value: string) => void;
  setSelectedCell: (row: number, col: number) => void;
  setMatrixMode: (mode: MatrixMode) => void;
  setRawMatrix: (raw: string) => void;
  setRawMatrixAndApply: (raw: string) => void;
  setTableFormatAndApply: (tableFormat: string) => void;
  applyRawMatrix: () => void;
  runGenerator: (type: GeneratorType) => void;
  clearMatrix: () => void;
  fillFull: (symbol: string) => void;
  toggleLockReel: (col: number) => void;
  undo: () => void;
  redo: () => void;
  savePreset: (name: string, scenario: string) => void;
  saveActivePreset: () => void;
  loadPreset: (presetId: string) => void;
  renamePreset: (presetId: string, name: string) => void;
  deletePreset: (presetId: string) => void;
  movePreset: (presetId: string, direction: "up" | "down") => void;
  reorderPreset: (presetId: string, targetPresetId: string, position?: "before" | "after") => void;
  setUserIdForActiveProject: (userId: string) => void;
  rememberUserId: (userId: string) => void;
  updateField: (fieldId: string, patch: Partial<FieldConfig>) => void;
  duplicateField: (fieldId: string) => void;
  deleteField: (fieldId: string) => void;
  addField: (type: FieldConfig["type"]) => void;
  updateFormValue: (key: string, value: unknown) => void;
  updateApiRequest: (patch: Partial<ApiRequest>) => void;
  addRequestLog: (response: ApiResponse, payload: unknown) => void;
  replayLog: (logId: string) => void;
};

const starterFields: FieldConfig[] = [
  {
    id: "field-service",
    label: "serviceId",
    key: "serviceId",
    type: "text",
    defaultValue: DEFAULT_SERVICE_ID,
    required: true,
    readonly: false,
    hidden: false,
    placeholder: "9703",
    category: "Form Data"
  },
  {
    id: "field-user",
    label: "userId",
    key: "userId",
    type: "text",
    defaultValue: DEFAULT_USER_ID,
    required: true,
    readonly: false,
    hidden: false,
    placeholder: "game_rampusd01",
    category: "Form Data"
  },
  {
    id: "field-matrix",
    label: "matrixData",
    key: "matrixData",
    type: "textarea",
    defaultValue: "",
    required: true,
    readonly: false,
    hidden: true,
    placeholder: "Auto-generated from matrix grid",
    category: "Auto"
  },
  {
    id: "field-table-format",
    label: "tableFormat",
    key: "tableFormat",
    type: "text",
    defaultValue: "4,4,4,4,4",
    required: true,
    readonly: false,
    hidden: false,
    placeholder: "4,4,4,4,4",
    category: "Form Data"
  },
  {
    id: "field-power-up",
    label: "powerUpSymbolCode",
    key: "powerUpSymbolCode",
    type: "textarea",
    defaultValue: defaultPowerUpSymbolCode(4, 5),
    required: true,
    readonly: false,
    hidden: false,
    placeholder: "C3,C3,C3...",
    category: "Form Data"
  }
];

const defaultMatrix = [
  ["C3", "C3", "C2", "C3", "C3"],
  ["C3", "K", "C3", "A", "C3"],
  ["C3", "C3", "C3", "C3", "C3"],
  ["C3", "C3", "C3", "C3", "C3"]
];

const starterProject: Project = {
  projectId: "project-rampus-inputed",
  uuid: "9703-inputed-form-data",
  name: "RampUSD Inputed",
  serviceId: DEFAULT_SERVICE_ID,
  endpoint: DEFAULT_ENDPOINT,
  token: "",
  defaultMatrix,
  fieldConfigs: starterFields,
  savedForms: [],
  presets: [
    {
      id: "preset-big-win",
      name: "Inputed Sample",
      scenario: "Form Data",
      rows: 4,
      cols: 5,
      cells: defaultMatrix,
      updatedAt: Date.now()
    },
    {
      id: "preset-bonus-trigger",
      name: "All C3",
      scenario: "Neutral",
      rows: 4,
      cols: 5,
      cells: createMatrix(4, 5, "C3"),
      updatedAt: Date.now()
    }
  ],
  updatedAt: Date.now()
};

function valuesFromFields(fields: FieldConfig[]) {
  return Object.fromEntries(fields.map((field) => [field.key, field.defaultValue]));
}

function projectServiceId(project: Project) {
  return String(
    project.serviceId ||
      project.fieldConfigs.find((field) => field.key === "serviceId")?.defaultValue ||
      project.name.match(/\d+/)?.[0] ||
      DEFAULT_SERVICE_ID
  );
}

function endpointForServiceId(endpoint: string, serviceId: string) {
  if (/\/[^/]+\/inputed/.test(endpoint)) {
    return endpoint.replace(/\/[^/]+\/inputed/, `/${serviceId}/inputed`);
  }
  return DEFAULT_ENDPOINT.replace(`/${DEFAULT_SERVICE_ID}/inputed`, `/${serviceId}/inputed`);
}

function nextProjectServiceId(projects: Project[]) {
  const numericIds = projects
    .map((project) => Number(projectServiceId(project)))
    .filter((value) => Number.isFinite(value));
  const next = numericIds.length ? Math.max(...numericIds) + 1 : Number(DEFAULT_SERVICE_ID);
  return String(next);
}

function withProjectServiceId(project: Project, serviceId: string): Project {
  return {
    ...project,
    serviceId,
    endpoint: endpointForServiceId(project.endpoint, serviceId),
    fieldConfigs: project.fieldConfigs.map((field) =>
      field.key === "serviceId" ? { ...field, defaultValue: serviceId } : field
    ),
    presets: project.presets.map((preset) => ({
      ...preset,
      formValues: {
        ...preset.formValues,
        serviceId
      },
      updatedAt: Date.now()
    })),
    updatedAt: Date.now()
  };
}

function valuesWithMatrix(
  formValues: Record<string, unknown>,
  matrix: string[][],
  rows: number,
  cols: number
) {
  const tableFormat = String(formValues.tableFormat || tableFormatFromMatrix(rows, cols));
  return {
    ...formValues,
    matrixData: matrixToRaw(matrix, tableFormat),
    tableFormat
  };
}

function syncActivePreset(
  state: StudioState,
  matrix: string[][],
  rows: number,
  cols: number,
  formValues: Record<string, unknown>
) {
  if (!state.activePresetId) return state.projects;
  const snapshot = valuesWithMatrix(formValues, matrix, rows, cols);
  return state.projects.map((project) =>
    project.projectId === state.activeProjectId
      ? {
          ...project,
          presets: project.presets.map((preset) =>
            preset.id === state.activePresetId
              ? {
                  ...preset,
                  rows,
                  cols,
                  cells: matrix,
                  formValues: snapshot,
                  updatedAt: Date.now()
                }
              : preset
          ),
          updatedAt: Date.now()
        }
      : project
  );
}

function nextUserIdHistory(history: string[] = [], userId: unknown) {
  const value = String(userId ?? "").trim();
  if (!value) return history;
  return [value, ...history.filter((item) => item !== value)].slice(0, 20);
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      projects: [starterProject],
      activeProjectId: starterProject.projectId,
      activePresetId: starterProject.presets[0]?.id ?? "",
      projectSearch: "",
      rows: 4,
      cols: 5,
      matrix: defaultMatrix,
      rawMatrix: matrixToRaw(defaultMatrix, "4,4,4,4,4"),
      matrixMode: "visual",
      lockedReels: [],
      undoStack: [],
      redoStack: [],
      selectedCell: { row: 0, col: 0 },
      apiRequest: {
        method: "POST",
        endpoint: starterProject.endpoint,
        token: starterProject.token,
        autoSend: false,
        websocket: false,
        environment: "DEV",
        headers: [
          {
            id: "h-content",
            key: "Content-Type",
            value: "application/x-www-form-urlencoded;charset=UTF-8",
            enabled: true
          }
        ]
      },
      requestLogs: [],
      formValues: valuesFromFields(starterFields),
      userIdHistory: [DEFAULT_USER_ID],

      setProjectSearch: (value) => set({ projectSearch: value }),
      setActiveProject: (projectId) => {
        const project = get().projects.find((item) => item.projectId === projectId);
        if (!project) return;
        const preset = project.presets[0];
        const serviceId = projectServiceId(project);
        const formValues = preset?.formValues
          ? { ...valuesFromFields(project.fieldConfigs), ...preset.formValues }
          : valuesFromFields(project.fieldConfigs);
        formValues.serviceId = serviceId;
        const matrix = preset?.cells ?? project.defaultMatrix;
        const rows = preset?.rows ?? matrix.length;
        const cols = preset?.cols ?? matrix[0]?.length ?? 5;
        const tableFormat = String(formValues.tableFormat || tableFormatFromMatrix(rows, cols));
        set({
          activeProjectId: projectId,
          activePresetId: preset?.id ?? "",
          rows,
          cols,
          matrix,
          rawMatrix: matrixToRaw(matrix, tableFormat),
          formValues,
          apiRequest: {
            ...get().apiRequest,
            endpoint: endpointForServiceId(project.endpoint, serviceId),
            token: project.token,
            headers: [
              {
                id: "h-content",
                key: "Content-Type",
                value: "application/x-www-form-urlencoded;charset=UTF-8",
                enabled: true
              }
            ]
          }
        });
      },
      createProject: () =>
        set((state) => {
          const serviceId = nextProjectServiceId(state.projects);
          const project: Project = {
            ...withProjectServiceId(starterProject, serviceId),
            projectId: `project-${Date.now()}`,
            uuid: crypto.randomUUID(),
            name: `Untitled Slot ${state.projects.length + 1}`,
            updatedAt: Date.now(),
            presets: []
          };
          const formValues = valuesFromFields(project.fieldConfigs);
          return {
            projects: [project, ...state.projects],
            activeProjectId: project.projectId,
            activePresetId: "",
            rows: project.defaultMatrix.length,
            cols: project.defaultMatrix[0]?.length ?? 5,
            matrix: project.defaultMatrix,
            rawMatrix: matrixToRaw(
              project.defaultMatrix,
              String(formValues.tableFormat || tableFormatFromMatrix(4, 5))
            ),
            formValues,
            apiRequest: {
              ...state.apiRequest,
              endpoint: project.endpoint,
              token: project.token
            }
          };
        }),
      renameProject: (projectId, name) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.projectId === projectId ? { ...project, name, updatedAt: Date.now() } : project
          )
        })),
      updateProjectServiceId: (projectId, serviceId) =>
        set((state) => {
          const nextServiceId = serviceId.trim();
          if (!nextServiceId) return state;
          const isActiveProject = state.activeProjectId === projectId;
          return {
            formValues: isActiveProject
              ? { ...state.formValues, serviceId: nextServiceId }
              : state.formValues,
            apiRequest: isActiveProject
              ? {
                  ...state.apiRequest,
                  endpoint: endpointForServiceId(state.apiRequest.endpoint, nextServiceId)
                }
              : state.apiRequest,
            projects: state.projects.map((project) =>
              project.projectId === projectId ? withProjectServiceId(project, nextServiceId) : project
            )
          };
        }),
      duplicateProject: (projectId) =>
        set((state) => {
          const source = state.projects.find((project) => project.projectId === projectId);
          if (!source) return state;
          const serviceId = nextProjectServiceId(state.projects);
          const copy = {
            ...withProjectServiceId(source, serviceId),
            projectId: `project-${Date.now()}`,
            uuid: crypto.randomUUID(),
            name: `${source.name} Copy`,
            updatedAt: Date.now()
          };
          const preset = copy.presets[0];
          const formValues = preset?.formValues
            ? { ...valuesFromFields(copy.fieldConfigs), ...preset.formValues, serviceId }
            : valuesFromFields(copy.fieldConfigs);
          const matrix = preset?.cells ?? copy.defaultMatrix;
          const rows = preset?.rows ?? matrix.length;
          const cols = preset?.cols ?? matrix[0]?.length ?? 5;
          const tableFormat = String(formValues.tableFormat || tableFormatFromMatrix(rows, cols));
          return {
            projects: [copy, ...state.projects],
            activeProjectId: copy.projectId,
            activePresetId: preset?.id ?? "",
            rows,
            cols,
            matrix,
            rawMatrix: matrixToRaw(matrix, tableFormat),
            formValues,
            apiRequest: {
              ...state.apiRequest,
              endpoint: copy.endpoint,
              token: copy.token
            }
          };
        }),
      deleteProject: (projectId) =>
        set((state) => {
          if (state.projects.length === 1) return state;
          const projects = state.projects.filter((project) => project.projectId !== projectId);
          return {
            projects,
            activeProjectId:
              state.activeProjectId === projectId ? projects[0].projectId : state.activeProjectId,
            activePresetId:
              state.activeProjectId === projectId
                ? projects[0].presets[0]?.id ?? ""
                : state.activePresetId
          };
        }),
      importProjects: (projects) => {
        const firstProject = projects[0] ?? starterProject;
        const firstPreset = firstProject.presets[0];
        const serviceId = projectServiceId(firstProject);
        const formValues = firstPreset?.formValues
          ? { ...valuesFromFields(firstProject.fieldConfigs), ...firstPreset.formValues }
          : valuesFromFields(firstProject.fieldConfigs);
        formValues.serviceId = serviceId;
        const matrix = firstPreset?.cells ?? firstProject.defaultMatrix;
        const rows = firstPreset?.rows ?? matrix.length;
        const cols = firstPreset?.cols ?? matrix[0]?.length ?? 5;
        const tableFormat = String(formValues.tableFormat || tableFormatFromMatrix(rows, cols));
        set({
          projects: projects.length
            ? projects.map((project) => withProjectServiceId(project, projectServiceId(project)))
            : [starterProject],
          activeProjectId: firstProject.projectId,
          activePresetId: firstPreset?.id ?? "",
          rows,
          cols,
          matrix,
          rawMatrix: matrixToRaw(matrix, tableFormat),
          formValues,
          apiRequest: {
            ...get().apiRequest,
            endpoint: endpointForServiceId(firstProject.endpoint, serviceId),
            token: firstProject.token,
            headers: [
              {
                id: "h-content",
                key: "Content-Type",
                value: "application/x-www-form-urlencoded;charset=UTF-8",
                enabled: true
              }
            ]
          }
        });
      },
      setMatrixSize: (rows, cols) => {
        const next = createMatrix(rows, cols, "C3");
        set((state) => {
          const formValues = {
            ...state.formValues,
            tableFormat: tableFormatFromMatrix(rows, cols),
            powerUpSymbolCode: defaultPowerUpSymbolCode(rows, cols)
          };
          return {
            projects: syncActivePreset(state, next, rows, cols, formValues),
            rows,
            cols,
            matrix: next,
            rawMatrix: matrixToRaw(next, String(formValues.tableFormat)),
            formValues,
            undoStack: [state.matrix, ...state.undoStack].slice(0, 30),
            redoStack: []
          };
        });
      },
      setCell: (row, col, value) =>
        set((state) => {
          const next = state.matrix.map((matrixRow, rowIndex) =>
            matrixRow.map((cell, colIndex) =>
              rowIndex === row && colIndex === col ? value.trim().toUpperCase() : cell
            )
          );
          return {
            projects: syncActivePreset(state, next, state.rows, state.cols, state.formValues),
            matrix: next,
            rawMatrix: matrixToRaw(
              next,
              String(state.formValues.tableFormat || tableFormatFromMatrix(state.rows, state.cols))
            ),
            undoStack: [state.matrix, ...state.undoStack].slice(0, 30),
            redoStack: []
          };
        }),
      setSelectedCell: (row, col) => set({ selectedCell: { row, col } }),
      setMatrixMode: (mode) => set({ matrixMode: mode }),
      setRawMatrix: (raw) => set({ rawMatrix: raw }),
      setRawMatrixAndApply: (raw) =>
        set((state) => {
          const tableFormat = String(
            state.formValues.tableFormat || tableFormatFromMatrix(state.rows, state.cols)
          );
          const next = rawToMatrixAuto(raw, tableFormat);
          return {
            projects: syncActivePreset(state, next.matrix, next.rows, next.cols, state.formValues),
            rows: next.rows,
            cols: next.cols,
            matrix: next.matrix,
            rawMatrix: matrixToRaw(next.matrix, tableFormat),
            undoStack: [state.matrix, ...state.undoStack].slice(0, 30),
            redoStack: []
          };
        }),
      setTableFormatAndApply: (tableFormat) =>
        set((state) => {
          const next = rawToMatrixAuto(state.rawMatrix, tableFormat);
          const formValues = {
            ...state.formValues,
            tableFormat,
            powerUpSymbolCode: defaultPowerUpSymbolCode(next.rows, next.cols)
          };
          return {
            projects: syncActivePreset(state, next.matrix, next.rows, next.cols, formValues),
            rows: next.rows,
            cols: next.cols,
            matrix: next.matrix,
            rawMatrix: matrixToRaw(next.matrix, tableFormat),
            formValues,
            undoStack: [state.matrix, ...state.undoStack].slice(0, 30),
            redoStack: []
          };
        }),
      applyRawMatrix: () =>
        set((state) => {
          const next = rawToMatrix(state.rawMatrix, state.rows, state.cols);
          return {
            projects: syncActivePreset(state, next, state.rows, state.cols, state.formValues),
            matrix: next,
            rawMatrix: matrixToRaw(next),
            undoStack: [state.matrix, ...state.undoStack].slice(0, 30),
            redoStack: []
          };
        }),
      runGenerator: (type) =>
        set((state) => {
          const generators = {
            random: randomMatrix,
            sequential: sequentialMatrix,
            nearWin: nearWinMatrix,
            freespin: freespinMatrix,
            scatter: scatterMatrix,
            wild: wildMatrix
          };
          let next = generators[type](state.rows, state.cols);
          state.lockedReels.forEach((col) => {
            next = next.map((row, rowIndex) => {
              row[col] = state.matrix[rowIndex][col];
              return row;
            });
          });
          return {
            projects: syncActivePreset(state, next, state.rows, state.cols, state.formValues),
            matrix: next,
            rawMatrix: matrixToRaw(next),
            undoStack: [state.matrix, ...state.undoStack].slice(0, 30),
            redoStack: []
          };
        }),
      clearMatrix: () => get().fillFull(""),
      fillFull: (symbol) =>
        set((state) => {
          const next = createMatrix(state.rows, state.cols, symbol.toUpperCase());
          return {
            projects: syncActivePreset(state, next, state.rows, state.cols, state.formValues),
            matrix: next,
            rawMatrix: matrixToRaw(next),
            undoStack: [state.matrix, ...state.undoStack].slice(0, 30),
            redoStack: []
          };
        }),
      toggleLockReel: (col) =>
        set((state) => ({
          lockedReels: state.lockedReels.includes(col)
            ? state.lockedReels.filter((item) => item !== col)
            : [...state.lockedReels, col]
        })),
      undo: () =>
        set((state) => {
          const previous = state.undoStack[0];
          if (!previous) return state;
          return {
            projects: syncActivePreset(state, previous, state.rows, state.cols, state.formValues),
            matrix: previous,
            rawMatrix: matrixToRaw(previous),
            undoStack: state.undoStack.slice(1),
            redoStack: [state.matrix, ...state.redoStack].slice(0, 30)
          };
        }),
      redo: () =>
        set((state) => {
          const next = state.redoStack[0];
          if (!next) return state;
          return {
            projects: syncActivePreset(state, next, state.rows, state.cols, state.formValues),
            matrix: next,
            rawMatrix: matrixToRaw(next),
            redoStack: state.redoStack.slice(1),
            undoStack: [state.matrix, ...state.undoStack].slice(0, 30)
          };
        }),
      savePreset: (name, scenario) =>
        set((state) => {
          const id = `preset-${Date.now()}`;
          return {
            activePresetId: id,
            userIdHistory: nextUserIdHistory(state.userIdHistory, state.formValues.userId),
            projects: state.projects.map((project) =>
              project.projectId === state.activeProjectId
                ? {
                    ...project,
                    presets: [
                      {
                        id,
                        name,
                        scenario,
                        rows: state.rows,
                        cols: state.cols,
                        cells: state.matrix,
                        formValues: valuesWithMatrix(state.formValues, state.matrix, state.rows, state.cols),
                        tableType: scenario,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                      },
                      ...project.presets
                    ],
                    updatedAt: Date.now()
                  }
                : project
            )
          };
        }),
      saveActivePreset: () =>
        set((state) => {
          const snapshot = valuesWithMatrix(state.formValues, state.matrix, state.rows, state.cols);
          const now = Date.now();
          const fallbackPresetId = `preset-${now}`;
          const activeProject = state.projects.find(
            (project) => project.projectId === state.activeProjectId
          );
          const hasActivePreset = Boolean(
            activeProject?.presets.some((preset) => preset.id === state.activePresetId)
          );

          return {
            activePresetId: hasActivePreset ? state.activePresetId : fallbackPresetId,
            userIdHistory: nextUserIdHistory(state.userIdHistory, state.formValues.userId),
            projects: state.projects.map((project) => {
              if (project.projectId !== state.activeProjectId) return project;

              const currentIndex = project.presets.findIndex(
                (preset) => preset.id === state.activePresetId
              );

              if (currentIndex < 0) {
                return {
                  ...project,
                  presets: [
                    {
                      id: fallbackPresetId,
                      name: "Inputed Snapshot",
                      scenario: "Manual",
                      rows: state.rows,
                      cols: state.cols,
                      cells: state.matrix,
                      formValues: snapshot,
                      tableType: "Manual",
                      createdAt: now,
                      updatedAt: now
                    },
                    ...project.presets
                  ],
                  updatedAt: now
                };
              }

              return {
                ...project,
                presets: project.presets.map((preset) =>
                  preset.id === state.activePresetId
                    ? {
                        ...preset,
                        rows: state.rows,
                        cols: state.cols,
                        cells: state.matrix,
                        formValues: snapshot,
                        updatedAt: now
                      }
                    : preset
                ),
                updatedAt: now
              };
            })
          };
        }),
      loadPreset: (presetId) => {
        const project = get().projects.find((item) => item.projectId === get().activeProjectId);
        const preset = project?.presets.find((item) => item.id === presetId);
        if (!project || !preset) return;
        const serviceId = projectServiceId(project);
        const nextFormValues = { ...valuesFromFields(project.fieldConfigs), ...preset.formValues };
        nextFormValues.serviceId = serviceId;
        const tableFormat = String(nextFormValues.tableFormat || tableFormatFromMatrix(preset.rows, preset.cols));
        set((state) => ({
          activePresetId: presetId,
          rows: preset.rows,
          cols: preset.cols,
          matrix: preset.cells,
          rawMatrix: matrixToRaw(preset.cells, tableFormat),
          formValues: nextFormValues,
          userIdHistory: nextUserIdHistory(state.userIdHistory, nextFormValues.userId),
          undoStack: [state.matrix, ...state.undoStack].slice(0, 30),
          redoStack: []
        }));
      },
      renamePreset: (presetId, name) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.projectId === state.activeProjectId
              ? {
                  ...project,
                  presets: project.presets.map((preset) =>
                    preset.id === presetId
                      ? { ...preset, name: name.trim() || preset.name, updatedAt: Date.now() }
                      : preset
                  ),
                  updatedAt: Date.now()
                }
              : project
          )
        })),
      deletePreset: (presetId) =>
        set((state) => {
          const project = state.projects.find((item) => item.projectId === state.activeProjectId);
          const nextPresets = project?.presets.filter((preset) => preset.id !== presetId) ?? [];
          const nextActivePresetId =
            state.activePresetId === presetId ? nextPresets[0]?.id ?? "" : state.activePresetId;
          const nextPreset = nextPresets.find((preset) => preset.id === nextActivePresetId);
          const formValues = nextPreset
            ? { ...valuesFromFields(project?.fieldConfigs ?? []), ...nextPreset.formValues }
            : state.formValues;
          const rows = nextPreset?.rows ?? state.rows;
          const cols = nextPreset?.cols ?? state.cols;
          const matrix = nextPreset?.cells ?? state.matrix;
          const tableFormat = String(formValues.tableFormat || tableFormatFromMatrix(rows, cols));
          return {
            activePresetId: nextActivePresetId,
            rows,
            cols,
            matrix,
            rawMatrix: matrixToRaw(matrix, tableFormat),
            formValues,
            projects: state.projects.map((item) =>
              item.projectId === state.activeProjectId
                ? { ...item, presets: nextPresets, updatedAt: Date.now() }
                : item
            )
          };
        }),
      movePreset: (presetId, direction) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.projectId !== state.activeProjectId) return project;
            const currentIndex = project.presets.findIndex((preset) => preset.id === presetId);
            if (currentIndex < 0) return project;
            const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
            if (nextIndex < 0 || nextIndex >= project.presets.length) return project;
            const presets = [...project.presets];
            const [moved] = presets.splice(currentIndex, 1);
            presets.splice(nextIndex, 0, moved);
            return { ...project, presets, updatedAt: Date.now() };
          })
        })),
      reorderPreset: (presetId, targetPresetId, position = "before") =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.projectId !== state.activeProjectId || presetId === targetPresetId) {
              return project;
            }
            const currentIndex = project.presets.findIndex((preset) => preset.id === presetId);
            const targetIndex = project.presets.findIndex((preset) => preset.id === targetPresetId);
            if (currentIndex < 0 || targetIndex < 0) return project;
            const presets = [...project.presets];
            const [moved] = presets.splice(currentIndex, 1);
            const targetIndexAfterRemoval = presets.findIndex((preset) => preset.id === targetPresetId);
            const insertIndex =
              position === "after" ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;
            presets.splice(insertIndex, 0, moved);
            return { ...project, presets, updatedAt: Date.now() };
          })
        })),
      setUserIdForActiveProject: (userId) =>
        set((state) => {
          const formValues = { ...state.formValues, userId };
          return {
            formValues,
            userIdHistory: nextUserIdHistory(state.userIdHistory, userId),
            projects: state.projects.map((project) =>
              project.projectId === state.activeProjectId
                ? {
                    ...project,
                    fieldConfigs: project.fieldConfigs.map((field) =>
                      field.key === "userId" ? { ...field, defaultValue: userId } : field
                    ),
                    presets: project.presets.map((preset) => ({
                      ...preset,
                      formValues: {
                        ...preset.formValues,
                        userId
                      },
                      updatedAt: Date.now()
                    })),
                    updatedAt: Date.now()
                  }
                : project
            )
          };
        }),
      rememberUserId: (userId) =>
        set((state) => ({
          userIdHistory: nextUserIdHistory(state.userIdHistory, userId)
        })),
      updateField: (fieldId, patch) =>
        set((state) => {
          const project = state.projects.find((item) => item.projectId === state.activeProjectId);
          const field = project?.fieldConfigs.find((item) => item.id === fieldId);
          if (!field) return state;
          const oldKey = field.key;
          const nextKey = patch.key && patch.key.trim() ? patch.key.trim() : oldKey;
          const shouldMigrateKey = Boolean(oldKey && nextKey && oldKey !== nextKey);
          const formValues = shouldMigrateKey
            ? {
                ...state.formValues,
                [nextKey as string]: state.formValues[oldKey as string]
              }
            : state.formValues;
          if (shouldMigrateKey) delete formValues[oldKey as string];

          return {
            formValues,
            projects: state.projects.map((item) =>
              item.projectId === state.activeProjectId
                ? {
                    ...item,
                    fieldConfigs: item.fieldConfigs.map((candidate) =>
                      candidate.id === fieldId ? { ...candidate, ...patch, key: nextKey } : candidate
                    ),
                    presets: item.presets.map((preset) => {
                      if (!shouldMigrateKey) return preset;
                      const nextFormValues = {
                        ...preset.formValues,
                        [nextKey as string]: preset.formValues?.[oldKey as string]
                      };
                      delete nextFormValues[oldKey as string];
                      return { ...preset, formValues: nextFormValues, updatedAt: Date.now() };
                    }),
                    updatedAt: Date.now()
                  }
                : item
            )
          };
        }),
      duplicateField: (fieldId) =>
        set((state) => ({
          projects: state.projects.map((project) => {
            if (project.projectId !== state.activeProjectId) return project;
            const field = project.fieldConfigs.find((item) => item.id === fieldId);
            if (!field) return project;
            return {
              ...project,
              fieldConfigs: [
                ...project.fieldConfigs,
                {
                  ...field,
                  id: `field-${Date.now()}`,
                  label: `${field.label} Copy`,
                  key: `${field.key}Copy`
                }
              ]
            };
          })
        })),
      deleteField: (fieldId) =>
        set((state) => {
          const project = state.projects.find((item) => item.projectId === state.activeProjectId);
          const field = project?.fieldConfigs.find((item) => item.id === fieldId);
          if (!field || ["serviceId", "userId", "matrixData", "tableFormat"].includes(field.key)) {
            return state;
          }
          const formValues = { ...state.formValues };
          delete formValues[field.key];
          return {
            formValues,
            projects: state.projects.map((item) =>
              item.projectId === state.activeProjectId
                ? {
                    ...item,
                    fieldConfigs: item.fieldConfigs.filter((candidate) => candidate.id !== fieldId),
                    presets: item.presets.map((preset) => {
                      const nextFormValues = { ...preset.formValues };
                      delete nextFormValues[field.key];
                      return { ...preset, formValues: nextFormValues, updatedAt: Date.now() };
                    }),
                    updatedAt: Date.now()
                  }
                : item
            )
          };
        }),
      addField: (type) =>
        set((state) => {
          const project = state.projects.find((item) => item.projectId === state.activeProjectId);
          const key = `new_${type}_${(project?.fieldConfigs.length ?? 0) + 1}`;
          const defaultValue = type === "checkbox" ? false : "";
          return {
            formValues: { ...state.formValues, [key]: defaultValue },
            projects: state.projects.map((item) =>
              item.projectId === state.activeProjectId
                ? {
                    ...item,
                    fieldConfigs: [
                      ...item.fieldConfigs,
                      {
                        id: `field-${Date.now()}`,
                        label: `New ${type}`,
                        key,
                        type,
                        defaultValue,
                        required: false,
                        readonly: false,
                        hidden: false,
                        category: "Custom"
                      }
                    ],
                    updatedAt: Date.now()
                  }
                : item
            )
          };
        }),
      updateFormValue: (key, value) =>
        set((state) => {
          const formValues = { ...state.formValues, [key]: value };
          return {
            formValues,
            projects: syncActivePreset(state, state.matrix, state.rows, state.cols, formValues)
          };
        }),
      updateApiRequest: (patch) =>
        set((state) => ({ apiRequest: { ...state.apiRequest, ...patch } })),
      addRequestLog: (response, payload) =>
        set((state) => {
          const project = state.projects.find((item) => item.projectId === state.activeProjectId);
          const log: RequestLog = {
            id: `log-${Date.now()}`,
            projectName: project?.name ?? "Unknown",
            method: state.apiRequest.method,
            endpoint: state.apiRequest.endpoint,
            matrix: state.matrix,
            payload,
            response,
            createdAt: Date.now()
          };
          return { lastResponse: response, requestLogs: [log, ...state.requestLogs].slice(0, 50) };
        }),
      replayLog: (logId) => {
        const log = get().requestLogs.find((item) => item.id === logId);
        if (!log) return;
        set({
          matrix: log.matrix,
          rawMatrix: matrixToRaw(log.matrix),
          apiRequest: {
            ...get().apiRequest,
            method: log.method,
            endpoint: log.endpoint
          }
        });
      }
    }),
    {
      name: "slot-matrix-studio",
      version: 4,
      migrate: () => ({}) as Partial<StudioState>
    }
  )
);
