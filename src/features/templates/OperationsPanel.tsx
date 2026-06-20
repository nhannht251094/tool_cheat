import {
  Copy,
  Download,
  Edit3,
  FileText,
  GripVertical,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  Upload
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import dockManifest from "../../../extension/manifest.json";
import { ProjectExportDialog } from "../projects/ProjectExportDialog";
import { importProjectsFromJsonFile } from "../../lib/projectExchange";
import { notify } from "../../lib/uiEvents";
import { useStudioStore } from "../../store/useStudioStore";

const fallbackForms = [
  "default",
  "NoWin",
  "Đập mob",
  "Đập mobs",
  "Mob",
  "SuperMegaWin",
  "MegaWin"
];

const OPERATIONS_WIDTH_KEY = "slot-matrix-operations-width";
const OPERATIONS_COLLAPSED_KEY = "slot-matrix-operations-collapsed";
const MIN_OPERATIONS_WIDTH = 280;
const MAX_OPERATIONS_WIDTH = 300;
const latestDockVersion = dockManifest.version;

function compareVersions(left: string, right: string) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function clampOperationsWidth(value: number) {
  return Math.min(MAX_OPERATIONS_WIDTH, Math.max(MIN_OPERATIONS_WIDTH, value));
}

export function OperationsPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [draggingId, setDraggingId] = useState("");
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [formSearch, setFormSearch] = useState("");
  const [installedDockVersion, setInstalledDockVersion] = useState("");
  const [legacyDockDetected, setLegacyDockDetected] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(OPERATIONS_COLLAPSED_KEY) === "true");
  const [panelWidth, setPanelWidth] = useState(() =>
    clampOperationsWidth(Number(localStorage.getItem(OPERATIONS_WIDTH_KEY)) || 296)
  );
  const {
    projects,
    activeProjectId,
    activePresetId,
    importProjects,
    loadPreset,
    savePreset,
    renamePreset,
    deletePreset,
    reorderPreset
  } = useStudioStore();
  const project = projects.find((item) => item.projectId === activeProjectId);
  const forms = project?.presets.length
    ? project.presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        hash: `#${preset.id.slice(-7)}`,
        scenario: preset.tableType || preset.scenario || "normal"
      }))
    : fallbackForms.map((name, index) => ({
        id: `fallback-${index}`,
        name,
        hash: `#fallback-${index + 1}`,
        scenario: "normal"
      }));
  const formSearchValue = formSearch.trim().toLowerCase();
  const filteredForms = formSearchValue
    ? forms.filter((form) =>
        [form.name, form.scenario, form.hash].some((value) =>
          value.toLowerCase().includes(formSearchValue)
        )
      )
    : forms;

  useEffect(() => {
    document.documentElement.style.setProperty("--operations-panel-width", `${panelWidth}px`);
    localStorage.setItem(OPERATIONS_WIDTH_KEY, String(panelWidth));
  }, [panelWidth]);

  useEffect(() => {
    localStorage.setItem(OPERATIONS_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    function handleDockVersion(event: MessageEvent) {
      if (event.source !== window || event.data?.type !== "SLOT_MATRIX_DOCK_VERSION") return;
      if (typeof event.data.version === "string") setInstalledDockVersion(event.data.version);
    }

    window.addEventListener("message", handleDockVersion);
    window.postMessage({ type: "SLOT_MATRIX_REQUEST_DOCK_VERSION" }, window.location.origin);
    const legacyDetectionTimer = window.setTimeout(() => {
      if (document.getElementById("slot-matrix-dock-host")) setLegacyDockDetected(true);
    }, 500);
    return () => {
      window.removeEventListener("message", handleDockVersion);
      window.clearTimeout(legacyDetectionTimer);
    };
  }, []);

  const dockVersionComparison = installedDockVersion
    ? compareVersions(installedDockVersion, latestDockVersion)
    : null;
  const dockDownloadState =
    legacyDockDetected && !installedDockVersion
      ? "outdated"
      : dockVersionComparison === null
      ? "unknown"
      : dockVersionComparison < 0
        ? "outdated"
        : "latest";
  const dockDownloadLabel =
    dockDownloadState === "outdated"
      ? "Update Dock"
      : dockDownloadState === "latest"
        ? "Dock Latest"
        : "Dock Ext";
  const dockDownloadTitle = installedDockVersion
    ? dockDownloadState === "outdated"
      ? `Dock ${installedDockVersion} is installed. Download ${latestDockVersion}.`
      : `Dock ${installedDockVersion} is up to date.`
    : legacyDockDetected
      ? `An older dock without version reporting is installed. Download ${latestDockVersion}.`
      : `Dock not detected. Latest version: ${latestDockVersion}.`;

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (collapsed) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelRef.current?.getBoundingClientRect().width ?? panelWidth;

    function onPointerMove(moveEvent: globalThis.PointerEvent) {
      setPanelWidth(clampOperationsWidth(startWidth - (moveEvent.clientX - startX)));
    }

    function onPointerUp() {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.body.classList.remove("is-resizing-operations");
    }

    document.body.classList.add("is-resizing-operations");
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }

  async function handleImport(file?: File) {
    if (!file) return;
    try {
      importProjects(await importProjectsFromJsonFile(file));
      notify("Project data imported.", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Import failed", "error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function updateNameDraft(id: string, value: string) {
    setNameDrafts((current) => ({ ...current, [id]: value }));
    if (value.trim()) renamePreset(id, value);
  }

  function finishNameEdit(id: string, fallbackName: string) {
    const draft = nameDrafts[id];
    if (draft === undefined) return;
    const nextName = draft.trim();
    if (nextName) renamePreset(id, nextName);
    else renamePreset(id, fallbackName);
    setNameDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function revertNameEdit(id: string) {
    setNameDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  return (
    <aside
      ref={panelRef}
      className={collapsed ? "operations-panel is-collapsed" : "operations-panel"}
    >
      <div
        className="operations-resize-handle"
        aria-hidden="true"
        onPointerDown={startResize}
      />
      <header className="operations-head">
        <button
          type="button"
          title={collapsed ? "Expand Operations Panel" : "Collapse Operations Panel"}
          aria-label={collapsed ? "Expand Operations Panel" : "Collapse Operations Panel"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? "‹" : "›"}
        </button>
        <h2>
          <SlidersHorizontal size={18} />
          Operations Panel
        </h2>
      </header>

      <details className="operation-group" open>
        <summary>
          <span>Saved Forms</span>
          <strong>{filteredForms.length === forms.length ? forms.length : `${filteredForms.length}/${forms.length}`}</strong>
        </summary>
        <div className="operation-group-content">
          <label className="operation-search">
            <Search size={14} />
            <input
              aria-label="Search saved forms"
              placeholder="Search forms"
              value={formSearch}
              onChange={(event) => setFormSearch(event.target.value)}
            />
          </label>
          <div className="operation-list">
            {filteredForms.map((form) => (
            <article
            className={[
              "operation-card",
              form.id === activePresetId ? "active" : "",
              form.id === draggingId ? "dragging" : "",
              dropTarget?.id === form.id ? `drop-${dropTarget.position}` : ""
            ]
              .filter(Boolean)
              .join(" ")}
            key={form.id}
            title={form.name}
            draggable={!form.id.startsWith("fallback-")}
            onDragStart={(event) => {
              setDraggingId(form.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", form.id);
            }}
            onDragOver={(event) => {
              if (!draggingId || draggingId === form.id) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              const rect = event.currentTarget.getBoundingClientRect();
              const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
              setDropTarget({ id: form.id, position });
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTarget(null);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
              if (sourceId && sourceId !== form.id) {
                reorderPreset(sourceId, form.id, dropTarget?.position || "before");
              }
              setDraggingId("");
              setDropTarget(null);
            }}
            onDragEnd={() => {
              setDraggingId("");
              setDropTarget(null);
            }}
            onClick={() => loadPreset(form.id)}
          >
            <div className="drag-grip" title="Drag to reorder">
              <GripVertical size={16} />
            </div>
            <div className="operation-main">
              <strong>
                <FileText size={16} />
                <input
                  aria-label="Form name"
                  readOnly={form.id.startsWith("fallback-")}
                  title={form.name}
                  value={nameDrafts[form.id] ?? form.name}
                  onChange={(event) => updateNameDraft(form.id, event.target.value)}
                  onBlur={() => finishNameEdit(form.id, form.name)}
                  onClick={(event) => event.stopPropagation()}
                  onFocus={(event) => {
                    event.stopPropagation();
                    setNameDrafts((current) => ({ ...current, [form.id]: current[form.id] ?? form.name }));
                    event.currentTarget.select();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") {
                      event.stopPropagation();
                      revertNameEdit(form.id);
                      event.currentTarget.blur();
                    }
                  }}
                />
                {form.name === "SuperMegaWin" && <i />}
              </strong>
              <div className="operation-meta">
                <span className="operation-scenario">{form.scenario}</span>
                <small>{form.hash}</small>
              </div>
            </div>
            <div className="operation-actions">
              <button
                className="send"
                title="Load and send"
                onClick={(event) => {
                  event.stopPropagation();
                  loadPreset(form.id);
                  notify(`Loaded ${form.name}. Sending request...`, "info");
                  window.setTimeout(() => {
                    document.querySelector<HTMLButtonElement>("[data-action='send-request']")?.click();
                  }, 0);
                }}
              >
                <Send size={17} />
              </button>
              <button
                title="Duplicate"
                onClick={(event) => {
                  event.stopPropagation();
                  loadPreset(form.id);
                  window.setTimeout(() => savePreset(`${form.name} Copy`, "Manual"), 0);
                  notify("Form duplicated.", "success");
                }}
              >
                <Copy size={15} />
              </button>
              <button
                title="Rename"
                onClick={(event) => {
                  event.stopPropagation();
                  const nextName = window.prompt("Rename form", form.name);
                  if (nextName) {
                    renamePreset(form.id, nextName);
                    notify("Form renamed.", "success");
                  }
                }}
              >
                <Edit3 size={15} />
              </button>
              <button
                className="delete"
                title="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  if (window.confirm(`Delete saved form "${form.name}"? This cannot be undone.`)) {
                    deletePreset(form.id);
                    notify("Saved form deleted.", "success");
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {form.id === activePresetId && <span className="operation-active-line" />}
            </article>
            ))}
            {!filteredForms.length && (
              <div className="operation-empty">
                <strong>No forms found</strong>
                <span>Try a different name, scenario, or id.</span>
              </div>
            )}
          </div>
        </div>
      </details>

      <footer className="operations-footer">
        <button className="export" data-action="export-projects" onClick={() => setExportOpen(true)}>
          <Download size={14} />
          Export
        </button>
        <button onClick={() => inputRef.current?.click()}>
          <Upload size={14} />
          Import
        </button>
        <a
          className={`dock-extension-download is-${dockDownloadState}`}
          href="/slot-matrix-dock-extension.zip"
          download
          title={dockDownloadTitle}
        >
          <span className="dock-version-dot" aria-hidden="true" />
          <Download size={14} />
          {dockDownloadLabel}
        </a>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
      </footer>
      <ProjectExportDialog
        open={exportOpen}
        projects={projects}
        activeProjectId={activeProjectId}
        onClose={() => setExportOpen(false)}
      />
    </aside>
  );
}
