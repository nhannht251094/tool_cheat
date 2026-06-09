import { Activity, Keyboard, Layers3, PlayCircle } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { useStudioStore } from "../../store/useStudioStore";

export function StatisticsPanel() {
  const { matrix, rows, cols, requestLogs, apiRequest } = useStudioStore();
  const flat = matrix.flat().filter(Boolean);
  const frequency = [...new Set(flat)].map((symbol) => ({
    symbol,
    count: flat.filter((item) => item === symbol).length
  }));

  return (
    <Panel eyebrow="Telemetry" title="Runtime Overview">
      <div className="stat-stack">
        <div className="operator-card">
          <Activity size={16} />
          <div>
            <span>Matrix Size</span>
            <strong>
              {rows} rows x {cols} reels
            </strong>
          </div>
        </div>
        <div className="operator-card">
          <Layers3 size={16} />
          <div>
            <span>Environment</span>
            <strong>{apiRequest.environment}</strong>
          </div>
        </div>
        <div className="operator-card">
          <PlayCircle size={16} />
          <div>
            <span>Request Logs</span>
            <strong>{requestLogs.length}</strong>
          </div>
        </div>
      </div>

      <div className="symbol-frequency">
        {frequency.map((item) => (
          <div key={item.symbol}>
            <span>{item.symbol}</span>
            <meter min={0} max={flat.length || 1} value={item.count} />
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>

      <div className="shortcut-list">
        <div>
          <Keyboard size={14} />
          <span>Ctrl + Enter</span>
          <strong>Send</strong>
        </div>
        <div>
          <Keyboard size={14} />
          <span>Ctrl + S</span>
          <strong>Save preset</strong>
        </div>
        <div>
          <Keyboard size={14} />
          <span>Arrow keys</span>
          <strong>Navigate grid</strong>
        </div>
      </div>
    </Panel>
  );
}
