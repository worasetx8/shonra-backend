import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { TrendingUp, Users, DollarSign, ShoppingCart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const data = [
  { name: 'Mon', sales: 4000, visitors: 2400 },
  { name: 'Tue', sales: 3000, visitors: 1398 },
  { name: 'Wed', sales: 2000, visitors: 9800 },
  { name: 'Thu', sales: 2780, visitors: 3908 },
  { name: 'Fri', sales: 1890, visitors: 4800 },
  { name: 'Sat', sales: 2390, visitors: 3800 },
  { name: 'Sun', sales: 3490, visitors: 4300 },
];

const StatCard = ({ title, value, trend, icon: Icon, colorClass, trendUp }: any) => (
  <div className="bg-surface p-6 rounded-xl border border-border hover:border-zinc-600 transition-colors group">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
      <div className={`p-2.5 rounded-lg border ${colorClass} bg-opacity-10`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div className="flex items-center mt-4 text-sm">
      <span className={`font-medium flex items-center gap-1 ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
        {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} 
        {trend}
      </span>
      <span className="text-zinc-500 ml-2">vs last week</span>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value="$54,230" 
          trend="+12.5%" 
          trendUp={true}
          icon={DollarSign} 
          colorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        />
        <StatCard 
          title="Total Orders" 
          value="1,243" 
          trend="+8.2%" 
          trendUp={true}
          icon={ShoppingCart} 
          colorClass="bg-blue-500/10 border-blue-500/20 text-blue-500"
        />
        <StatCard 
          title="Active Users" 
          value="8,543" 
          trend="-2.1%" 
          trendUp={false}
          icon={Users} 
          colorClass="bg-violet-500/10 border-violet-500/20 text-violet-500"
        />
        <StatCard 
          title="Conversion Rate" 
          value="3.24%" 
          trend="+0.4%" 
          trendUp={true}
          icon={TrendingUp} 
          colorClass="bg-amber-500/10 border-amber-500/20 text-amber-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Revenue Overview
          </h3>
          <div className="h-80" style={{ minHeight: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#09090b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff'}}
                  itemStyle={{color: '#818cf8'}}
                  labelStyle={{color: '#a1a1aa'}}
                  cursor={{ stroke: '#27272a', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface p-6 rounded-xl border border-border">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
             Visitor Traffic
          </h3>
          <div className="h-80" style={{ minHeight: '320px', width: '100%' }}>
             <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                <Tooltip 
                   contentStyle={{backgroundColor: '#09090b', borderRadius: '8px', border: '1px solid #27272a', color: '#fff'}}
                   itemStyle={{color: '#22d3ee'}}
                   labelStyle={{color: '#a1a1aa'}}
                   cursor={{ stroke: '#27272a', strokeWidth: 1 }}
                />
                <Line type="monotone" dataKey="visitors" stroke="#22d3ee" strokeWidth={2} dot={{r: 4, fill: '#000', strokeWidth: 2, stroke: '#22d3ee'}} activeDot={{r: 6, fill: '#22d3ee'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};