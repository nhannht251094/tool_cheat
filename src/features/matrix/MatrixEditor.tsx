import {
  Braces,
  Clipboard,
  Dice5,
  Eraser,
  Grid3X3,
  Lock,
  Redo2,
  Save,
  Sparkles,
  Undo2,
  Wand2,
  Zap
} from "lucide-react";
import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { matrixToRaw, pasteToMatrix } from "../../lib/matrix";
import { useStudioStore } from "../../store/useStudioStore";

const sizes = [
  { label: "3x3", rows: 3, cols: 3 },
  { label: "4x5", rows: 4, cols: 5 },
  { label: "5x6", rows: 5, cols: 6 }
];

export function MatrixEditor() {
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  const [cellOriginals, setCellOriginals] = useState<Record<string, string>>({});
  const {
    rows,
    cols,
    matrix,
    rawMatrix,
    matrixMode,
    lockedReels,
    selectedCell,
    setMatrixSize,
    setCell,
    setSelectedCell,
    setMatrixMode,
    setRawMatrix,
    applyRawMatrix,
    runGenerator,
    clearMatrix,
    fillFull,
    toggleLockReel,
    undo,
    redo,
    savePreset
  } = useStudioStore();

  function cellKey(row: number, col: number) {
    return `${row}-${col}`;
  }

  function beginCellEdit(row: number, col: number, value: string) {
    const key = cellKey(row, col);
    setSelectedCell(row, col);
    setCellDrafts((current) => ({ ...current, [key]: current[key] ?? value }));
    setCellOriginals((current) => ({ ...current, [key]: current[key] ?? value }));
  }

  function updateCellDraft(row: number, col: number, value: string) {
    const key = cellKey(row, col);
    setCellDrafts((current) => ({ ...current, [key]: value }));
    if (value.trim()) setCell(row, col, value);
  }

  function finishCellEdit(row: number, col: number) {
    const key = cellKey(row, col);
    const draft = cellDrafts[key];
    if (draft === undefined) return;
    const original = cellOriginals[key] ?? matrix[row]?.[col] ?? "";
    if (draft.trim()) setCell(row, col, draft);
    else setCell(row, col, original);
    setCellDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setCellOriginals((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1]
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const nextRow = Math.min(Math.max(row + move[0], 0), rows - 1);
    const nextCol = Math.min(Math.max(col + move[1], 0), cols - 1);
    setSelectedCell(nextRow, nextCol);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLInputElement>(`[data-cell="${nextRow}-${nextCol}"]`)
        ?.focus();
    });
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    event.preventDefault();
    const next = pasteToMatrix(text, rows, cols);
    next.forEach((matrixRow, row) => {
      matrixRow.forEach((value, col) => setCell(row, col, value));
    });
  }

  async function copyMatrix() {
    const text = matrixToRaw(matrix);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }

  return (
    <Panel
      className="matrix-panel"
      eyebrow="Matrix Editor"
      title="Spin Result Matrix"
      action={
        <div className="segmented">
          <button
            className={matrixMode === "visual" ? "active" : ""}
            onClick={() => setMatrixMode("visual")}
          >
            <Grid3X3 size={14} />
            Visual
          </button>
          <button
            className={matrixMode === "raw" ? "active" : ""}
            onClick={() => setMatrixMode("raw")}
          >
            <Braces size={14} />
            Raw
          </button>
        </div>
      }
    >
      <div className="matrix-toolbar">
        <div className="size-tools">
          {sizes.map((size) => (
            <button
              className={rows === size.rows && cols === size.cols ? "active" : ""}
              key={size.label}
              onClick={() => setMatrixSize(size.rows, size.cols)}
            >
              {size.label}
            </button>
          ))}
          <label>
            Rows
            <input
              type="number"
              min={1}
              max={8}
              value={rows}
              onChange={(event) => setMatrixSize(Number(event.target.value), cols)}
            />
          </label>
          <label>
            Cols
            <input
              type="number"
              min={1}
              max={8}
              value={cols}
              onChange={(event) => setMatrixSize(rows, Number(event.target.value))}
            />
          </label>
        </div>

        <div className="tool-cluster">
          <Button icon={<Undo2 size={14} />} onClick={undo}>
            Undo
          </Button>
          <Button icon={<Redo2 size={14} />} onClick={redo}>
            Redo
          </Button>
          <Button icon={<Clipboard size={14} />} onClick={() => void copyMatrix()}>
            Copy
          </Button>
        </div>
      </div>

      <div className="generator-strip">
        <Button icon={<Dice5 size={14} />} onClick={() => runGenerator("random")}>
          Random
        </Button>
        <Button icon={<Wand2 size={14} />} onClick={() => runGenerator("sequential")}>
          Sequential
        </Button>
        <Button icon={<Zap size={14} />} onClick={() => runGenerator("nearWin")}>
          Near Win
        </Button>
        <Button icon={<Sparkles size={14} />} onClick={() => runGenerator("freespin")}>
          Freespin
        </Button>
        <Button onClick={() => runGenerator("scatter")}>Scatter</Button>
        <Button onClick={() => runGenerator("wild")}>Wild Fill</Button>
        <Button icon={<Eraser size={14} />} onClick={clearMatrix}>
          Clear
        </Button>
        <Button onClick={() => fillFull(matrix[selectedCell.row]?.[selectedCell.col] || "A")}>
          Fill Full
        </Button>
        <Button icon={<Save size={14} />} onClick={() => savePreset("Quick Preset", "Manual")}>
          Save Preset
        </Button>
      </div>

      {matrixMode === "visual" ? (
        <div className="matrix-wrap">
          <div className="reel-locks" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }, (_, col) => (
              <button
                className={lockedReels.includes(col) ? "locked" : ""}
                key={col}
                onClick={() => toggleLockReel(col)}
              >
                <Lock size={13} />
                R{col + 1}
              </button>
            ))}
          </div>
          <div
            className="matrix-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(64px, 1fr))` }}
          >
            {matrix.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <input
                  data-cell={`${rowIndex}-${colIndex}`}
                  className={
                    selectedCell.row === rowIndex && selectedCell.col === colIndex ? "selected" : ""
                  }
                  key={`${rowIndex}-${colIndex}`}
                  value={cellDrafts[cellKey(rowIndex, colIndex)] ?? cell}
                  onFocus={() => beginCellEdit(rowIndex, colIndex, cell)}
                  onBlur={() => finishCellEdit(rowIndex, colIndex)}
                  onChange={(event) => updateCellDraft(rowIndex, colIndex, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(event, rowIndex, colIndex)}
                  onPaste={handlePaste}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="raw-editor">
          <textarea
            value={rawMatrix}
            onChange={(event) => setRawMatrix(event.target.value)}
            placeholder="2,2,2,3,3,3,4,4,4"
          />
          <Button variant="primary" onClick={applyRawMatrix}>
            Apply Raw Matrix
          </Button>
        </div>
      )}
    </Panel>
  );
}
