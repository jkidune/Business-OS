import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull(),
  supplier: text("supplier").notNull(),
  quantityBaseUnits: integer("quantity_base_units").notNull(),
  totalProductCost: integer("total_product_cost").notNull(),
  transportCost: integer("transport_cost").notNull().default(0),
  landedUnitCost: integer("landed_unit_cost").notNull(),
  status: text("status").notNull().default("pending"),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }).notNull(),
  expectedArrivalDate: timestamp("expected_arrival_date", { withTimezone: true }),
  arrivedAt: timestamp("arrived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPurchaseSchema = createInsertSchema(purchasesTable).omit({ id: true, createdAt: true });
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchasesTable.$inferSelect;
