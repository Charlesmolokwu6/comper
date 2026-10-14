/**
 * Regenerates server/fares/data/network.json: every live operator's departure terminals
 * and the destinations served from each. The server loads it at boot so the city pickers
 * are complete even when the runtime cache is empty (Render free tier); live data
 * refreshes over it.
 *   pnpm fares:network
 * Takes a few minutes: requests to each operator are spaced out (FARE_REQUEST_GAP_MS).
 */
import fs from "node:fs";
import path from "node:path";
import { refreshNetwork, snapshotStops } from "../server/fares/store";

const errors = await refreshNetwork({ onlyMissingOrOld: false });
const stops = snapshotStops();
const file = path.resolve(
  import.meta.dirname,
  "../server/fares/data/network.json"
);
fs.writeFileSync(
  file,
  JSON.stringify({ generatedAt: new Date().toISOString(), stops }, null, 1) +
    "\n"
);
const lists = Object.keys(stops).length;
console.log(`Wrote ${lists} route lists to ${file}`);
for (const e of errors) console.warn("WARN", e);
if (errors.length) process.exitCode = 1;
