import { Download, Upload } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { useStudioStore } from "../../store/useStudioStore";

const scenarios = ["Big win", "Near miss", "No win", "Bonus trigger", "Freespin", "Jackpot"];

export function TemplateSystem() {
  const { projects, activeProjectId, loadPreset, savePreset, runGenerator } = useStudioStore();
  const project = projects.find((item) => item.projectId === activeProjectId);

  return (
    <Panel
      eyebrow="Templates"
      title="Scenario Presets"
      action={
        <div className="mini-actions">
          <Button icon={<Upload size={14} />}>Import</Button>
          <Button icon={<Download size={14} />}>Export</Button>
        </div>
      }
    >
      <div className="scenario-grid">
        {scenarios.map((scenario) => (
          <button
            key={scenario}
            onClick={() => {
              if (scenario === "Near miss") runGenerator("nearWin");
              if (scenario === "Bonus trigger" || scenario === "Freespin") runGenerator("freespin");
              if (scenario === "Big win" || scenario === "Jackpot") runGenerator("wild");
              if (scenario === "No win") runGenerator("random");
            }}
          >
            <span>{scenario}</span>
            <small>1-click load</small>
          </button>
        ))}
      </div>

      <div className="preset-list">
        <div className="preset-list-head">
          <strong>Saved Matrix Presets</strong>
          <button onClick={() => savePreset("Operator Snapshot", "Manual")}>Save current</button>
        </div>
        {project?.presets.map((preset) => (
          <button key={preset.id} onClick={() => loadPreset(preset.id)}>
            <span>{preset.name}</span>
            <small>
              {preset.rows}x{preset.cols} / {preset.scenario}
            </small>
          </button>
        ))}
      </div>
    </Panel>
  );
}
