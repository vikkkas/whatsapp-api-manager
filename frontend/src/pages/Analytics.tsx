import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MessageSquare, Users, TrendingUp, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyticsAPI } from "@/lib/api";
import { useEffect, useState } from "react";

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

  if (!analytics || !analytics.overview) {
    return (
      <div className="text-center text-muted-foreground">
        No analytics data available
      </div>
    );
  }

  const stats = [
    {
      title: "Total Messages",
      value: (analytics.overview.totalMessages || 0).toLocaleString(),
      icon: MessageSquare,
      change: `+${analytics.overview.sentToday || 0}`,
      subtitle: "last 30 days"
    },
    {
      title: "Total Conversations",
      value: (analytics.overview.totalConversations || 0).toLocaleString(),
      icon: Users,
      change: `${analytics.overview.totalConversations || 0} total`,
      subtitle: "conversations"
    },
    {
      title: "Delivery Rate",
      value: `${analytics.overview.deliveryRate || 0}%`,
      icon: TrendingUp,
      change: "Success rate",
      subtitle: "delivery rate"
    },
    {
      title: "Sent This Week",
      value: (analytics.overview.sentThisWeek || 0).toLocaleString(),
      icon: Target,
      change: `${analytics.overview.sentToday || 0} today`,
      subtitle: "messages sent"
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

      {/* Daily Activity Chart */}
      {analytics.dailyActivity && analytics.dailyActivity.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Bar dataKey="sent" fill="hsl(210, 100%, 55%)" name="Sent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" fill="hsl(142, 76%, 40%)" name="Received" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Message Status Distribution */}
      {analytics.messagesByStatus && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Message Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analytics.messagesByStatus).map(([status, count]) => (
                <div key={status} className="p-4 border rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground capitalize">{status}</p>
                  <p className="text-2xl font-bold mt-1">{count as number}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
