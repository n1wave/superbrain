import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, DollarSign, Users, Activity, CreditCard } from "lucide-react";

const data = [
  { name: "Jan", total: 1200 },
  { name: "Feb", total: 2100 },
  { name: "Mar", total: 1800 },
  { name: "Apr", total: 2400 },
  { name: "May", total: 2800 },
  { name: "Jun", total: 3200 },
  { name: "Jul", total: 3800 },
];

const stats = [
  {
    name: "Total Revenue",
    value: "$45,231.89",
    change: "+20.1%",
    changeType: "positive",
    icon: DollarSign,
  },
  {
    name: "Active Users",
    value: "2,338",
    change: "+15.1%",
    changeType: "positive",
    icon: Users,
  },
  {
    name: "Sales",
    value: "1,234",
    change: "-4.5%",
    changeType: "negative",
    icon: CreditCard,
  },
  {
    name: "Active Now",
    value: "573",
    change: "+201 since last hour",
    changeType: "positive",
    icon: Activity,
  },
];

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-brand-midnight">
          Dashboard
        </h2>
        <div className="flex space-x-2">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sea disabled:pointer-events-none disabled:opacity-50 border border-brand-sea/20 bg-white hover:bg-brand-sea/5 hover:text-brand-navy h-10 px-4 py-2 text-brand-navy">
            Download Report
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="rounded-xl border border-brand-sea/20 bg-white text-brand-midnight shadow-sm"
          >
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">
                {stat.name}
              </h3>
              <stat.icon className="h-4 w-4 text-brand-sea" />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-brand-navy/60 mt-1 flex items-center gap-1">
                <span
                  className={
                    stat.changeType === "positive"
                      ? "text-brand-turquoise flex items-center"
                      : "text-brand-orange flex items-center"
                  }
                >
                  {stat.changeType === "positive" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.change}
                </span>
                from last month
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border border-brand-sea/20 bg-white shadow-sm">
          <div className="p-6">
            <h3 className="font-semibold leading-none tracking-tight text-brand-midnight">Overview</h3>
            <p className="text-sm text-brand-navy/60 mt-2">
              Revenue overview for the past 7 months.
            </p>
          </div>
          <div className="p-6 pt-0 h-[350px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00668E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00668E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#111827" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#00668E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-span-3 rounded-xl border border-brand-sea/20 bg-white shadow-sm">
          <div className="p-6">
            <h3 className="font-semibold leading-none tracking-tight text-brand-midnight">Recent Sales</h3>
            <p className="text-sm text-brand-navy/60 mt-2">
              You made 265 sales this month.
            </p>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-8">
              {[
                {
                  name: "Olivia Martin",
                  email: "olivia.martin@email.com",
                  amount: "+$1,999.00",
                  initials: "OM",
                },
                {
                  name: "Jackson Lee",
                  email: "jackson.lee@email.com",
                  amount: "+$39.00",
                  initials: "JL",
                },
                {
                  name: "Isabella Nguyen",
                  email: "isabella.nguyen@email.com",
                  amount: "+$299.00",
                  initials: "IN",
                },
                {
                  name: "William Kim",
                  email: "will@email.com",
                  amount: "+$99.00",
                  initials: "WK",
                },
                {
                  name: "Sofia Davis",
                  email: "sofia.davis@email.com",
                  amount: "+$39.00",
                  initials: "SD",
                },
              ].map((sale) => (
                <div key={sale.email} className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-brand-sea/10 flex items-center justify-center font-semibold text-brand-navy">
                    {sale.initials}
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none text-brand-midnight">{sale.name}</p>
                    <p className="text-sm text-brand-navy/60">{sale.email}</p>
                  </div>
                  <div className="ml-auto font-medium text-brand-midnight">{sale.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}