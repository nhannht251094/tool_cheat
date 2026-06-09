import { useEffect } from "react";
import { FloatingActionDock } from "./components/layout/FloatingActionDock";
import { ApiPanel } from "./features/api/ApiPanel";
import { GameFormWorkspace } from "./features/forms/GameFormWorkspace";
import { ProjectSidebar } from "./features/projects/ProjectSidebar";
import { OperationsPanel } from "./features/templates/OperationsPanel";
import { buildSlotFormPayload } from "./lib/slotPayload";
import { useStudioStore } from "./store/useStudioStore";
import type { FieldConfig, MatrixPreset, Project } from "./types/studio";

function valuesFromFields(fields: FieldConfig[]) {
  return Object.fromEntries(fields.map((field) => [field.key, field.defaultValue]));
}

function extensionFormFromPreset(project: Project, preset: MatrixPreset) {
  const formValues = {
    ...valuesFromFields(project.fieldConfigs),
    ...preset.formValues
  };
  const payload = buildSlotFormPayload(preset.cells, preset.rows, preset.cols, formValues);
  return {
    id: preset.id,
    name: preset.name,
    config: {
      endpoint: project.endpoint,
      bearerToken: project.token,
      token: project.token,
      currency: String(formValues.currency || "USD"),
      ...payload
    }
  };
}

export default function App() {
  const {
    projects,
    activeProjectId,
    activePresetId,
    rows,
    cols,
    matrix,
    formValues,
    apiRequest,
    savePreset,
    loadPreset,
    setActiveProject
  } =
    useStudioStore();
  const activeProject = projects.find((project) => project.projectId === activeProjectId);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "s") {
        event.preventDefault();
        savePreset("Shortcut Save", "Manual");
      }
      if (event.key === "Enter") {
        event.preventDefault();
        document.querySelector<HTMLButtonElement>("[data-action='send-request']")?.click();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [savePreset]);

  useEffect(() => {
    function handleDockSelection(event: MessageEvent) {
      if (event.data?.type === "SLOT_MATRIX_DOCK_SELECTED_FORM") {
        if (typeof event.data.formId === "string") loadPreset(event.data.formId);
      }
      if (event.data?.type === "SLOT_MATRIX_DOCK_SELECTED_PROJECT") {
        if (typeof event.data.projectId === "string") setActiveProject(event.data.projectId);
      }
    }

    function handleDockProjectEvent(event: Event) {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (typeof detail?.projectId === "string") setActiveProject(detail.projectId);
    }

    function handleDockFormEvent(event: Event) {
      const detail = (event as CustomEvent<{ formId?: string }>).detail;
      if (typeof detail?.formId === "string") loadPreset(detail.formId);
    }

    window.addEventListener("message", handleDockSelection);
    window.addEventListener("slot-matrix-dock-selected-project", handleDockProjectEvent);
    window.addEventListener("slot-matrix-dock-selected-form", handleDockFormEvent);
    return () => {
      window.removeEventListener("message", handleDockSelection);
      window.removeEventListener("slot-matrix-dock-selected-project", handleDockProjectEvent);
      window.removeEventListener("slot-matrix-dock-selected-form", handleDockFormEvent);
    };
  }, [loadPreset, setActiveProject]);

  useEffect(() => {
    if (!activeProject) return;

    const forms = activeProject.presets.length
      ? activeProject.presets.map((preset) => extensionFormFromPreset(activeProject, preset))
      : [
          {
            id: `${activeProject.projectId}-current`,
            name: `${activeProject.name} Current`,
            config: {
              endpoint: apiRequest.endpoint || activeProject.endpoint,
              bearerToken: apiRequest.token || activeProject.token,
              token: apiRequest.token || activeProject.token,
              currency: String(formValues.currency || "USD"),
              ...buildSlotFormPayload(matrix, rows, cols, formValues)
            }
          }
        ];

    window.postMessage(
      {
        type: "SLOT_MATRIX_SYNC_FORMS",
        forms,
        currentFormId: activePresetId || forms[0]?.id,
        projects: projects.map((project) => ({
          id: project.projectId,
          name: project.name,
          serviceId:
            project.serviceId ||
            String(project.fieldConfigs.find((field) => field.key === "serviceId")?.defaultValue || "")
        })),
        currentProjectId: activeProject.projectId
      },
      window.location.origin
    );
  }, [activePresetId, activeProject, apiRequest.endpoint, apiRequest.token, cols, formValues, matrix, projects, rows]);

  return (
    <main className="tester-shell">
      <ProjectSidebar />
      <section className="tester-main-scroll">
        <GameFormWorkspace />
        <ApiPanel />
      </section>
      <OperationsPanel />
      <FloatingActionDock />
    </main>
  );
}
