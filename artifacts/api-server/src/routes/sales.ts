import { Router, type IRouter } from "express";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { db, salesTable, productsTable, purchasesTable, campaignsTable } from "@workspace/db";
import {
  CreateSaleBody,
  ListSalesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getAverageLandedCost(sku: string): Promise<number> {
  const arrivedPurchases = await db
    .select()
    .from(purchasesTable)
    .where(and(eq(purchasesTable.sku, sku), eq(purchasesTable.status, "arrived")));

  if (arrivedPurchases.length === 0) return 0;

  const totalUnits = arrivedPurchases.reduce((s, p) => s + p.quantityBaseUnits, 0);
  const totalCost = arrivedPurchases.reduce((s, p) => s + (p.totalProductCost + p.transportCost), 0);
  return totalUnits > 0 ? Math.round(totalCost / totalUnits) : 0;
}

async function getCurrentStock(sku: string): Promise<number> {
  const totalPurchased = await db
    .select({ total: sql<number>`coalesce(sum(${purchasesTable.quantityBaseUnits}), 0)` })
    .from(purchasesTable)
    .where(and(eq(purchasesTable.sku, sku), eq(purchasesTable.status, "arrived")));

  const totalSold = await db
    .select({ total: sql<number>`coalesce(sum(${salesTable.quantitySold}), 0)` })
    .from(salesTable)
    .where(eq(salesTable.sku, sku));

  return Number(totalPurchased[0]?.total ?? 0) - Number(totalSold[0]?.total ?? 0);
}

router.get("/sales", async (req, res): Promise<void> => {
  const query = ListSalesQueryParams.safeParse(req.query);

  let whereClause = undefined as any;
  if (query.success) {
    if (query.data.campaignId) {
      whereClause = eq(salesTable.campaignId, query.data.campaignId);
    }
    if (query.data.days) {
      const cutoff = new Date(Date.now() - query.data.days * 24 * 60 * 60 * 1000);
      const dateFilter = gte(salesTable.saleDate, cutoff);
      whereClause = whereClause ? and(whereClause, dateFilter) : dateFilter;
    }
  }

  const sales = await db
    .select({
      id: salesTable.id,
      sku: salesTable.sku,
      productName: productsTable.name,
      quantitySold: salesTable.quantitySold,
      totalCashReceived: salesTable.totalCashReceived,
      costOfGoods: salesTable.costOfGoods,
      profit: salesTable.profit,
      campaignId: salesTable.campaignId,
      campaignName: campaignsTable.name,
      saleDate: salesTable.saleDate,
    })
    .from(salesTable)
    .leftJoin(productsTable, eq(salesTable.sku, productsTable.sku))
    .leftJoin(campaignsTable, eq(salesTable.campaignId, campaignsTable.id))
    .where(whereClause)
    .orderBy(desc(salesTable.saleDate));

  res.json(sales.map(s => ({
    ...s,
    productName: s.productName ?? s.sku,
    campaignName: s.campaignName ?? null,
    saleDate: s.saleDate.toISOString(),
  })));
});

router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { sku, quantitySold, totalCashReceived, campaignId, saleDate } = parsed.data;

  const product = await db.select().from(productsTable).where(eq(productsTable.sku, sku)).limit(1);
  if (!product[0]) {
    res.status(404).json({ error: "not_found", message: `Product '${sku}' not found` });
    return;
  }

  if (!product[0].isActive) {
    res.status(400).json({ error: "inactive_product", message: "Product is archived" });
    return;
  }

  const currentStock = await getCurrentStock(sku);
  if (currentStock < quantitySold) {
    res.status(400).json({ error: "insufficient_stock", message: `Insufficient stock. Available: ${currentStock}` });
    return;
  }

  const averageLandedCost = await getAverageLandedCost(sku);
  const costOfGoods = averageLandedCost * quantitySold;
  const profit = totalCashReceived - costOfGoods;

  const [sale] = await db
    .insert(salesTable)
    .values({
      sku,
      quantitySold,
      totalCashReceived,
      costOfGoods,
      profit,
      campaignId: campaignId ?? null,
      saleDate: new Date(saleDate),
    })
    .returning();

  const campaign = campaignId
    ? await db.select().from(campaignsTable).where(eq(campaignsTable.id, campaignId)).limit(1)
    : [];

  res.status(201).json({
    id: sale.id,
    sku: sale.sku,
    productName: product[0].name,
    quantitySold: sale.quantitySold,
    totalCashReceived: sale.totalCashReceived,
    costOfGoods: sale.costOfGoods,
    profit: sale.profit,
    campaignId: sale.campaignId,
    campaignName: campaign[0]?.name ?? null,
    saleDate: sale.saleDate.toISOString(),
  });
});

export default router;
