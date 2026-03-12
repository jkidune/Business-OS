import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, campaignsTable, salesTable, productsTable } from "@workspace/db";
import {
  CreateCampaignBody,
  GetCampaignParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/campaigns", async (_req, res): Promise<void> => {
  const campaigns = await db
    .select()
    .from(campaignsTable)
    .orderBy(campaignsTable.startDate);

  res.json(campaigns.map(c => ({
    id: c.id,
    name: c.name,
    adSpend: c.adSpend,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .insert(campaignsTable)
    .values({
      name: parsed.data.name,
      adSpend: parsed.data.adSpend,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    })
    .returning();

  res.status(201).json({
    id: campaign.id,
    name: campaign.name,
    adSpend: campaign.adSpend,
    startDate: campaign.startDate.toISOString(),
    endDate: campaign.endDate?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
  });
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetCampaignParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: "validation_error", message: params.error.message });
    return;
  }

  const campaign = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, params.data.id))
    .limit(1);

  if (!campaign[0]) {
    res.status(404).json({ error: "not_found", message: "Campaign not found" });
    return;
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
    .where(eq(salesTable.campaignId, params.data.id));

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalCashReceived, 0);
  const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);
  const unitsSold = sales.reduce((s, sale) => s + sale.quantitySold, 0);
  const adSpend = campaign[0].adSpend;
  const costPerAcquisition = unitsSold > 0 ? Math.round(adSpend / unitsSold) : adSpend;
  const roi = adSpend > 0 ? Math.round(((totalProfit - adSpend) / adSpend) * 10000) / 100 : 0;

  res.json({
    id: campaign[0].id,
    name: campaign[0].name,
    adSpend: campaign[0].adSpend,
    startDate: campaign[0].startDate.toISOString(),
    endDate: campaign[0].endDate?.toISOString() ?? null,
    totalRevenue,
    totalProfit,
    unitsSold,
    costPerAcquisition,
    roi,
    sales: sales.map(s => ({
      ...s,
      productName: s.productName ?? s.sku,
      campaignName: s.campaignName ?? null,
      saleDate: s.saleDate.toISOString(),
    })),
  });
});

export default router;
