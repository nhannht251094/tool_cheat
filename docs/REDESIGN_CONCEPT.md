# Slot Matrix Studio Redesign

## 1. Full Redesign Concept

Slot Matrix Studio is an internal dark-mode operator dashboard for QA, Dev, and game operators to construct slot spin matrices, attach dynamic payload fields, send API requests, replay test scenarios, and inspect responses. The visual direction follows Discord developer tooling, Vercel dashboards, and cyber operator panels: compact, high-density controls, thin borders, blue accent states, and subtle neon focus feedback.

## 2. Component Structure

- `ProjectSidebar`: project search, recent sort, create, rename, duplicate, delete, import/export JSON.
- `MatrixEditor`: visual/raw matrix editor, size presets, custom rows/cols, generators, lock reel, undo/redo, copy, save preset.
- `DynamicFormBuilder`: dynamic payload field rendering plus config editing for label, key, default value, flags, validation.
- `ApiPanel`: REST method, endpoint, token, headers, request preview, response viewer, response time/status, logs and replay.
- `TemplateSystem`: cheat/scenario/matrix presets such as big win, near miss, bonus trigger, freespin, jackpot.
- `StatisticsPanel`: matrix telemetry, symbol frequency, runtime environment, shortcuts.
- `Button` and `Panel`: reusable shadcn-like primitives.

## 3. Folder Structure

```text
src/
  components/
    ui/
    layout/
  features/
    api/
    forms/
    insights/
    matrix/
    projects/
    templates/
  lib/
  store/
  types/
```

## 4. UI Layout Breakdown

- Left sidebar: project management, import/export, recent project list.
- Top command bar: active project, environment, REST/realtime mode, operator status, sticky save.
- Main column: matrix editor first, API request panel second.
- Inspector column: dynamic payload form, template system, telemetry/statistics.
- Dense tab strip: Matrix, Payload, API, Templates, Logs for future route-level expansion.

## 5. Suggested Libraries

- Zustand: persisted project/matrix/API state.
- TanStack Query: request mutation lifecycle.
- React Hook Form: dynamic form lifecycle.
- Monaco Editor: JSON preview and response viewer.
- Lucide React: consistent utility icons.
- TailwindCSS + shadcn/ui: recommended next step for design-tokenized production primitives.

## 6. State Management Design

Zustand persists the studio state into localStorage under `slot-matrix-studio`.

Core slices:
- Project slice: projects, active project, search, import/export data shape.
- Matrix slice: rows, cols, cells, raw mode, selected cell, locked reels, undo/redo.
- Preset slice: save/load matrix presets and scenario presets.
- Form slice: dynamic field configs and runtime form values.
- API slice: method, endpoint, headers, token, environment, websocket mode, response, logs.

## 7. API Architecture

Request payload shape now matches the staging cheat endpoint as form data / URL-encoded body:

```text
serviceId=9703
userId=game_rampusd01
matrixData=C3,C3,C2,C3,C3,C3,K,C3,A,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3,C3
tableFormat=4,4,4,4,4
powerUpSymbolCode=C3,C3,C3,...
```

The API panel supports POST to `https://cheat.staging.enostd.gay/9703/inputed`, URL-encoded form body, optional bearer token injection, enabled headers, response status/time, response viewer, and replay from history. Browser CORS/network failures are surfaced as structured error responses.

## 8. Responsive Strategy

Desktop-first with a two-column operator workspace:
- `>=1280px`: sidebar + primary matrix/API column + inspector column.
- `<1280px`: inspector stacks below primary content in a two-card grid.
- Tablet can keep horizontal scrolling for matrix-heavy workflows because operator tables need stable cell sizing.

## 9. UX Improvements

- Sticky command bar with environment and save state.
- Ctrl + Enter sends request.
- Ctrl + S saves current matrix preset.
- Arrow keys navigate matrix cells.
- Paste from Excel tabular data into matrix.
- One-click generators: random, sequential, near win, freespin, scatter, wild fill.
- Reel locks preserve chosen columns during generators.
- Request history supports replay.
- Preset panel supports scenario shortcuts.

## 10. Example Screens

- Project Workspace: sidebar, command bar, matrix editor.
- API Console: endpoint/method/header form, request preview, response viewer.
- Scenario Lab: preset launcher, saved presets, symbol statistics.
- Payload Builder: rendered QA form plus editable field configuration.
