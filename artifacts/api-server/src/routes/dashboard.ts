import { Router, type IRouter } from "express";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { db, productsTable, salesTable, purchasesTable, campaignsTable } from "@workspace/db";
import { GetDashboardQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard", async (req, res): Promise<void> => {
  const query = GetDashboardQueryParams.safeParse(req.query);
  const days = (query.success ? query.data.days : null) ?? 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const recentSales = await db
    .select({
      id: salesTable.id,
      sku: salesTable.sku,
      productName: productsTable.name,
      quantitySold: salesTable.quantitySold,
      totalCashReceived: salesTable.totalCashReceived,
      costOfGoods: salesTable.costOfGoods,
      profit: salesTable.profit,
      saleDate: salesTable.saleDate,
    })
    .from(salesTable)
    .leftJoin(productsTable, eq(salesTable.sku, productsTable.sku))
    .where(gte(salesTable.saleDate, cutoff));

  const totalRevenue = recentSales.reduce((s, sale) => s + sale.totalCashReceived, 0);
  const totalCogs = recentSales.reduce((s, sale) => s + sale.costOfGoods, 0);

  const campaigns = await db.select().from(campaignsTable);
  const totalMarketingSpend = campaigns.reduce((s, c) => s + c.adSpend, 0);

  const netProfit = totalRevenue - totalCogs - totalMarketingSpend;

  const allProducts = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.isActive, true));

  let totalInventoryValue = 0;
  const lowStockItems: Array<{ sku: string; name: string; currentStock: number; reorderThreshold: number }> = [];

  for (const product of allProducts) {
    const totalPurchased = await db
      .select({ total: sql<number>`coalesce(sum(${purchasesTable.quantityBaseUnits}), 0)` })
      .from(purchasesTable)
      .where(and(eq(purchasesTable.sku, product.sku), eq(purchasesTable.status, "arrived")));

    const totalSold = await db
      .select({ total: sql<number>`coalesce(sum(${salesTable.quantitySold}), 0)` })
      .from(salesTable)
      .where(eq(salesTable.sku, product.sku));

    const currentStock = Number(totalPurchased[0]?.total ?? 0) - Number(totalSold[0]?.total ?? 0);

    const arrivedPurchases = await db
      .select()
      .from(purchasesTable)
      .where(and(eq(purchasesTable.sku, product.sku), eq(purchasesTable.status, "arrived")));

    let averageLandedCost = 0;
    if (arrivedPurchases.length > 0) {
      const totalUnits = arrivedPurchases.reduce((s, p) => s + p.quantityBaseUnits, 0);
      const totalCostAll = arrivedPurchases.reduce((s, p) => s + (p.totalProductCost + p.transportCost), 0);
      averageLandedCost = totalUnits > 0 ? Math.round(totalCostAll / totalUnits) : 0;
    }

    totalInventoryValue += currentStock * averageLandedCost;

    if (currentStock < product.reorderThreshold) {
      lowStockItems.push({
        sku: product.sku,
        name: product.name,
        currentStock,
        reorderThreshold: product.reorderThreshold,
      });
    }
  }

  const salesBySku: Record<string, { sku: string; name: string; unitsSold: number; revenue: number }> = {};
  for (const sale of recentSales) {
    if (!salesBySku[sale.sku]) {
      salesBySku[sale.sku] = { sku: sale.sku, name: sale.productName ?? sale.sku, unitsSold: 0, revenue: 0 };
    }
    salesBySku[sale.sku].unitsSold += sale.quantitySold;
    salesBySku[sale.sku].revenue += sale.totalCashReceived;
  }

  const topSellers = Object.values(salesBySku)
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 3);

  res.json({
    netProfit,
    totalRevenue,
    totalCogs,
    totalMarketingSpend,
    totalInventoryValue,
    lowStockItems,
    topSellers,
    days,
  });
});

export default router;
