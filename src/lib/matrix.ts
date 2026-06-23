const SYMBOLS = ["C3", "C3", "C3", "C2", "K", "A"];

export function createMatrix(rows: number, cols: number, fill = "A") {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

export function cloneMatrix(matrix: string[][]) {
  return matrix.map((row) => [...row]);
}

export function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

export function parseTableFormat(tableFormat: string) {
  return tableFormat
    .split(/[\s,;|]+/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function parseDynamicTableFormat(dynamicTableFormat: string, reelHeights: number[]) {
  const reels = dynamicTableFormat
    .split(/[\s,;|]+/)
    .map((reel) =>
      reel
        .trim()
        .split("")
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    );

  return reelHeights.map((reelHeight, reelIndex) => {
    const spans = reels[reelIndex] ?? [];
    const totalHeight = spans.reduce((sum, span) => sum + span, 0);
    if (!spans.length || totalHeight !== reelHeight) {
      return Array.from({ length: reelHeight }, () => 1);
    }
    return spans;
  });
}

export function parseIndexList(value: string) {
  return value
    .split(/[\s,;|]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0);
}

export function matrixTokenPositions(tableFormat: string, dynamicTableFormat?: string) {
  const format = parseTableFormat(tableFormat);
  const rows = Math.max(...format, 1);
  const cols = Math.max(format.length, 1);
  const dynamicSpans = dynamicTableFormat ? parseDynamicTableFormat(dynamicTableFormat, format) : [];
  const positions: Array<{ row: number; col: number; span: number }> = [];

  for (let col = 0; col < cols; col += 1) {
    const reelHeight = format[col] ?? rows;
    const spans = dynamicSpans[col] ?? Array.from({ length: reelHeight }, () => 1);
    let row = 0;
    for (const span of spans) {
      positions.push({ row, col, span });
      row += span;
    }
  }

  return positions;
}

export function matrixToRaw(matrix: string[][], tableFormat?: string, dynamicTableFormat?: string) {
  const format = tableFormat ? parseTableFormat(tableFormat) : [];
  if (!format.length) return matrix.flat().join(",");
  const dynamicSpans = dynamicTableFormat ? parseDynamicTableFormat(dynamicTableFormat, format) : [];

  const tokens: string[] = [];
  const rows = matrix.length;
  const cols = Math.max(format.length, matrix[0]?.length ?? 0);

  for (let col = 0; col < cols; col += 1) {
    const reelHeight = format[col] ?? rows;
    const spans = dynamicSpans[col] ?? Array.from({ length: reelHeight }, () => 1);
    let row = 0;
    for (const span of spans) {
      tokens.push(matrix[row]?.[col] || "C3");
      row += span;
    }
  }

  return tokens.join(",");
}

export function rawToMatrix(raw: string, rows: number, cols: number) {
  const tokens = raw
    .split(/[\s,;|]+/)
    .map(normalizeSymbol)
    .filter(Boolean);
  const next = createMatrix(rows, cols, "");

  for (let index = 0; index < rows * cols; index += 1) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    next[row][col] = tokens[index] ?? "";
  }

  return next;
}

export function rawToMatrixAuto(raw: string, tableFormat: string, dynamicTableFormat?: string) {
  const format = parseTableFormat(tableFormat);
  const rows = Math.max(...format, 1);
  const cols = Math.max(format.length, 1);
  const dynamicSpans = dynamicTableFormat ? parseDynamicTableFormat(dynamicTableFormat, format) : [];
  const tokens = raw
    .split(/[\s,;|]+/)
    .map(normalizeSymbol)
    .filter(Boolean);
  const next = createMatrix(rows, cols, "");

  let tokenIndex = 0;
  for (let col = 0; col < cols; col += 1) {
    const reelHeight = format[col] ?? rows;
    const spans = dynamicSpans[col] ?? Array.from({ length: reelHeight }, () => 1);
    let row = 0;
    for (const span of spans) {
      const value = tokens[tokenIndex] ?? "C3";
      for (let offset = 0; offset < span && row + offset < reelHeight; offset += 1) {
        next[row + offset][col] = value;
      }
      row += span;
      tokenIndex += 1;
    }
  }

  return { rows, cols, matrix: next };
}

export function pasteToMatrix(text: string, rows: number, cols: number) {
  const sourceRows = text
    .trim()
    .split(/\n+/)
    .map((row) => row.split(/\t|,/).map(normalizeSymbol));
  const next = createMatrix(rows, cols, "");

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      next[row][col] = sourceRows[row]?.[col] ?? next[row][col];
    }
  }

  return next;
}

export function randomMatrix(rows: number, cols: number) {
  return createMatrix(rows, cols).map((row) =>
    row.map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
  );
}

export function sequentialMatrix(rows: number, cols: number) {
  return createMatrix(rows, cols).map((row, rowIndex) =>
    row.map((_, colIndex) => SYMBOLS[(rowIndex * cols + colIndex) % SYMBOLS.length])
  );
}

export function nearWinMatrix(rows: number, cols: number) {
  const next = createMatrix(rows, cols, "C3");
  const missCol = Math.max(0, cols - 1);
  for (let row = 0; row < rows; row += 1) {
    next[row][missCol] = row === Math.floor(rows / 2) ? "C2" : "C3";
  }
  return next;
}

export function freespinMatrix(rows: number, cols: number) {
  const next = randomMatrix(rows, cols);
  const positions = [
    [0, 0],
    [Math.floor(rows / 2), Math.floor(cols / 2)],
    [rows - 1, cols - 1]
  ];
  positions.forEach(([row, col]) => {
    next[row][col] = "C2";
  });
  return next;
}

export function scatterMatrix(rows: number, cols: number) {
  const next = randomMatrix(rows, cols);
  for (let col = 0; col < cols; col += 2) {
    next[col % rows][col] = "C2";
  }
  return next;
}

export function wildMatrix(rows: number, cols: number) {
  return createMatrix(rows, cols, "C3");
}
