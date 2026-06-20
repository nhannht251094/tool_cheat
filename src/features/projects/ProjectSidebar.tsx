import {
  Copy,
  Download,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  Users,
  Palette
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { importProjectsFromJsonFile } from "../../lib/projectExchange";
import { focusSelector, notify, scrollToSelector } from "../../lib/uiEvents";
import { useStudioStore } from "../../store/useStudioStore";
import { ProjectExportDialog } from "./ProjectExportDialog";

export function ProjectSidebar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const {
    projects,
    activeProjectId,
    projectSearch,
    setProjectSearch,
    setActiveProject,
    createProject,
    renameProject,
    updateProjectServiceId,
    duplicateProject,
    deleteProject,
    importProjects
  } = useStudioStore();

  const filteredProjects = useMemo(
    () =>
      [...projects]
        .filter((project) =>
          project.name.toLowerCase().includes(projectSearch.trim().toLowerCase())
        )
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [projectSearch, projects]
  );

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

  function toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === "contrast" ? "dark" : "contrast";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("slot-matrix-theme", nextTheme);
    notify(nextTheme === "contrast" ? "High contrast theme enabled." : "Dark theme enabled.", "success");
  }

  function clearWorkspaceData() {
    if (!window.confirm("Clear all local Game API Tester data? This cannot be undone.")) return;
    localStorage.removeItem("slot-matrix-studio");
    notify("Local data cleared. Reloading...", "success");
    window.setTimeout(() => window.location.reload(), 500);
  }

  return (
    <aside className="project-sidebar">
      <div className="brand-row">
        <div className="brand-copy">
          <strong>Game API Tester</strong>
          <span className="brand-subtitle">
            Internal Tools
            <span className="tool-version" title={`Tool Cheat build ${__BUILD_ID__}`}>
              v{__APP_VERSION__}
            </span>
          </span>
        </div>
      </div>

      <div className="search-box">
        <Search size={15} />
        <input
          value={projectSearch}
          onChange={(event) => setProjectSearch(event.target.value)}
          placeholder="Search project"
        />
      </div>

      <div className="sidebar-actions">
        <Button variant="primary" icon={<Plus size={15} />} onClick={createProject}>
          Create
        </Button>
        <Button icon={<Download size={15} />} data-action="export-projects" onClick={() => setExportOpen(true)}>
          Export
        </Button>
        <Button icon={<Upload size={15} />} onClick={() => inputRef.current?.click()}>
          Import
        </Button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
      </div>

      <div className="project-list">
        {filteredProjects.map((project) => (
          <article
            className={project.projectId === activeProjectId ? "project-card active" : "project-card"}
            key={project.projectId}
            onClick={() => setActiveProject(project.projectId)}
          >
            <div>
              <input
                value={project.name}
                onChange={(event) => renameProject(project.projectId, event.target.value)}
                onClick={(event) => event.stopPropagation()}
              />
              <label className="project-service-id" onClick={(event) => event.stopPropagation()}>
                ID
                <input
                  value={
                    project.serviceId ||
                    String(
                      project.fieldConfigs.find((field) => field.key === "serviceId")?.defaultValue ||
                        ""
                    )
                  }
                  onChange={(event) =>
                    updateProjectServiceId(project.projectId, event.target.value)
                  }
                />
              </label>
              <span>{project.endpoint.replace(/^https?:\/\//, "")}</span>
            </div>
            <div className="project-actions">
              <button
                title="Duplicate"
                onClick={(event) => {
                  event.stopPropagation();
                  duplicateProject(project.projectId);
                }}
              >
                <Copy size={14} />
              </button>
              <button
                title="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  if (window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
                    deleteProject(project.projectId);
                    notify("Project deleted.", "success");
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <footer className="sidebar-footer">
        <div className="storage-row">
          <span>▱ 50.4 KB / 5.00 MB</span>
          <span>{projects.length} projects</span>
        </div>
        <meter min={0} max={5000} value={50.4} />
        <button onClick={() => scrollToSelector(".api-panel")}>
          <Settings size={15} />
          API Settings
        </button>
        <button className="gold" onClick={() => inputRef.current?.click()}>
          <Upload size={15} />
          Export / Import
        </button>
        <button className="blue" onClick={() => focusSelector(".top-user-field input")}>
          <Users size={15} />
          User ID Management
        </button>
        <button onClick={toggleTheme}>
          <Palette size={15} />
          Theme Settings
        </button>
        <button className="red" onClick={clearWorkspaceData}>
          <Trash2 size={15} />
          Clear Data
        </button>
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
