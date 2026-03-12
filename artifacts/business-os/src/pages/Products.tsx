import { useState, useRef } from "react";
import { useListProducts, useCreateProduct, useBulkImportProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { cn, formatTZS, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Percent, Upload, Download, AlertTriangle, CheckCircle2, X, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";

const formSchema = z.object({
  sku: z.string().min(1, "SKU required"),
  name: z.string().min(1, "Name required"),
  category: z.string().min(1, "Category required"),
  baseUnitName: z.string().min(1, "Unit name required"),
  sellingPrice: z.coerce.number().min(0),
  reorderThreshold: z.coerce.number().min(0),
});

const CSV_COLUMNS = [
  { key: "sku", label: "SKU", example: "MSK-01", required: true, desc: "Unique product code" },
  { key: "name", label: "Name", example: "Facial Mask (Single)", required: true, desc: "Full product name" },
  { key: "category", label: "Category", example: "Skincare", required: true, desc: "Product category" },
  { key: "base_unit_name", label: "base_unit_name", example: "Single Mask", required: true, desc: "Smallest sellable unit" },
  { key: "selling_price_tzs", label: "selling_price_tzs", example: "3000", required: true, desc: "Retail price in TZS (whole number)" },
  { key: "reorder_threshold", label: "reorder_threshold", example: "20", required: false, desc: "Alert below this stock (default 10)" },
];

const CSV_TEMPLATE = [
  "sku,name,category,base_unit_name,selling_price_tzs,reorder_threshold",
  "MSK-01,Facial Mask (Single),Skincare,Single Mask,3000,20",
  "LIP-09,Matte Lipstick,Makeup,Piece,15000,5",
  "DRS-02,Red Summer Dress,Clothing,Piece,45000,3",
].join("\n");

type ParsedRow = { sku: string; name: string; category: string; baseUnitName: string; sellingPrice: number; reorderThreshold: number };
type ImportResult = { imported: number; skipped: number; errors: { row: number; sku?: string; reason: string }[] };

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "businessos-products-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Products() {
  const { data: products, isLoading } = useListProducts({ includeArchived: false });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateProduct();
  const bulkMutation = useBulkImportProducts();

  // CSV import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { baseUnitName: "pcs", reorderThreshold: 10 }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createMutation.mutateAsync({
        data: { ...values, sellingPrice: Math.round(values.sellingPrice * 100) }
      });
      toast({ title: "Product created successfully" });
      setDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to create", description: e.message, variant: "destructive" });
    }
  };

  function parseCSVFile(file: File) {
    setFileName(file.name);
    setParsedRows([]);
    setParseErrors([]);
    setImportResult(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ParsedRow[] = [];
        const errs: string[] = [];

        results.data.forEach((raw, i) => {
          const rowNum = i + 2;
          const sku = (raw.sku || raw.SKU || "").trim();
          const name = (raw.name || raw.Name || raw.NAME || "").trim();
          const category = (raw.category || raw.Category || "").trim();
          const baseUnitName = (raw.base_unit_name || raw.baseUnitName || raw["Base Unit Name"] || "").trim();
          const priceRaw = (raw.selling_price_tzs || raw.sellingPrice || raw.price || "").replace(/,/g, "").trim();
          const sellingPrice = parseFloat(priceRaw);
          const reorderThreshold = parseInt((raw.reorder_threshold || raw.reorderThreshold || "10").trim(), 10);

          if (!sku) { errs.push(`Row ${rowNum}: SKU is required`); return; }
          if (!name) { errs.push(`Row ${rowNum}: Name is required`); return; }
          if (!category) { errs.push(`Row ${rowNum}: Category is required`); return; }
          if (!baseUnitName) { errs.push(`Row ${rowNum}: base_unit_name is required`); return; }
          if (isNaN(sellingPrice) || sellingPrice < 0) { errs.push(`Row ${rowNum}: selling_price_tzs must be a valid number`); return; }

          rows.push({ sku, name, category, baseUnitName, sellingPrice, reorderThreshold: isNaN(reorderThreshold) ? 10 : reorderThreshold });
        });

        setParsedRows(rows);
        setParseErrors(errs);
      },
      error: (err) => {
        setParseErrors([`Failed to parse file: ${err.message}`]);
      }
    });
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) parseCSVFile(file);
    else setParseErrors(["Please upload a .csv file"]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseCSVFile(file);
  }

  async function handleImport() {
    if (parsedRows.length === 0) return;
    try {
      const result = await bulkMutation.mutateAsync({
        data: {
          products: parsedRows.map(r => ({
            sku: r.sku,
            name: r.name,
            category: r.category,
            baseUnitName: r.baseUnitName,
            sellingPrice: Math.round(r.sellingPrice * 100),
            reorderThreshold: r.reorderThreshold,
          }))
        }
      });
      setImportResult({ imported: result.imported, skipped: result.skipped, errors: result.errors });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({ title: `Imported ${result.imported} product${result.imported !== 1 ? "s" : ""}`, description: result.skipped > 0 ? `${result.skipped} skipped (already exist)` : undefined });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
  }

  function resetCsvDialog() {
    setParsedRows([]);
    setParseErrors([]);
    setImportResult(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Products & Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your catalog, pricing, and stock levels.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* CSV Import Dialog */}
          <Dialog open={csvDialogOpen} onOpenChange={(open) => { setCsvDialogOpen(open); if (!open) resetCsvDialog(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl border-white/10 gap-2 h-11 px-5 hover:bg-white/5">
                <Upload className="w-4 h-4" /> Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 sm:max-w-[700px] rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" /> Bulk Import Products from CSV
                </DialogTitle>
              </DialogHeader>

              {!importResult ? (
                <div className="space-y-5 mt-4">
                  {/* Template Guide */}
                  <div className="rounded-xl border border-white/5 bg-background/50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Required CSV Column Format
                      </span>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-white/10 rounded-lg hover:bg-white/5" onClick={downloadTemplate}>
                        <Download className="w-3 h-3" /> Download Template
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Column Header</th>
                            <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Example Value</th>
                            <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Required</th>
                            <th className="text-left px-4 py-2 text-muted-foreground font-semibold hidden sm:table-cell">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {CSV_COLUMNS.map((col, i) => (
                            <tr key={col.key} className={cn("border-b border-white/[0.03]", i % 2 === 0 ? "" : "bg-white/[0.02]")}>
                              <td className="px-4 py-2.5 font-mono text-rose-400 font-medium">{col.label}</td>
                              <td className="px-4 py-2.5 font-mono text-emerald-400">{col.example}</td>
                              <td className="px-4 py-2.5">
                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", col.required ? "bg-rose-500/10 text-rose-400" : "bg-secondary text-muted-foreground")}>
                                  {col.required ? "Required" : "Optional"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{col.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-2.5 border-t border-white/5 bg-white/[0.01]">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Example CSV row:</p>
                      <code className="text-xs font-mono text-emerald-400">MSK-01,Facial Mask (Single),Skincare,Single Mask,3000,20</code>
                    </div>
                  </div>

                  {/* Drop Zone */}
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                      isDragging ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
                    <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    {fileName ? (
                      <p className="text-sm font-medium">{fileName}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Drop your CSV file here, or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">Only .csv files are accepted</p>
                      </>
                    )}
                  </div>

                  {/* Parse Errors */}
                  {parseErrors.length > 0 && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1.5">
                      <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Validation Issues ({parseErrors.length})
                      </p>
                      {parseErrors.slice(0, 8).map((e, i) => (
                        <p key={i} className="text-xs text-amber-300/70">{e}</p>
                      ))}
                      {parseErrors.length > 8 && <p className="text-xs text-amber-400">...and {parseErrors.length - 8} more</p>}
                    </div>
                  )}

                  {/* Preview */}
                  {parsedRows.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Preview — {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} ready to import</p>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={resetCsvDialog}>
                          <X className="w-3 h-3" /> Clear
                        </Button>
                      </div>
                      <div className="rounded-xl border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto max-h-52">
                          <table className="w-full text-xs">
                            <thead className="bg-secondary/50 sticky top-0">
                              <tr>
                                <th className="text-left px-3 py-2 text-muted-foreground font-semibold">SKU</th>
                                <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Name</th>
                                <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Category</th>
                                <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Unit</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Price (TZS)</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Reorder At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedRows.map((row, i) => (
                                <tr key={i} className={cn("border-t border-white/[0.04]", i % 2 === 0 ? "" : "bg-white/[0.02]")}>
                                  <td className="px-3 py-2 font-mono text-rose-400">{row.sku}</td>
                                  <td className="px-3 py-2 font-medium">{row.name}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{row.baseUnitName}</td>
                                  <td className="px-3 py-2 text-right font-mono text-emerald-400">{row.sellingPrice.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right text-muted-foreground">{row.reorderThreshold}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <Button
                        className="w-full h-11 rounded-xl gap-2 text-sm font-semibold"
                        onClick={handleImport}
                        disabled={bulkMutation.isPending}
                      >
                        {bulkMutation.isPending ? "Importing..." : `Import ${parsedRows.length} Product${parsedRows.length !== 1 ? "s" : ""}`}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Import Result */
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-400">{importResult.imported}</p>
                      <p className="text-xs text-emerald-300/70 mt-1 font-medium">Imported</p>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-center">
                      <p className="text-2xl font-bold text-amber-400">{importResult.skipped}</p>
                      <p className="text-xs text-amber-300/70 mt-1 font-medium">Skipped</p>
                    </div>
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-center">
                      <p className="text-2xl font-bold text-rose-400">{importResult.errors.filter(e => !e.reason.includes("skipped")).length}</p>
                      <p className="text-xs text-rose-300/70 mt-1 font-medium">Errors</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="rounded-xl border border-white/5 bg-background/50 p-4 space-y-1.5 max-h-48 overflow-y-auto">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Details:</p>
                      {importResult.errors.map((e, i) => (
                        <div key={i} className={cn("flex items-start gap-2 text-xs", e.reason.includes("skipped") ? "text-amber-300/70" : "text-rose-300/70")}>
                          {e.reason.includes("skipped") ? <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400" /> : <X className="w-3 h-3 mt-0.5 flex-shrink-0 text-rose-400" />}
                          <span>Row {e.row}{e.sku ? ` (${e.sku})` : ""}: {e.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl border-white/10 hover:bg-white/5" onClick={resetCsvDialog}>
                      Import Another File
                    </Button>
                    <Button className="flex-1 rounded-xl gap-2" onClick={() => { setCsvDialogOpen(false); resetCsvDialog(); }}>
                      <CheckCircle2 className="w-4 h-4" /> Done
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Add Product Dialog */}
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
      </div>

      {/* Column Guide */}
      <div className="rounded-xl border border-white/5 bg-card/30 p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Table Column Guide</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 text-xs">
          {[
            { col: "SKU", desc: "Unique product code" },
            { col: "Product", desc: "Name + category badge" },
            { col: "Unit", desc: "Smallest sellable unit" },
            { col: "Stock", desc: "Units in stock (amber = low)" },
            { col: "Avg Cost", desc: "Weighted landed cost/unit" },
            { col: "Price", desc: "Current retail selling price" },
            { col: "Margin", desc: "(Price – Cost) ÷ Price" },
          ].map(({ col, desc }) => (
            <div key={col} className="rounded-lg bg-secondary/50 px-3 py-2 border border-white/[0.04]">
              <p className="font-semibold text-foreground">{col}</p>
              <p className="text-muted-foreground mt-0.5 leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-white/5 bg-card/50 backdrop-blur overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="font-semibold text-muted-foreground w-24">SKU</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Product</TableHead>
              <TableHead className="font-semibold text-muted-foreground hidden md:table-cell">Unit</TableHead>
              <TableHead className="font-semibold text-muted-foreground text-right">Stock</TableHead>
              <TableHead className="font-semibold text-muted-foreground text-right hidden sm:table-cell">Avg Cost</TableHead>
              <TableHead className="font-semibold text-muted-foreground text-right">Price</TableHead>
              <TableHead className="font-semibold text-muted-foreground text-right w-24">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Loading products...</TableCell></TableRow>
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="w-8 h-8 opacity-30" />
                    <p>No products yet. Add one or import a CSV.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products?.map((product) => (
                <TableRow key={product.sku} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-white/5 text-muted-foreground mt-1 inline-block">{product.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs hidden md:table-cell">{product.baseUnitName}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-bold text-sm",
                      product.currentStock <= product.reorderThreshold ? "text-amber-500" : "text-foreground"
                    )}>
                      {formatNumber(product.currentStock)}
                    </span>
                    {product.currentStock <= product.reorderThreshold && (
                      <span className="ml-1 text-[10px] text-amber-500 font-semibold">LOW</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground hidden sm:table-cell">
                    {formatTZS(product.averageLandedCost)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm text-primary">
                    {formatTZS(product.sellingPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={cn("font-bold text-sm flex items-center justify-end gap-0.5",
                      product.profitMarginPercent > 30 ? "text-emerald-400" : product.profitMarginPercent > 10 ? "text-amber-400" : "text-rose-400"
                    )}>
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
