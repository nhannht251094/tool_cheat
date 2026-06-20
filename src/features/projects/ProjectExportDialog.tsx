import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { exportProjectsToJson } from "../../lib/projectExchange";
import { notify } from "../../lib/uiEvents";
import type { Project } from "../../types/studio";

type ProjectExportDialogProps = {
  open: boolean;
  projects: Project[];
  activeProjectId: string;
  onClose: () => void;
};

export function ProjectExportDialog({
  open,
  projects,
  activeProjectId,
  onClose
}: ProjectExportDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(projects.some((project) => project.projectId === activeProjectId) ? [activeProjectId] : []);
  }, [activeProjectId, open, projects]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const selectedProjects = projects.filter((project) => selectedIds.includes(project.projectId));
  const allSelected = projects.length > 0 && selectedIds.length === projects.length;

  function toggleProject(projectId: string) {
    setSelectedIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
    );
  }

  function handleExport() {
    if (!selectedProjects.length) return;
    const blob = new Blob([JSON.stringify(exportProjectsToJson(selectedProjects), null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = selectedProjects.length === 1
      ? selectedProjects[0].name
      : `slot-projects-${selectedProjects.length}`;
    link.href = url;
    link.download = `${fileName}-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${selectedProjects.length} project${selectedProjects.length === 1 ? "" : "s"}.`, "success");
    onClose();
  }

  return createPortal(
    <div
      className="project-export-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="project-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-export-title"
      >
        <header>
          <div>
            <h2 id="project-export-title">Select projects to export</h2>
            <span>{selectedProjects.length} of {projects.length} selected</span>
          </div>
          <button type="button" aria-label="Close export dialog" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="project-export-toolbar">
          <strong>Projects</strong>
          <button
            type="button"
            onClick={() => setSelectedIds(allSelected ? [] : projects.map((project) => project.projectId))}
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        </div>

        <div className="project-export-list">
          {projects.map((project) => (
            <label
              className={selectedIds.includes(project.projectId) ? "is-selected" : ""}
              key={project.projectId}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(project.projectId)}
                onChange={() => toggleProject(project.projectId)}
              />
              <span>
                <strong title={project.name}>{project.name}</strong>
                <small>ID {project.serviceId || project.projectId} · {project.presets.length} forms</small>
              </span>
            </label>
          ))}
        </div>

        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="primary"
            disabled={!selectedProjects.length}
            onClick={handleExport}
          >
            <Download size={16} />
            Export selected ({selectedProjects.length})
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
