import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const radarItems = sqliteTable("radar_items", {
  id: text("id").primaryKey(), sourceId: text("source_id").notNull(), title: text("title").notNull(), url: text("url").notNull(),
  publishedAt: integer("published_at").notNull(), firstSeen: integer("first_seen").notNull(), lastSeen: integer("last_seen").notNull(),
  mode: text("mode").notNull(), places: text("places").notNull(), regions: text("regions").notNull(), topic: text("topic").notNull(), tags: text("tags").notNull(), credit: text("credit"),
}, table => [index("radar_items_published_idx").on(table.publishedAt), index("radar_items_source_idx").on(table.sourceId)]);
export const radarSourceChecks = sqliteTable("radar_source_checks", {
  sourceId: text("source_id").primaryKey(), status: text("status").notNull(), checkedAt: integer("checked_at").notNull(), lastOkAt: integer("last_ok_at"),
  found: integer("found").notNull(), accepted: integer("accepted").notNull(), detail: text("detail").notNull(), methods: text("methods").notNull(),
});
export const radarRuns = sqliteTable("radar_runs", {
  id: text("id").primaryKey(), startedAt: integer("started_at").notNull(), completedAt: integer("completed_at").notNull(),
  checked: integer("checked").notNull(), available: integer("available").notNull(), accepted: integer("accepted").notNull(), status: text("status").notNull(),
});
export const radarSettings = sqliteTable("radar_settings", { key: text("key").primaryKey(), value: text("value").notNull(), updatedAt: integer("updated_at").notNull() });

export const environmentObservations = sqliteTable("environment_observations", {
  kind: text("kind").notNull(), placeId: text("place_id").notNull(), validAt: integer("valid_at").notNull(),
  collectedAt: integer("collected_at").notNull(), value: text("value").notNull(),
}, table => [primaryKey({ columns: [table.kind, table.placeId, table.validAt] }), index("environment_observations_time_idx").on(table.validAt)]);

export const sourceHealthHistory = sqliteTable("source_health_history", {
  sourceId: text("source_id").notNull(), checkedAt: integer("checked_at").notNull(), value: text("value").notNull(),
}, table => [primaryKey({ columns: [table.sourceId, table.checkedAt] }), index("source_health_time_idx").on(table.checkedAt)]);

export const fireArchiveDays = sqliteTable("fire_archive_days", {
  dayUtc: text("day_utc").primaryKey(), collectedAt: integer("collected_at").notNull(), value: text("value").notNull(),
});

export const alertEvents = sqliteTable("alert_events", {
  id: text("id").primaryKey(), ruleId:text("rule_id").notNull(), createdAt:integer("created_at").notNull(), value:text("value").notNull(), readAt:integer("read_at"),
}, table => [index("alert_events_time_idx").on(table.createdAt)]);

export const watchdogChecks=sqliteTable("watchdog_checks",{id:text("id").primaryKey(),checkedAt:integer("checked_at").notNull(),mode:text("mode").notNull(),value:text("value").notNull()},table=>[index("watchdog_checks_time_idx").on(table.checkedAt)]);
