import { useGetDashboard } from "@workspace/api-client-react";
import { cn, formatTZS, formatNumber } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { 
  TrendingUp, 
  CreditCard, 
  Package, 
  Megaphone,
  AlertTriangle,
  ArrowUpRight
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [days, setDays] = useState<30 | 7>(30);
  const { data: metrics, isLoading } = useGetDashboard({ days });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Track your store's performance and inventory health.</p>
        </div>
        <div className="flex bg-secondary p-1 rounded-lg w-fit">
          <Button 
            variant={days === 7 ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setDays(7)}
            className="rounded-md"
          >
            Last 7 Days
          </Button>
          <Button 
            variant={days === 30 ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setDays(30)}
            className="rounded-md"
          >
            Last 30 Days
          </Button>
        </div>
      </div>

      {isLoading || !metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Net Profit" 
              value={formatTZS(metrics.netProfit)} 
              icon={TrendingUp} 
              trend="+12%" 
              trendUp 
              primary
            />
            <MetricCard 
              title="Total Revenue" 
              value={formatTZS(metrics.totalRevenue)} 
              icon={CreditCard} 
            />
            <MetricCard 
              title="Inventory Value" 
              value={formatTZS(metrics.totalInventoryValue)} 
              icon={Package} 
            />
            <MetricCard 
              title="Marketing Spend" 
              value={formatTZS(metrics.totalMarketingSpend)} 
              icon={Megaphone} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold font-display">Low Stock Alerts</h2>
              </div>
              {metrics.lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">All products are well stocked!</div>
              ) : (
                <div className="space-y-4">
                  {metrics.lowStockItems.map(item => (
                    <div key={item.sku} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-white/5">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-500 font-bold">{item.currentStock} left</div>
                        <div className="text-xs text-muted-foreground">Threshold: {item.reorderThreshold}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <ArrowUpRight className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold font-display">Top Sellers ({days} Days)</h2>
              </div>
              {metrics.topSellers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No sales data in this period.</div>
              ) : (
                <div className="space-y-4">
                  {metrics.topSellers.map((item, idx) => (
                    <div key={item.sku} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-white/5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary/80" />
                      <div className="flex items-center gap-4 pl-2">
                        <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-sm font-bold text-muted-foreground">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.unitsSold} units sold</div>
                        </div>
                      </div>
                      <div className="text-right font-bold text-primary">
                        {formatTZS(item.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, trendUp, primary }: any) {
  return (
    <Card className={cn(
      "p-6 rounded-2xl border-white/5 backdrop-blur shadow-xl relative overflow-hidden group transition-all duration-300 hover:-translate-y-1",
      primary ? "bg-gradient-to-br from-primary/20 to-card border-primary/20" : "bg-card/40"
    )}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-display font-bold mt-2">{value}</h3>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          primary ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-secondary text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors"
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-sm">
          <span className={cn("font-medium", trendUp ? "text-emerald-500" : "text-rose-500")}>
            {trend}
          </span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      )}
    </Card>
  )
}
