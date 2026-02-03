import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFrameworkFromFile } from "../src/lib/iep/framework/loadFramework.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileArg = process.argv[2];
const xlsxPath = fileArg
  ? path.resolve(process.cwd(), fileArg)
  : path.resolve(__dirname, "..", "IEP Framework.xlsx");

const res = await loadFrameworkFromFile(xlsxPath);

console.log("\n=== Framework Preview ===");
console.log("file:", xlsxPath);
console.log("tabs:", res.map.tabs.length);

for (const t of res.map.tabs) {
  const fieldCount = t.sections.reduce((acc, s) => acc + s.fields.length, 0);
  const requiredCount = t.sections.reduce(
    (acc, s) => acc + s.fields.filter((f) => f.required).length,
    0
  );
  console.log(`- ${t.label}: sections=${t.sections.length} fields=${fieldCount} required=${requiredCount}`);
}

if (res.warnings.length) {
  console.log("\n=== Warnings ===");
  for (const w of res.warnings) console.log("-", w);
} else {
  console.log("\nNo warnings ✅");
}
