import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, productsTable, purchasesTable, salesTable } from "@workspace/db";
import {
  CreateProductBody,
  UpdateProductParams,
  UpdateProductBody,
  GetProductParams,
  ArchiveProductParams,
  ListProductsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getProductWithStats(sku: string) {
  const product = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.sku, sku))
    .limit(1);

  if (!product[0]) return null;

  const totalPurchased = await db
    .select({ total: sql<number>`coalesce(sum(${purchasesTable.quantityBaseUnits}), 0)` })
    .from(purchasesTable)
    .where(and(eq(purchasesTable.sku, sku), eq(purchasesTable.status, "arrived")));

  const totalSold = await db
    .select({ total: sql<number>`coalesce(sum(${salesTable.quantitySold}), 0)` })
    .from(salesTable)
    .where(eq(salesTable.sku, sku));

  const currentStock = Number(totalPurchased[0]?.total ?? 0) - Number(totalSold[0]?.total ?? 0);

  const arrivedPurchases = await db
    .select()
    .from(purchasesTable)
    .where(and(eq(purchasesTable.sku, sku), eq(purchasesTable.status, "arrived")));

  let averageLandedCost = 0;
  if (arrivedPurchases.length > 0) {
    const totalUnits = arrivedPurchases.reduce((s, p) => s + p.quantityBaseUnits, 0);
    const totalCost = arrivedPurchases.reduce((s, p) => s + (p.totalProductCost + p.transportCost), 0);
    averageLandedCost = totalUnits > 0 ? Math.round(totalCost / totalUnits) : 0;
  }

  const sellingPrice = product[0].sellingPrice;
  const profitMarginPercent = averageLandedCost > 0
    ? Math.round(((sellingPrice - averageLandedCost) / sellingPrice) * 10000) / 100
    : 0;

  return {
    ...product[0],
    currentStock,
    averageLandedCost,
    profitMarginPercent,
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  const includeArchived = query.success ? query.data.includeArchived : false;

  const products = await db
    .select()
    .from(productsTable)
    .where(includeArchived ? undefined : eq(productsTable.isActive, true))
    .orderBy(productsTable.name);

  const results = await Promise.all(products.map(async (p) => {
    const withStats = await getProductWithStats(p.sku);
    return withStats ?? { ...p, currentStock: 0, averageLandedCost: 0, profitMarginPercent: 0 };
  }));

  res.json(results);
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const existing = await db.select().from(productsTable).where(eq(productsTable.sku, parsed.data.sku)).limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "conflict", message: `SKU '${parsed.data.sku}' already exists` });
    return;
  }

  await db.insert(productsTable).values(parsed.data);
  const product = await getProductWithStats(parsed.data.sku);
  res.status(201).json(product);
});

router.get("/products/:sku", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.sku) ? req.params.sku[0] : req.params.sku;
  const product = await getProductWithStats(raw);
  if (!product) {
    res.status(404).json({ error: "not_found", message: "Product not found" });
    return;
  }
  res.json(product);
});

router.put("/products/:sku", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(productsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(productsTable.sku, params.data.sku))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Product not found" });
    return;
  }

  const product = await getProductWithStats(params.data.sku);
  res.json(product);
});

router.delete("/products/:sku", async (req, res): Promise<void> => {
  const params = ArchiveProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const [updated] = await db
    .update(productsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(productsTable.sku, params.data.sku))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "not_found", message: "Product not found" });
    return;
  }

  const product = await getProductWithStats(params.data.sku);
  res.json(product);
});

export default router;
