import { useState } from "react";
import { useListCampaigns, useCreateCampaign, getListCampaignsQueryKey } from "@workspace/api-client-react";
import { formatTZS, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Megaphone, Plus, ArrowUpRight, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  adSpend: z.coerce.number().min(0, "Must be positive"),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().optional(),
});

export default function Campaigns() {
  const { data: campaigns, isLoading } = useListCampaigns();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateCampaign();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createMutation.mutateAsync({
        data: {
          ...values,
          adSpend: Math.round(values.adSpend * 100),
          startDate: new Date(values.startDate).toISOString(),
          endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        }
      });
      toast({ title: "Campaign created successfully" });
      setDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to create", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Marketing & ROI</h1>
          <p className="text-muted-foreground mt-1">Track ad spend against actual POS sales to measure true ROI.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-11 px-6">
              <Plus className="w-4 h-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Create Marketing Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Campaign Name</label>
                <Input {...form.register("name")} placeholder="e.g. Insta Summer Promo" className="bg-background rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ad Spend (TZS)</label>
                <Input type="number" {...form.register("adSpend")} placeholder="150000" className="bg-background rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" {...form.register("startDate")} className="bg-background rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date (Optional)</label>
                  <Input type="date" {...form.register("endDate")} className="bg-background rounded-xl" />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl mt-6 text-lg" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl bg-secondary/30 animate-pulse border border-white/5" />)}
        </div>
      ) : campaigns?.length === 0 ? (
        <div className="text-center py-24 border border-white/5 rounded-3xl bg-card/30 backdrop-blur">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-display font-bold">No campaigns yet</h3>
          <p className="text-muted-foreground mt-2">Create your first campaign to start tracking ROI on your sales.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns?.map(campaign => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 cursor-pointer group flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold font-display group-hover:text-primary transition-colors">{campaign.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started {new Date(campaign.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
                
                <div className="mt-auto space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-muted-foreground text-sm">Ad Spend</span>
                    <span className="font-mono font-bold">{formatTZS(campaign.adSpend)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <BarChart3 className="w-4 h-4" />
                    <span>Click to view detailed ROI</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
