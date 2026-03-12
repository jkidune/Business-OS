import { useGetCampaign } from "@workspace/api-client-react";
import { cn, formatTZS, formatNumber } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Wallet, TrendingUp, ShoppingBag } from "lucide-react";
import { Link, useParams } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading, error } = useGetCampaign(Number(id));

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading campaign details...</div>;
  }

  if (error || !campaign) {
    return <div className="p-8 text-center text-destructive">Failed to load campaign</div>;
  }

  const roiColor = campaign.roi >= 0 ? "text-emerald-500" : "text-rose-500";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <Link href="/campaigns">
          <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Campaigns
          </Button>
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">{campaign.name}</h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <span className="bg-secondary px-2 py-0.5 rounded text-xs font-mono">ID: {campaign.id}</span>
              {new Date(campaign.startDate).toLocaleDateString()} — {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : 'Ongoing'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-muted-foreground mb-1">Return on Investment</div>
            <div className={cn("text-4xl font-display font-bold", roiColor)}>
              {campaign.roi > 0 ? '+' : ''}{campaign.roi.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Ad Spend</span>
          </div>
          <div className="text-2xl font-bold font-display">{formatTZS(campaign.adSpend)}</div>
        </Card>
        
        <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur shadow-xl border-t-2 border-t-primary/50">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Generated Revenue</span>
          </div>
          <div className="text-2xl font-bold font-display text-primary">{formatTZS(campaign.totalRevenue)}</div>
        </Card>

        <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Cost per Acquisition</span>
          </div>
          <div className="text-2xl font-bold font-display">
            {campaign.unitsSold > 0 ? formatTZS(campaign.costPerAcquisition) : 'N/A'}
          </div>
        </Card>

        <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Units Sold</span>
          </div>
          <div className="text-2xl font-bold font-display">{formatNumber(campaign.unitsSold)}</div>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-display font-bold mb-4">Attributed Sales</h2>
        <div className="rounded-2xl border border-white/5 bg-card/50 backdrop-blur overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-medium text-muted-foreground">Date</TableHead>
                <TableHead className="font-medium text-muted-foreground">Product</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">Qty</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">Revenue</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.sales.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No sales attributed to this campaign yet.</TableCell></TableRow>
              ) : (
                campaign.sales.map((sale) => (
                  <TableRow key={sale.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sale.saleDate).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {sale.productName}
                      <span className="text-xs text-muted-foreground ml-2 font-mono">{sale.sku}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold">{sale.quantitySold}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatTZS(sale.totalCashReceived)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-500 font-medium">
                      {formatTZS(sale.profit)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
