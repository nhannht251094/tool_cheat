import { useEffect, useRef, useState } from "react";
import { FloatingActionDock } from "./components/layout/FloatingActionDock";
import { ApiPanel } from "./features/api/ApiPanel";
import { GameFormWorkspace } from "./features/forms/GameFormWorkspace";
import { ProjectSidebar } from "./features/projects/ProjectSidebar";
import { OperationsPanel } from "./features/templates/OperationsPanel";
import { importProjectsFromJsonFile } from "./lib/projectExchange";
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
  const [jsonDropState, setJsonDropState] = useState<"idle" | "over" | "importing" | "done" | "error">(
    "idle"
  );
  const [toast, setToast] = useState<{ message: string; tone: "info" | "success" | "error" } | null>(null);
  const dropDepthRef = useRef(0);
  const dropMessageTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const {
    projects,
    activeProjectId,
    activePresetId,
    rows,
    cols,
    matrix,
    formValues,
    apiRequest,
    importProjects,
    savePreset,
    loadPreset,
    setActiveProject
  } =
    useStudioStore();
  const activeProject = projects.find((project) => project.projectId === activeProjectId);

  function clearDropMessageLater(state: "done" | "error") {
    setJsonDropState(state);
    if (dropMessageTimerRef.current) window.clearTimeout(dropMessageTimerRef.current);
    dropMessageTimerRef.current = window.setTimeout(() => {
      setJsonDropState("idle");
      dropMessageTimerRef.current = null;
    }, 1400);
  }

  async function importJsonFile(file: File) {
    setJsonDropState("importing");
    try {
      importProjects(await importProjectsFromJsonFile(file));
      clearDropMessageLater("done");
    } catch (error) {
      clearDropMessageLater("error");
      window.alert(error instanceof Error ? error.message : "Import failed");
    }
  }

  function hasJsonFile(dataTransfer: DataTransfer | null) {
    if (!dataTransfer) return false;
    return Array.from(dataTransfer.items ?? []).some(
      (item) =>
        item.kind === "file" &&
        (item.type === "application/json" || item.getAsFile()?.name.toLowerCase().endsWith(".json"))
    );
  }

  function getJsonFile(dataTransfer: DataTransfer | null) {
    if (!dataTransfer) return undefined;
    return Array.from(dataTransfer.files).find(
      (file) => file.type === "application/json" || file.name.toLowerCase().endsWith(".json")
    );
  }

  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem("slot-matrix-theme") || "dark";
  }, []);

  useEffect(() => {
    function handleToast(event: Event) {
      const detail = (event as CustomEvent<{ message?: string; tone?: "info" | "success" | "error" }>).detail;
      if (!detail?.message) return;
      setToast({ message: detail.message, tone: detail.tone ?? "info" });
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, 2400);
    }

    window.addEventListener("slot-matrix-toast", handleToast);
    return () => {
      window.removeEventListener("slot-matrix-toast", handleToast);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

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
    function handleDragEnter(event: DragEvent) {
      if (!hasJsonFile(event.dataTransfer)) return;
      event.preventDefault();
      dropDepthRef.current += 1;
      setJsonDropState("over");
    }

    function handleDragOver(event: DragEvent) {
      if (!hasJsonFile(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setJsonDropState("over");
    }

    function handleDragLeave(event: DragEvent) {
      if (!hasJsonFile(event.dataTransfer)) return;
      event.preventDefault();
      dropDepthRef.current = Math.max(0, dropDepthRef.current - 1);
      if (dropDepthRef.current === 0) setJsonDropState("idle");
    }

    function handleDrop(event: DragEvent) {
      const file = getJsonFile(event.dataTransfer);
      if (!file) return;
      event.preventDefault();
      dropDepthRef.current = 0;
      void importJsonFile(file);
    }

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      if (dropMessageTimerRef.current) window.clearTimeout(dropMessageTimerRef.current);
    };
  }, [importProjects]);

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
      {jsonDropState !== "idle" && (
        <div className={`json-drop-overlay ${jsonDropState}`} aria-live="polite">
          <div>
            <strong>
              {jsonDropState === "over" && "Drop JSON to import"}
              {jsonDropState === "importing" && "Importing JSON"}
              {jsonDropState === "done" && "JSON imported"}
              {jsonDropState === "error" && "Import failed"}
            </strong>
            <span>
              {jsonDropState === "over"
                ? "Projects and forms will load automatically."
                : jsonDropState === "done"
                  ? "Projects are now available in the workspace."
                  : jsonDropState === "error"
                    ? "Check the JSON format and try again."
                    : "Reading project data..."}
            </span>
          </div>
        </div>
      )}
      {toast && (
        <div className={`app-toast ${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
    </main>
  );
}
