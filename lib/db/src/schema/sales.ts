import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull(),
  quantitySold: integer("quantity_sold").notNull(),
  totalCashReceived: integer("total_cash_received").notNull(),
  costOfGoods: integer("cost_of_goods").notNull(),
  profit: integer("profit").notNull(),
  campaignId: integer("campaign_id"),
  saleDate: timestamp("sale_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
