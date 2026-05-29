import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  colorClass?: string;
  iconBgClass?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp = true,
  colorClass = "text-blue",
  iconBgClass = "bg-faintSky",
}: StatCardProps) {
  return (
    <Card className="group overflow-hidden border-gray-100/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300">
      <CardContent className="p-6 relative">
        {/* Subtle background glow effect */}
        <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-500", iconBgClass)} />
        
        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </p>
            <h3 className="text-[26px] font-bold mt-2.5 tracking-tight dark:text-white leading-none">
              {value}
            </h3>
          </div>
          <div className={cn("p-3 rounded-2xl shadow-sm ring-1 ring-white/50 backdrop-blur-sm", iconBgClass)}>
            <Icon className={cn("w-5 h-5", colorClass)} strokeWidth={2.5} />
          </div>
        </div>
        {trend && (
          <div className="mt-5 flex items-center text-sm relative z-10">
            <span
              className={cn(
                "font-semibold flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wider",
                trendUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
              )}
            >
              {trendUp ? "↑" : "↓"} {trend}
            </span>
            <span className="text-gray-400 dark:text-gray-500 ml-2 text-xs font-medium">
              vs last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
