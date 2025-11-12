import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MessageSquare, Users, TrendingUp, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyticsAPI, type Analytics } from "@/lib/api";
import { useEffect, useState } from "react";

const COLORS = ["hsl(142, 76%, 40%)", "hsl(210, 100%, 55%)", "hsl(45, 93%, 47%)", "hsl(0, 84%, 60%)"];

export default function Analytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsAPI.getOverview(30);
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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-destructive">Error: {error}</p>
        <Button onClick={fetchAnalytics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  const stats = [
    {
      title: "Total Messages",
      value: analytics.overview.totalMessages.toLocaleString(),
      icon: MessageSquare,
      change: `+${analytics.overview.recentMessages}`,
      subtitle: "last 30 days"
    },
    {
      title: "Active Users",
      value: analytics.overview.activeUsers.toLocaleString(),
      icon: Users,
      change: `${analytics.overview.totalUsers} total`,
      subtitle: "active users"
    },
    {
      title: "Avg. Response Time",
      value: analytics.overview.avgResponseTime,
      icon: TrendingUp,
      change: "Automated",
      subtitle: "response time"
    },
    {
      title: "Message Distribution",
      value: `${Math.round((analytics.overview.inboundMessages / analytics.overview.totalMessages) * 100)}%`,
      icon: Target,
      change: `${analytics.overview.inboundMessages}:${analytics.overview.outboundMessages}`,
      subtitle: "inbound ratio"
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{stat.change}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages per Day */}
        <Card>
          <CardHeader>
            <CardTitle>Messages per Day (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.charts.messagesPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="_id" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar dataKey="inbound" fill="hsl(142, 76%, 40%)" name="Inbound" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outbound" fill="hsl(210, 100%, 55%)" name="Outbound" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Message Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Message Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Inbound', value: analytics.charts.messageDistribution.inbound },
                    { name: 'Outbound', value: analytics.charts.messageDistribution.outbound }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Inbound', value: analytics.charts.messageDistribution.inbound },
                    { name: 'Outbound', value: analytics.charts.messageDistribution.outbound }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Phone Number</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Messages</th>
                  <th className="text-left py-2">Last Message</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topUsers.length > 0 ? (
                  analytics.topUsers.map((user, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-mono text-sm">{user.phone}</td>
                      <td className="py-2">{user.name || 'Unknown'}</td>
                      <td className="py-2">{user.messageCount}</td>
                      <td className="py-2 text-sm text-muted-foreground">
                        {new Date(user.lastMessage).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      No user data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Templates Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{analytics.templates.total}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Templates</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{analytics.templates.approved}</p>
            <p className="text-sm text-muted-foreground mt-1">Approved Templates</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{analytics.templates.pending}</p>
            <p className="text-sm text-muted-foreground mt-1">Pending Templates</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
