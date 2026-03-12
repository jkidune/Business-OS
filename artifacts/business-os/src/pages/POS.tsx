import { useState, useMemo } from "react";
import { useListProducts, useCreateSale, useListCampaigns } from "@workspace/api-client-react";
import { cn, formatTZS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Plus, Minus, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListProductsQueryKey } from "@workspace/api-client-react";

type CartItem = {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
};

export default function POS() {
  const { data: products } = useListProducts({ includeArchived: false });
  const { data: campaigns } = useListCampaigns();
  const createSaleMutation = useCreateSale();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | "">("");

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = (product: any) => {
    if (product.currentStock <= 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.sku === product.sku);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          toast({ title: "Max stock reached", variant: "destructive" });
          return prev;
        }
        return prev.map(i => i.sku === product.sku ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { sku: product.sku, name: product.name, price: product.sellingPrice, quantity: 1, maxStock: product.currentStock }];
    });
  };

  const updateQuantity = (sku: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.sku === sku) {
        const newQ = item.quantity + delta;
        if (newQ > item.maxStock) {
          toast({ title: "Max stock reached", variant: "destructive" });
          return item;
        }
        return { ...item, quantity: Math.max(0, newQ) };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      // Loop to create individual sales since backend expects single items
      await Promise.all(cart.map(item => 
        createSaleMutation.mutateAsync({
          data: {
            sku: item.sku,
            quantitySold: item.quantity,
            totalCashReceived: item.price * item.quantity,
            campaignId: selectedCampaignId || undefined,
            saleDate: new Date().toISOString()
          }
        })
      ));
      toast({ title: "Sale completed successfully!" });
      setCart([]);
      setSelectedCampaignId("");
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (error: any) {
      toast({ title: "Checkout failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Product Grid (Left) */}
      <div className="flex-1 flex flex-col h-full bg-background">
        <div className="p-4 border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search products by name or SKU..." 
              className="pl-10 h-12 rounded-xl bg-secondary/50 border-white/5 focus-visible:ring-primary/50 text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.sku}
                onClick={() => addToCart(product)}
                disabled={product.currentStock <= 0}
                className="text-left group flex flex-col h-full p-4 rounded-2xl bg-card border border-white/5 shadow-md hover:shadow-xl hover:border-primary/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:border-white/5"
              >
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{product.sku}</span>
                    {product.currentStock <= 5 && product.currentStock > 0 && (
                      <span className="text-xs text-amber-500 font-bold animate-pulse">Low</span>
                    )}
                  </div>
                  <h3 className="font-medium text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                </div>
                <div className="mt-4 w-full flex items-end justify-between">
                  <span className="font-display font-bold text-lg text-foreground">{formatTZS(product.sellingPrice)}</span>
                  <span className={cn("text-sm font-medium", product.currentStock > 0 ? "text-muted-foreground" : "text-destructive")}>
                    {product.currentStock > 0 ? `${product.currentStock} in stock` : 'Out of stock'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Sidebar (Right) */}
      <div className="w-full md:w-96 border-l border-border bg-card/80 backdrop-blur-xl flex flex-col h-[50vh] md:h-full z-20 shadow-2xl md:shadow-none">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> Current Order
          </h2>
          <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">
            {cart.reduce((a,b) => a+b.quantity, 0)} items
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <ShoppingCart className="w-16 h-16 mb-4" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.sku} className="flex flex-col gap-3 p-3 rounded-xl bg-secondary/40 border border-white/5 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-start">
                  <span className="font-medium leading-tight pr-2">{item.name}</span>
                  <span className="font-bold text-primary shrink-0">{formatTZS(item.price * item.quantity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">{formatTZS(item.price)} each</div>
                  <div className="flex items-center gap-2 bg-background rounded-lg p-1 border border-border">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:text-destructive" onClick={() => updateQuantity(item.sku, -1)}>
                      {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </Button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:text-primary" onClick={() => updateQuantity(item.sku, 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-card border-t border-border space-y-4">
          {campaigns && campaigns.length > 0 && (
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select 
                className="w-full pl-9 h-10 rounded-xl bg-secondary/50 border border-white/5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">No Campaign (Organic)</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex justify-between items-end pb-2">
            <span className="text-muted-foreground">Total</span>
            <span className="text-3xl font-display font-bold text-foreground">{formatTZS(cartTotal)}</span>
          </div>
          
          <Button 
            className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
            disabled={cart.length === 0 || createSaleMutation.isPending}
            onClick={handleCheckout}
          >
            {createSaleMutation.isPending ? "Processing..." : "Complete Checkout"}
          </Button>
        </div>
      </div>
    </div>
  );
}
