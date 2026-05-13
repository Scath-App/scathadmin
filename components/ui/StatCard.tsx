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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </p>
            <h3 className="text-2xl font-bold mt-2 dark:text-white">{value}</h3>
          </div>
          <div className={cn("p-3 rounded-xl", iconBgClass)}>
            <Icon className={cn("w-6 h-6", colorClass)} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            <span
              className={cn(
                "font-medium",
                trendUp ? "text-green-600" : "text-red-500",
              )}
            >
              {trendUp ? "↑" : "↓"} {trend}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">
              vs last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
