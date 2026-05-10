"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ChartsSkeleton = () => (
  <Skeleton className="h-80 w-full rounded-xl" />
);

const LowStockSkeleton = () => (
  <Skeleton className="h-80 w-full rounded-xl" />
);

export const DashboardCharts = dynamic(
  () => import("./dashboard-charts").then((mod) => mod.DashboardCharts),
  {
    loading: () => <ChartsSkeleton />,
    ssr: false,
  }
);

export const LowStockAlert = dynamic(
  () => import("./low-stock-alert").then((mod) => mod.LowStockAlert),
  {
    loading: () => <LowStockSkeleton />,
    ssr: false,
  }
);