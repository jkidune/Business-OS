import { useState } from "react";
import { useListPurchases, useCreatePurchase, useMarkPurchaseArrived, useListProducts, getListPurchasesQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { formatTZS, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  sku: z.string().min(1, "Select a product"),
  supplier: z.string().min(1, "Supplier required"),
  quantityBaseUnits: z.coerce.number().min(1),
  totalProductCost: z.coerce.number().min(0),
  transportCost: z.coerce.number().min(0),
  expectedArrivalDate: z.string().optional(),
});

export default function Purchases() {
  const { data: purchases, isLoading } = useListPurchases();
  const { data: products } = useListProducts({ includeArchived: false });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreatePurchase();
  const markArrivedMutation = useMarkPurchaseArrived();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createMutation.mutateAsync({
        data: {
          ...values,
          totalProductCost: Math.round(values.totalProductCost * 100),
          transportCost: Math.round(values.transportCost * 100),
          purchaseDate: new Date().toISOString(),
          expectedArrivalDate: values.expectedArrivalDate ? new Date(values.expectedArrivalDate).toISOString() : undefined,
        }
      });
      toast({ title: "Purchase logged successfully" });
      setDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to log", description: e.message, variant: "destructive" });
    }
  };

  const handleMarkArrived = async (id: number) => {
    try {
      await markArrivedMutation.mutateAsync({ id });
      toast({ title: "Stock updated successfully!" });
      queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Supply Chain</h1>
          <p className="text-muted-foreground mt-1">Log purchases and track incoming inventory to calculate landed costs.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6">
              <Truck className="w-4 h-4" /> Log Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">New Purchase Batch</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product</label>
                <select {...form.register("sku")} className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 outline-none">
                  <option value="">Select a product...</option>
                  {products?.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier</label>
                <Input {...form.register("supplier")} placeholder="e.g. Dubai Wholesale" className="bg-background rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Quantity (Base Units)</label>
                <Input type="number" {...form.register("quantityBaseUnits")} placeholder="100" className="bg-background rounded-xl" />
                <p className="text-xs text-muted-foreground">Calculate: Boxes × Units per box</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Cost (TZS)</label>
                  <Input type="number" {...form.register("totalProductCost")} placeholder="500000" className="bg-background rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transport/Fees (TZS)</label>
                  <Input type="number" {...form.register("transportCost")} placeholder="50000" className="bg-background rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Arrival Date (Optional)</label>
                <Input type="date" {...form.register("expectedArrivalDate")} className="bg-background rounded-xl" />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl mt-6 text-lg" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Logging..." : "Log Purchase"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-white/5 bg-card/50 backdrop-blur overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="font-medium text-muted-foreground">Date</TableHead>
              <TableHead className="font-medium text-muted-foreground">Product</TableHead>
              <TableHead className="font-medium text-muted-foreground">Supplier</TableHead>
              <TableHead className="font-medium text-muted-foreground text-right">Qty</TableHead>
              <TableHead className="font-medium text-muted-foreground text-right">Landed Unit Cost</TableHead>
              <TableHead className="font-medium text-muted-foreground text-center">Status</TableHead>
              <TableHead className="font-medium text-muted-foreground text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Loading purchases...</TableCell></TableRow>
            ) : purchases?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No purchases logged yet.</TableCell></TableRow>
            ) : (
              purchases?.map((purchase) => (
                <TableRow key={purchase.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="text-sm">
                    {new Date(purchase.purchaseDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {purchase.productName}
                    <div className="text-xs font-mono text-muted-foreground">{purchase.sku}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{purchase.supplier}</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatNumber(purchase.quantityBaseUnits)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-primary font-medium">
                    {formatTZS(purchase.landedUnitCost)}
                  </TableCell>
                  <TableCell className="text-center">
                    {purchase.status === 'arrived' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Arrived
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {purchase.status === 'pending' && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => handleMarkArrived(purchase.id)}
                        disabled={markArrivedMutation.isPending}
                      >
                        Mark Arrived
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
