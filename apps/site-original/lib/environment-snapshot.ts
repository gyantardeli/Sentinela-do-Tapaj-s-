import { readEnvironmentCache } from "./environment-store";
import { resolveEnvironment } from "./environment-resolver";
const snapshots = new Map<string, { until: number; value: Promise<Awaited<ReturnType<typeof resolveEnvironment>>> }>();
export async function loadEnvironmentSnapshot() {
  const stored = await readEnvironmentCache(), key = JSON.stringify([stored.air, stored.weather]), prior = snapshots.get(key);
  if (prior && prior.until > Date.now()) return prior.value;
  const value = resolveEnvironment(stored, Math.floor(Date.now() / 1000)); snapshots.set(key, { until: Date.now() + 600_000, value });
  while (snapshots.size > 3) snapshots.delete(snapshots.keys().next().value!);
  return value;
}
