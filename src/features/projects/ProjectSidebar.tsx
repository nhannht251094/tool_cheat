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
import { useMemo, useRef } from "react";
import { Button } from "../../components/ui/Button";
import { exportProjectsToJson, importProjectsFromJson } from "../../lib/projectExchange";
import { useStudioStore } from "../../store/useStudioStore";

export function ProjectSidebar() {
  const inputRef = useRef<HTMLInputElement>(null);
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

  function exportProjects() {
    const blob = new Blob([JSON.stringify(exportProjectsToJson(projects), null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const activeProject = projects.find((project) => project.projectId === activeProjectId);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.download = `${activeProject?.name || "slot-projects"}-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      const next = importProjectsFromJson(JSON.parse(text));
      importProjects(next);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Import failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <aside className="project-sidebar">
      <div className="brand-row">
        <div className="brand-icon">SM</div>
        <div>
          <strong>Game API Tester</strong>
          <span>Operator Studio</span>
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
        <Button icon={<Download size={15} />} onClick={exportProjects}>
          Export
        </Button>
        <Button icon={<Upload size={15} />} onClick={() => inputRef.current?.click()}>
          Import
        </Button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="application/json"
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
                  deleteProject(project.projectId);
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
        <button>
          <Settings size={15} />
          API Settings
        </button>
        <button className="gold" onClick={() => inputRef.current?.click()}>
          ↕ Export / Import
        </button>
        <button className="blue">
          <Users size={15} />
          User ID Management
        </button>
        <button>
          <Palette size={15} />
          Theme Settings
        </button>
        <button className="red">
          <Trash2 size={15} />
          Clear Data
        </button>
      </footer>
    </aside>
  );
}
