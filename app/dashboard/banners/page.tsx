"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BannerAd,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "@/lib/bannerService";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Smartphone,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// Human-friendly app page options
const APP_PAGE_OPTIONS = [
  { label: "Investment Opportunities", value: "/home/opportunity" },
  { label: "Referrals & Rewards", value: "/home/referrals" },
  { label: "Offers & Partner Perks", value: "/home/offers" },
  { label: "Invoicing", value: "/home/invoice" },
  { label: "Explore Services", value: "/home/explore" },
  { label: "Safebox Savings", value: "/home/safebox" },
  { label: "Split Bills", value: "/home/bills" },
  { label: "Portfolio Overview", value: "/home/portfolio" },
  { label: "Profile", value: "/home/profile" },
];

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerAd | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [targetType, setTargetType] = useState<"INTERNAL" | "EXTERNAL" | "NONE">("INTERNAL");
  const [targetValue, setTargetValue] = useState("/home/opportunity");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch banners
  const { data, isLoading } = useQuery({
    queryKey: ["adminBanners"],
    queryFn: () => getBanners(1, 100),
  });

  const banners: BannerAd[] = data?.items || (Array.isArray(data) ? data : []);

  // Reset form
  const resetForm = () => {
    setTitle("");
    setTargetType("INTERNAL");
    setTargetValue("/home/opportunity");
    setDisplayOrder(banners.length + 1);
    setIsActive(true);
    setSelectedFile(null);
    setImagePreview(null);
    setEditingBanner(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (banner: BannerAd) => {
    setEditingBanner(banner);
    setTitle(banner.title || "");
    setTargetType(banner.targetType || "NONE");
    setTargetValue(banner.targetValue || "");
    setDisplayOrder(banner.displayOrder || 1);
    setIsActive(banner.isActive ?? true);
    setImagePreview(banner.imageUrl || null);
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (title) formData.append("title", title);
      formData.append("targetType", targetType);
      if (targetType !== "NONE" && targetValue) {
        formData.append("targetValue", targetValue);
      }
      formData.append("displayOrder", displayOrder.toString());
      formData.append("isActive", String(isActive));

      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      if (editingBanner) {
        return updateBanner(editingBanner.id, formData);
      } else {
        if (!selectedFile) {
          throw new Error("Please select an image file for the banner.");
        }
        return createBanner(formData);
      }
    },
    onSuccess: () => {
      toast.success(
        editingBanner ? "Banner updated successfully!" : "New banner added successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["adminBanners"] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save banner.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBanner(id),
    onSuccess: () => {
      toast.success("Banner deleted.");
      queryClient.invalidateQueries({ queryKey: ["adminBanners"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to delete banner.");
    },
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Banner Ads"
        subtitle="Manage promotional banners displayed on the mobile app home screen."
        actions={
          <Button onClick={handleOpenCreateModal} className="bg-blue hover:bg-blue/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Add Banner
          </Button>
        }
      />

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Total Banners</p>
          <p className="text-2xl font-bold mt-1">{banners.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Live on Mobile App</p>
          <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
            {banners.filter((b) => b.isActive).length}
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : banners.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No Banners Created Yet"
            message="Click 'Add Banner' to create your first mobile app promotional banner."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-zinc-900/50">
                <TableHead className="w-20">Position</TableHead>
                <TableHead className="w-32">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Click Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => {
                const targetRouteLabel =
                  APP_PAGE_OPTIONS.find((r) => r.value === banner.targetValue)?.label ||
                  banner.targetValue;

                return (
                  <TableRow key={banner.id}>
                    <TableCell className="font-semibold text-sm">#{banner.displayOrder}</TableCell>
                    <TableCell>
                      {banner.imageUrl ? (
                        <img
                          src={banner.imageUrl}
                          alt={banner.title || "Banner"}
                          className="w-20 h-10 object-cover rounded-lg border border-slate-200 dark:border-zinc-700"
                        />
                      ) : (
                        <div className="w-20 h-10 bg-slate-100 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{banner.title || "—"}</TableCell>
                    <TableCell>
                      {banner.targetType === "INTERNAL" ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 font-medium">
                          <Smartphone className="w-3.5 h-3.5 text-blue" />
                          <span>{targetRouteLabel}</span>
                        </div>
                      ) : banner.targetType === "EXTERNAL" ? (
                        <div className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 font-medium">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">{banner.targetValue}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">None (Display image only)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={banner.isActive ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditModal(banner)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this banner?")) {
                            deleteMutation.mutate(banner.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-red hover:text-red hover:bg-red/10 border-red/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-zinc-700 relative space-y-5">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-zinc-700">
              <h3 className="text-lg font-bold">
                {editingBanner ? "Edit Banner" : "Add New Banner"}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Title */}
              <div>
                <label className="block font-medium mb-1">Banner Title / Note (Optional)</label>
                <Input
                  placeholder="e.g. Promo Campaign 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Banner Image */}
              <div>
                <label className="block font-medium mb-1">Upload Banner Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue/10 file:text-blue hover:file:bg-blue/20"
                />
                {imagePreview && (
                  <div className="mt-2.5 relative rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 aspect-[2.4] w-full">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Where should clicking go? */}
              <div>
                <label className="block font-medium mb-1">When tapped, where should it go?</label>
                <select
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm"
                  value={targetType}
                  onChange={(e) => {
                    const type = e.target.value as "INTERNAL" | "EXTERNAL" | "NONE";
                    setTargetType(type);
                    if (type === "INTERNAL") {
                      setTargetValue(APP_PAGE_OPTIONS[0].value);
                    } else if (type === "EXTERNAL") {
                      setTargetValue("https://");
                    } else {
                      setTargetValue("");
                    }
                  }}
                >
                  <option value="INTERNAL">📱 Opens an App Page</option>
                  <option value="EXTERNAL">🌐 Opens a Website Link</option>
                  <option value="NONE">🖼️ No Link (Display Image Only)</option>
                </select>
              </div>

              {/* Target value selector */}
              {targetType === "INTERNAL" && (
                <div>
                  <label className="block font-medium mb-1">Choose App Page</label>
                  <select
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  >
                    {APP_PAGE_OPTIONS.map((page) => (
                      <option key={page.value} value={page.value}>
                        {page.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "EXTERNAL" && (
                <div>
                  <label className="block font-medium mb-1">Website Link</label>
                  <Input
                    placeholder="https://example.com"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>
              )}

              {/* Position & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Order Position</label>
                  <Input
                    type="number"
                    min={1}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-[11px] text-slate-400 mt-0.5">Position 1 shows first</p>
                </div>

                <div className="flex items-center pt-6 space-x-2">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-blue"
                  />
                  <label htmlFor="isActiveToggle" className="font-medium cursor-pointer">
                    Show on Mobile App
                  </label>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-700">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-blue hover:bg-blue/90 text-white min-w-[110px]"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
                  </>
                ) : editingBanner ? (
                  "Save Changes"
                ) : (
                  "Add Banner"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
