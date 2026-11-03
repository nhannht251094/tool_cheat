# Tool Cheat React

A Vite + React + TypeScript starter project for a local tool/config dashboard.

## Install

```bash
npm install
```

## Run local

```bash
npm run dev
```

Open the local URL printed in the terminal.

## Import game responses

Import also accepts response arrays such as `[[{"9650":{"data":{"mx0":["A","2"],"fmt":["11"],"s":1}}}]]`.
Each response becomes a Saved Form in source order. The importer uses `mx0` (or
`mx` when absent) and `fmt`, keeping each batch/game in a separate project. For
9650 it maps the layout to `matrixLightningData` and recognizes Normal/Free from
the current state, including Respin substate.

The new project uses the source filename and currently selected environment.
STAGING is the default; an explicitly selected or imported DEV environment is preserved.
Enter a User ID and choose **Apply All** before sending; response player IDs,
wallets, wins and other runtime metadata are not converted into request fields.
This imports matrices and layouts; it does not replay the full response sequence.

## Build

```bash
npm run build
```

Upload the `dist` folder to any static hosting.
