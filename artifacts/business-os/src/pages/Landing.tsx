import { Link } from "wouter";
import { 
  BarChart3, Package, ShoppingCart, Megaphone, TrendingUp,
  CheckCircle2, ArrowRight, Zap, Shield, Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: BarChart3,
    title: "Real-Time Dashboard",
    description: "See your net profit, revenue, inventory value, and low-stock alerts at a glance. No spreadsheets needed.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: ShoppingCart,
    title: "Point of Sale",
    description: "Log sales in seconds from your phone. Searchable product grid with a fast cart checkout — built for the counter.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Package,
    title: "Inventory Engine",
    description: "Automatically calculates weighted average landed cost across all your suppliers. Know your true profit margin, always.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: Megaphone,
    title: "Marketing ROI Tracker",
    description: "Tag sales to campaigns. See exactly which promotions drove revenue and calculate cost-per-acquisition automatically.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
];

const benefits = [
  "Weighted average cost calculations across suppliers",
  "Bulk stock import from CSV files",
  "Arrival workflow: stock only added when goods arrive",
  "All prices in TZS with cent-level accuracy",
  "Low stock alerts before you run out",
  "Campaign ROI with CPA and profit tracking",
];

const csvColumns = [
  { col: "sku", example: "MSK-01", desc: "Unique product code (required)" },
  { col: "name", example: "Facial Mask (Single)", desc: "Full product name (required)" },
  { col: "category", example: "Skincare", desc: "Product category (required)" },
  { col: "base_unit_name", example: "Single Mask", desc: "Smallest sellable unit (required)" },
  { col: "selling_price_tzs", example: "3000", desc: "Retail price in TZS — whole numbers only (required)" },
  { col: "reorder_threshold", example: "20", desc: "Alert when stock falls below this number (optional, default 10)" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* Nav */}
      <header className="border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <span className="font-bold text-rose-400 text-sm">R</span>
            </div>
            <span className="font-bold text-lg tracking-tight">BusinessOS</span>
          </div>
          <Link href="/">
            <Button className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white gap-2 h-9 px-5 text-sm font-semibold shadow-lg shadow-rose-900/40">
              Open App <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-20 px-6 text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(225,29,72,0.12),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-8 tracking-wide uppercase">
            <Zap className="w-3 h-3" /> Built for Tanzanian retail & beauty stores
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-none mb-6">
            Run your store
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">
              like a business.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            BusinessOS gives you the financial clarity that spreadsheets can't. Track true landed costs, 
            measure marketing ROI, and manage inventory — all from your phone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button size="lg" className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white gap-2 h-12 px-8 text-base font-semibold shadow-xl shadow-rose-900/40">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/pos">
              <Button size="lg" variant="outline" className="rounded-xl border-white/10 text-white hover:bg-white/5 gap-2 h-12 px-8 text-base font-semibold">
                <ShoppingCart className="w-5 h-5" /> Open Point of Sale
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <div className="text-center pb-8 text-sm text-white/30 font-medium tracking-widest uppercase px-6">
        Trusted by
        <span className="mx-3 text-white/50 not-uppercase font-bold normal-case tracking-normal text-base">Rose Beauty Palace</span>
        Dar es Salaam, Tanzania
      </div>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything your store needs</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">Five powerful modules that work together to give you total visibility into your business.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 hover:bg-white/[0.04] transition-all group">
                <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CSV Template Section */}
      <section className="py-20 px-6 bg-white/[0.015] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 items-start">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-4">
                <Package className="w-4 h-4" /> CSV Bulk Import
              </div>
              <h2 className="text-3xl font-bold mb-4">Import your entire catalog in seconds</h2>
              <p className="text-white/50 mb-6 leading-relaxed">
                Don't add products one by one. Prepare a simple spreadsheet and upload it. BusinessOS will import everything, 
                skip duplicates, and show you a full report of what was added.
              </p>
              <ul className="space-y-3 mb-8">
                {benefits.slice(0, 4).map(b => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-white/70">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href="/products">
                <Button className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-10 px-5">
                  Go to Products <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="flex-1 w-full">
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/70">CSV Template Format</span>
                  <span className="text-xs text-white/30 font-mono">products.csv</span>
                </div>
                {/* Column table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-4 py-2.5 text-white/40 font-semibold">Column</th>
                        <th className="text-left px-4 py-2.5 text-white/40 font-semibold">Example</th>
                        <th className="text-left px-4 py-2.5 text-white/40 font-semibold hidden sm:table-cell">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvColumns.map((col, i) => (
                        <tr key={col.col} className={i % 2 === 0 ? "bg-white/[0.015]" : ""}>
                          <td className="px-4 py-2.5 font-mono text-rose-400">{col.col}</td>
                          <td className="px-4 py-2.5 font-mono text-emerald-300">{col.example}</td>
                          <td className="px-4 py-2.5 text-white/40 hidden sm:table-cell">{col.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Sample row */}
                <div className="px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                  <p className="text-xs text-white/30 mb-1.5 font-semibold">Sample CSV row:</p>
                  <code className="text-xs font-mono text-emerald-300/80 break-all">
                    MSK-01,Facial Mask (Single),Skincare,Single Mask,3000,20
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Remaining benefits */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex flex-col gap-3">
              <Smartphone className="w-7 h-7 text-blue-400" />
              <h3 className="font-bold">Mobile-First POS</h3>
              <p className="text-sm text-white/50">Designed to work with one hand on your phone behind the counter. Fast, simple, reliable.</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex flex-col gap-3">
              <Shield className="w-7 h-7 text-violet-400" />
              <h3 className="font-bold">Data Integrity</h3>
              <p className="text-sm text-white/50">Products linked to sales are never permanently deleted — archived safely. Your historical data is always accurate.</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex flex-col gap-3">
              <TrendingUp className="w-7 h-7 text-orange-400" />
              <h3 className="font-bold">True Landed Cost</h3>
              <p className="text-sm text-white/50">Includes shipping and transport in every unit cost. Know your real margins, not just your purchase price.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(225,29,72,0.08),transparent)] pointer-events-none" />
        <div className="max-w-2xl mx-auto relative">
          <h2 className="text-4xl font-bold mb-4">Ready to grow smarter?</h2>
          <p className="text-white/50 text-lg mb-10">Start with your first product, or import your full catalog. BusinessOS grows with your store.</p>
          <Link href="/">
            <Button size="lg" className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white gap-2 h-13 px-10 text-base font-semibold shadow-xl shadow-rose-900/40">
              Open BusinessOS <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-sm text-white/25">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
            <span className="font-bold text-rose-400 text-[10px]">R</span>
          </div>
          <span className="font-semibold text-white/40">BusinessOS</span>
        </div>
        Built for Rose Beauty Palace · Dar es Salaam, Tanzania · All prices in TZS
      </footer>
    </div>
  );
}
