import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, purchasesTable, productsTable } from "@workspace/db";
import {
  CreatePurchaseBody,
  MarkPurchaseArrivedParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatPurchase(purchase: typeof purchasesTable.$inferSelect & { productName?: string }) {
  return {
    id: purchase.id,
    sku: purchase.sku,
    productName: purchase.productName ?? purchase.sku,
    supplier: purchase.supplier,
    quantityBaseUnits: purchase.quantityBaseUnits,
    totalProductCost: purchase.totalProductCost,
    transportCost: purchase.transportCost,
    landedUnitCost: purchase.landedUnitCost,
    status: purchase.status,
    purchaseDate: purchase.purchaseDate.toISOString(),
    expectedArrivalDate: purchase.expectedArrivalDate?.toISOString() ?? null,
    arrivedAt: purchase.arrivedAt?.toISOString() ?? null,
  };
}

router.get("/purchases", async (_req, res): Promise<void> => {
  const purchases = await db
    .select({
      id: purchasesTable.id,
      sku: purchasesTable.sku,
      productName: productsTable.name,
      supplier: purchasesTable.supplier,
      quantityBaseUnits: purchasesTable.quantityBaseUnits,
      totalProductCost: purchasesTable.totalProductCost,
      transportCost: purchasesTable.transportCost,
      landedUnitCost: purchasesTable.landedUnitCost,
      status: purchasesTable.status,
      purchaseDate: purchasesTable.purchaseDate,
      expectedArrivalDate: purchasesTable.expectedArrivalDate,
      arrivedAt: purchasesTable.arrivedAt,
      createdAt: purchasesTable.createdAt,
    })
    .from(purchasesTable)
    .leftJoin(productsTable, eq(purchasesTable.sku, productsTable.sku))
    .orderBy(purchasesTable.purchaseDate);

  res.json(purchases.map(p => formatPurchase({ ...p, productName: p.productName ?? p.sku })));
});

router.post("/purchases", async (req, res): Promise<void> => {
  const parsed = CreatePurchaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { sku, supplier, quantityBaseUnits, totalProductCost, transportCost, purchaseDate, expectedArrivalDate } = parsed.data;

  const landedUnitCost = Math.round((totalProductCost + transportCost) / quantityBaseUnits);

  const [purchase] = await db
    .insert(purchasesTable)
    .values({
      sku,
      supplier,
      quantityBaseUnits,
      totalProductCost,
      transportCost,
      landedUnitCost,
      status: "pending",
      purchaseDate: new Date(purchaseDate),
      expectedArrivalDate: expectedArrivalDate ? new Date(expectedArrivalDate) : null,
    })
    .returning();

  const product = await db.select().from(productsTable).where(eq(productsTable.sku, sku)).limit(1);

  res.status(201).json(formatPurchase({ ...purchase, productName: product[0]?.name ?? sku }));
});

router.post("/purchases/:id/arrive", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = MarkPurchaseArrivedParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(purchasesTable)
    .where(eq(purchasesTable.id, params.data.id))
    .limit(1);

  if (!existing[0]) {
    res.status(404).json({ error: "not_found", message: "Purchase not found" });
    return;
  }

  if (existing[0].status === "arrived") {
    res.status(400).json({ error: "already_arrived", message: "Purchase already marked as arrived" });
    return;
  }

  const [updated] = await db
    .update(purchasesTable)
    .set({ status: "arrived", arrivedAt: new Date() })
    .where(and(eq(purchasesTable.id, params.data.id), eq(purchasesTable.status, "pending")))
    .returning();

  const product = await db.select().from(productsTable).where(eq(productsTable.sku, updated.sku)).limit(1);

  res.json(formatPurchase({ ...updated, productName: product[0]?.name ?? updated.sku }));
});

export default router;
