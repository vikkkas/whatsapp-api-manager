import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { MessageSquare, Users, TrendingUp, Target, RefreshCw, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyticsAPI } from "@/lib/api";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AnalyticsData {
  overview: {
    totalMessages: number;
    totalConversations: number;
    deliveryRate: number;
    averageResponseTime: number;
    sentToday: number;
    sentThisWeek: number;
    sentThisMonth: number;
  };
  messagesByStatus?: Record<string, number>;
  messagesByType?: Record<string, number>;
  conversationsByStatus?: Record<string, number>;
  dailyActivity?: Array<{
    date: string;
    sent: number;
    received: number;
  }>;
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsAPI.getOverview(parseInt(timeRange));
      setAnalytics(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <RefreshCw className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <span className="text-gray-500 font-medium">Gathering insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="bg-red-50 p-4 rounded-full">
          <Target className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-gray-900 font-bold text-lg">Something went wrong</p>
        <p className="text-gray-500">{error}</p>
        <Button onClick={fetchAnalytics} variant="outline" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!analytics || !analytics.overview) {
    return (
      <div className="text-center text-gray-500 mt-20">
        No analytics data available yet. Start sending messages to see insights!
      </div>
    );
  }

  const stats = [
    {
      title: "Total Messages",
      value: (analytics.overview.totalMessages || 0).toLocaleString(),
      icon: MessageSquare,
      change: `+${analytics.overview.sentToday || 0}`,
      trend: "up",
      subtitle: "sent today",
      color: "bg-blue-600",
      textColor: "text-white"
    },
    {
      title: "Active Conversations",
      value: (analytics.overview.totalConversations || 0).toLocaleString(),
      icon: Users,
      change: `${analytics.overview.totalConversations || 0}`,
      trend: "neutral",
      subtitle: "total active",
      color: "bg-white",
      textColor: "text-gray-900"
    },
    {
      title: "Delivery Rate",
      value: `${analytics.overview.deliveryRate || 0}%`,
      icon: TrendingUp,
      change: "2.1%",
      trend: "up",
      subtitle: "vs last month",
      color: "bg-white",
      textColor: "text-gray-900"
    },
    {
      title: "Sent This Week",
      value: (analytics.overview.sentThisWeek || 0).toLocaleString(),
      icon: Target,
      change: `${analytics.overview.sentToday || 0}`,
      trend: "up",
      subtitle: "sent today",
      color: "bg-white",
      textColor: "text-gray-900"
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Overview</h2>
          <p className="text-gray-500 mt-1">Track your messaging performance and engagement.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] bg-white border-gray-200">
              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline" size="icon" className="bg-white border-gray-200">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className={`border-none shadow-sm ${stat.color === 'bg-blue-600' ? 'shadow-blue-200' : ''} ${stat.color}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.color === 'bg-blue-600' ? 'bg-blue-500/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                {stat.change && (
                  <div className={`flex items-center text-xs font-medium ${stat.color === 'bg-blue-600' ? 'text-blue-100' : 'text-green-600'}`}>
                    {stat.trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {stat.change}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h3 className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</h3>
                <p className={`text-sm font-medium ${stat.color === 'bg-blue-600' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {stat.title}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Activity Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Message Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {analytics.dailyActivity && analytics.dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailyActivity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend iconType="circle" />
                    <Area 
                      type="monotone" 
                      dataKey="sent" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSent)" 
                      name="Sent Messages"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="received" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorReceived)" 
                      name="Received Messages"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No activity data for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Status Distribution */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900">Delivery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analytics.messagesByStatus ? (
                Object.entries(analytics.messagesByStatus).map(([status, count], index) => {
                  const total = Object.values(analytics.messagesByStatus!).reduce((a, b) => (a as number) + (b as number), 0) as number;
                  const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                  
                  let colorClass = "bg-gray-200";
                  if (status === 'READ') colorClass = "bg-green-500";
                  if (status === 'DELIVERED') colorClass = "bg-blue-500";
                  if (status === 'SENT') colorClass = "bg-yellow-500";
                  if (status === 'FAILED') colorClass = "bg-red-500";

                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 capitalize">{status.toLowerCase()}</span>
                        <span className="text-gray-500">{count as number} ({percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${colorClass}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-400 py-8">No status data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
