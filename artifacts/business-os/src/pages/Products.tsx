import { useState } from "react";
import { useListProducts, useCreateProduct, getListProductsQueryKey } from "@workspace/api-client-react";
import { cn, formatTZS, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Percent } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  sku: z.string().min(1, "SKU required"),
  name: z.string().min(1, "Name required"),
  category: z.string().min(1, "Category required"),
  baseUnitName: z.string().min(1, "Unit name required"),
  sellingPrice: z.coerce.number().min(0),
  reorderThreshold: z.coerce.number().min(0),
});

export default function Products() {
  const { data: products, isLoading } = useListProducts({ includeArchived: false });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateProduct();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseUnitName: "pcs",
      reorderThreshold: 10
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createMutation.mutateAsync({
        data: {
          ...values,
          sellingPrice: Math.round(values.sellingPrice * 100), // convert to cents
        }
      });
      toast({ title: "Product created successfully" });
      setDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to create", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Products & Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your catalog, pricing, and stock levels.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Add New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">SKU</label>
                  <Input {...form.register("sku")} placeholder="e.g. LIPS-001" className="bg-background rounded-xl" />
                  {form.formState.errors.sku && <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Input {...form.register("category")} placeholder="e.g. Cosmetics" className="bg-background rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Name</label>
                <Input {...form.register("name")} placeholder="Ruby Red Lipstick" className="bg-background rounded-xl" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Name</label>
                  <Input {...form.register("baseUnitName")} placeholder="pcs" className="bg-background rounded-xl" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Selling Price (TZS)</label>
                  <Input type="number" {...form.register("sellingPrice")} placeholder="15000" className="bg-background rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Low Stock Threshold</label>
                <Input type="number" {...form.register("reorderThreshold")} placeholder="10" className="bg-background rounded-xl" />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl mt-6 text-lg" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-white/5 bg-card/50 backdrop-blur overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="font-medium text-muted-foreground w-24">SKU</TableHead>
              <TableHead className="font-medium text-muted-foreground">Product</TableHead>
              <TableHead className="font-medium text-muted-foreground">Category</TableHead>
              <TableHead className="font-medium text-muted-foreground text-right">Stock</TableHead>
              <TableHead className="font-medium text-muted-foreground text-right">Avg Cost</TableHead>
              <TableHead className="font-medium text-muted-foreground text-right">Price</TableHead>
              <TableHead className="font-medium text-muted-foreground text-right w-24">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Loading products...</TableCell></TableRow>
            ) : products?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No products found. Add your first product!</TableCell></TableRow>
            ) : (
              products?.map((product) => (
                <TableRow key={product.sku} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium border border-white/5">{product.category}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-bold",
                      product.currentStock <= product.reorderThreshold ? "text-amber-500" : "text-foreground"
                    )}>
                      {formatNumber(product.currentStock)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">{product.baseUnitName}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {formatTZS(product.averageLandedCost)}
                  </TableCell>
                  <TableCell className="text-right font-display font-bold text-primary">
                    {formatTZS(product.sellingPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 font-bold text-emerald-500">
                      {Math.round(product.profitMarginPercent)}<Percent className="w-3 h-3" />
                    </div>
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
