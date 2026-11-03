"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/utils";

export function EquityChart({
  points,
  currency,
}: {
  points: { at: string; equity: number }[];
  currency: string;
}) {
  const data = points.map((point) => ({
    ...point,
    label: new Date(point.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
  }));

  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-500">Close a trade to start the equity curve.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
          <Tooltip
            formatter={(value) => formatMoney(Number(value ?? 0), currency)}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.at ?? ""}
          />
          <Area type="monotone" dataKey="equity" stroke="#2563eb" fill="url(#equityFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
