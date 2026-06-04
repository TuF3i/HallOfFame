import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} exited with code ${code ?? "unknown"}.`));
    });
  });
}

await run("TypeScript", [path.join(root, "node_modules", "typescript", "bin", "tsc"), "--noEmit"]);
await run("Vite", [path.join(root, "node_modules", "vite", "bin", "vite.js"), "build"]);
