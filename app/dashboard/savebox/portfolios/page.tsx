"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPortfolios, getPortfolioStrategies, createPortfolio, updatePortfolio } from "@/lib/saveboxService";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

export default function PortfoliosPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<any>(null);
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});

  const { data: portfoliosRaw, isLoading } = useQuery({
    queryKey: ["portfolios", includeInactive],
    queryFn: () => getPortfolios(includeInactive),
  });

  const { data: strategies } = useQuery({
    queryKey: ["portfolioStrategies"],
    queryFn: getPortfolioStrategies,
  });

  const portfolios: any[] = Array.isArray(portfoliosRaw) ? portfoliosRaw : portfoliosRaw?.data ?? [];
  const strategyList: any[] = Array.isArray(strategies) ? strategies : (strategies as any)?.strategies ?? [];

  const form = useForm({
    defaultValues: { name: "", strategy: "", isActive: true },
  });
  const selectedStrategy = form.watch("strategy");
  const strategySchema = strategyList.find((s: any) => s.value === selectedStrategy);
  const allSelectionRuleFields = (strategies as any)?.selectionRuleFields ?? {};
  const fieldsToShow = [
    ...(strategySchema?.requiredFields ?? []),
    ...(strategySchema?.optionalFields ?? []),
  ].filter((f: string) => f !== "strategy");

  const selectionRuleFields = fieldsToShow.map((key: string) => ({
    key,
    ...(allSelectionRuleFields?.[key] ?? {}),
  })).filter((field: any) => field.type);

  const createMutation = useMutation({
    mutationFn: (data: object) => createPortfolio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      toast.success("Portfolio created.");
      setIsCreateOpen(false);
      form.reset();
      setDynamicValues({});
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create portfolio."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => updatePortfolio(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      toast.success("Portfolio updated.");
      setEditingPortfolio(null);
      setDynamicValues({});
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Update failed."),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      name: values.name,
      strategy: values.strategy,
      isActive: values.isActive,
      selectionRules: dynamicValues,
    };
    if (editingPortfolio) {
      updateMutation.mutate({ id: editingPortfolio.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openCreate = () => {
    setEditingPortfolio(null);
    form.reset({ name: "", strategy: "", isActive: true });
    setDynamicValues({});
    setIsCreateOpen(true);
  };

  const openEdit = (portfolio: any) => {
    setEditingPortfolio(portfolio);
    form.reset({ name: portfolio.name, strategy: portfolio.strategy, isActive: portfolio.isActive });
    setDynamicValues(portfolio.selectionRules ?? {});
    setIsCreateOpen(true);
  };

  const columns: Column[] = [
    { key: "name", header: "Name", className: "font-medium text-sm" },
    {
      key: "strategy",
      header: "Strategy",
      className: "text-sm text-gray-500",
      render: (v) => {
        const found = strategyList.find((s: any) => s.value === v);
        return found ? found.label : v;
      },
    },
    {
      key: "selectionRules",
      header: "Selection Rules",
      render: (v) => v ? <JsonViewer data={v} label="Rules" collapsed /> : "—",
    },
    {
      key: "isActive",
      header: "Status",
      render: (v) => <StatusBadge status={v ? "active" : "inactive"} />,
    },
    {
      key: "lastSelectedEquityId",
      header: "Last Equity ID",
      render: (v) => v ?? "—",
    },
    {
      key: "id",
      header: "Actions",
      headerClassName: "text-right",
      render: (id, row) => (
        <div className="text-right">
          <Button size="sm" variant="ghost" className="text-blue hover:bg-blue/5" onClick={() => openEdit(row)}>
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="px-6 sm:px-8 pt-8 pb-16 space-y-6">
      <PageHeader
        title="Savebox Portfolios"
        subtitle="Manage investment portfolio strategies and selection rules."
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
              Include Inactive
            </label>
            <Button className="bg-blue hover:bg-darkBlue text-white gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" /> New Portfolio
            </Button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={portfolios} loading={isLoading} rowKey={(r) => r.id} />
      </div>

      {/* Create / Edit modal */}
      <Dialog open={isCreateOpen} onOpenChange={(v) => { if (!v) { setIsCreateOpen(false); setEditingPortfolio(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPortfolio ? "Edit Portfolio" : "New Portfolio"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-1">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="strategy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy</FormLabel>
                  <Select
                    onValueChange={(v) => {
                      field.onChange(v);
                      const schema = strategyList.find((s: any) => s.value === v);
                      setDynamicValues(schema?.defaults ?? {});
                    }}
                    value={field.value}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select strategy..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {strategyList.map((s: any) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Dynamic selection rule fields from strategy schema */}
              {selectionRuleFields.length > 0 && (
                <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Selection Rules</p>
                  {selectionRuleFields.map((ruleField: any) => (
                    <div key={ruleField.key}>
                      <label className="text-sm font-medium text-gray-700 block mb-1">{ruleField.label ?? ruleField.key}</label>
                      {ruleField.type === "select" ? (
                        <Select
                          value={String(dynamicValues[ruleField.key] ?? "")}
                          onValueChange={(v) => setDynamicValues((prev) => ({ ...prev, [ruleField.key]: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(ruleField.options ?? []).map((opt: any) => {
                              const val = typeof opt === "object" ? opt.value : opt;
                              const label = typeof opt === "object" ? opt.label : opt;
                              return (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={ruleField.type === "number" ? "number" : "text"}
                          value={String(dynamicValues[ruleField.key] ?? "")}
                          onChange={(e) => {
                            const val = ruleField.type === "number" ? Number(e.target.value) : e.target.value;
                            setDynamicValues((prev) => ({ ...prev, [ruleField.key]: val }));
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                  <FormLabel className="text-sm font-medium">Active</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              <Button type="submit" className="w-full bg-blue text-white" disabled={isPending}>
                {isPending ? "Saving..." : editingPortfolio ? "Save Changes" : "Create Portfolio"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
