import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionDir = resolve(root, "extension");
const outputDir = resolve(root, "public");
const outputFile = resolve(outputDir, "slot-matrix-dock-extension.zip");

await mkdir(outputDir, { recursive: true });
await rm(outputFile, { force: true });

await new Promise((resolvePromise, reject) => {
  const child = spawn("zip", ["-qr", outputFile, "."], {
    cwd: extensionDir,
    stdio: "inherit"
  });

  child.on("error", reject);
  child.on("close", (code) => {
    if (code === 0) resolvePromise();
    else reject(new Error(`zip exited with code ${code}`));
  });
});

console.log(`Packaged extension: ${outputFile}`);
