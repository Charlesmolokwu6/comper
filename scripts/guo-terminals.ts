/**
 * Regenerates server/guo/data/terminals.json from guotransport.com.
 *   pnpm guo:terminals
 */
import fs from "node:fs";
import path from "node:path";
import { fetchRoutes, fetchTerminalsPage } from "../server/guo/client";
import { buildTerminals } from "../server/guo/terminalFixes";

const [raw, routes] = await Promise.all([fetchTerminalsPage(), fetchRoutes()]);
const { terminals, warnings } = buildTerminals(raw, routes);
const file = path.resolve(
  import.meta.dirname,
  "../server/guo/data/terminals.json"
);
fs.writeFileSync(file, JSON.stringify(terminals, null, 2) + "\n");
console.log(
  `Wrote ${terminals.length} terminals (${terminals.filter(t => t.bookable).length} bookable) to ${file}`
);
for (const w of warnings) console.warn("WARN", w);
