"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { EmailActivityPointData } from "@/lib/newsletter-types";

const chartConfig = {
  sent: { label: "Sent", color: "hsl(var(--chart-3))" },
  // Red, not the neighbouring green chart token, so failures stand out from sent.
  failed: { label: "Failed", color: "hsl(var(--destructive))" },
  undeliverable: {
    label: "Bounced / complained",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function EmailActivityChart({
  data,
}: {
  data: EmailActivityPointData[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email activity</CardTitle>
        <CardDescription>Last 14 days by delivery outcome</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={32}
              allowDecimals={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(String(value)).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="sent" stackId="a" fill="var(--color-sent)" />
            <Bar dataKey="undeliverable" stackId="a" fill="var(--color-undeliverable)" />
            <Bar
              dataKey="failed"
              stackId="a"
              fill="var(--color-failed)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
