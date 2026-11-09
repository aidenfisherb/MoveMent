// Fails the build if a file imports across layers it shouldn't. See ARCHITECTURE.md.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SRC = resolve("src");
const SHARED_FEATURES = ["body"]; // features other features may use

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f)) files.push(p);
  }
})(SRC);

const layerOf = (p) => {
  const [top, sub] = relative(SRC, p).split("/");
  return top === "features" ? { layer: "features", feature: sub } : { layer: top.replace(/\.tsx?$/, "") };
};

const allowed = {
  lib: ["lib"],
  ui: ["ui", "lib"],
  data: ["data", "lib"],
  features: ["features", "data", "ui", "lib"],
  app: ["app", "features", "data", "ui", "lib"],
  main: ["app", "styles"]
};

const problems = [];
for (const file of files) {
  const from = layerOf(file);
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/^\s*import\s+(type\s+)?[^;]*?from\s+"(\.[^"]+)"/gm)) {
    const typeOnly = !!m[1];
    const to = layerOf(resolve(dirname(file), m[2]));
    const where = `${relative(SRC, file)} -> ${m[2]}`;
    // Type-only imports of data types and the route type are fine anywhere.
    if (typeOnly && (to.layer === "data" || to.layer === "app")) continue;
    if (!(allowed[from.layer] || []).includes(to.layer)) problems.push(`${where}: ${from.layer}/ may not import ${to.layer}/`);
    else if (from.layer === "features" && to.layer === "features" && to.feature !== from.feature && !SHARED_FEATURES.includes(to.feature))
      problems.push(`${where}: features/${from.feature} may not import features/${to.feature} (only shared features: ${SHARED_FEATURES.join(", ")})`);
  }
}

if (problems.length) {
  console.error("Architecture check failed:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`Architecture check passed (${files.length} files).`);
