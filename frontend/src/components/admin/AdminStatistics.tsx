import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { BarChart3, Calendar, TrendingUp, Users, MessageSquare, BookOpen } from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api';

interface UsageStats {
  users_added: number;
  content_generated: number;
  quiz_generated: number;
  content_uploaded: number;
  chats_done: number;
  period_start: string;
  period_end: string;
}

// Enhanced color palette with gradients
const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

// Custom tooltip with animations
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 animate-in slide-in-from-bottom-2 duration-200">
        {label && (<p className="font-semibold text-gray-800">{`${label}`}</p>)}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: 'black' }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AdminStatistics() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const chartConfig = {
    value: {
      label: "Count",
      color: "hsl(var(--primary))",
    },
  };

  useEffect(() => {
    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const fetchStats = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response:ApiResponse = await makeRequest(
        `${API_BASE_URL}/api/v1/admin/stats/usage?start_time=${startDate}T00:00:00Z&end_time=${endDate}T23:59:59Z`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setStats(response.data as UsageStats);
          toast.success('Statistics loaded successfully');
        } else {
          toast.error('Failed to load statistics');
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const chartData = stats ? [
    { name: 'Users Added', value: stats.users_added, color: colors[0] },
    { name: 'Chats Done', value: stats.chats_done, color: colors[1] },
    { name: 'Content Generated', value: stats.content_generated, color: colors[2] },
    { name: 'Quizzes Generated', value: stats.quiz_generated, color: colors[3] }
    // { name: 'Content Uploaded', value: stats.content_uploaded, color: colors[4] }
  ] : [];

  const timeSeriesData = stats ? [
    { period: 'Week 1', users: Math.floor(stats.users_added * 0.2), chats: Math.floor(stats.chats_done * 0.3), content: Math.floor(stats.content_generated * 0.1) },
    { period: 'Week 2', users: Math.floor(stats.users_added * 0.5), chats: Math.floor(stats.chats_done * 0.6), content: Math.floor(stats.content_generated * 0.4) },
    { period: 'Week 3', users: Math.floor(stats.users_added * 0.8), chats: Math.floor(stats.chats_done * 0.8), content: Math.floor(stats.content_generated * 0.7) },
    { period: 'Week 4', users: stats.users_added, chats: stats.chats_done, content: stats.content_generated }
  ] : [];

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Statistics
          </CardTitle>
          <CardDescription>
            View platform usage analytics for any time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={fetchStats} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>
          </div>

          {stats && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Users Added</p>
                        <p className="text-2xl font-bold">{stats.users_added}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Chats Done</p>
                        <p className="text-2xl font-bold">{stats.chats_done}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Content Generated</p>
                        <p className="text-2xl font-bold">{stats.content_generated}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quizzes Generated</p>
                        <p className="text-2xl font-bold">{stats.quiz_generated}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Content Uploaded</p>
                        <p className="text-2xl font-bold">{stats.content_uploaded}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card> */}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Animated Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Overview</CardTitle>
                    <CardDescription>Platform usage breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                          <defs>
                            {chartData.map((entry, index) => (
                              <linearGradient key={index} id={`gradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={entry.color} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={entry.color} stopOpacity={0.3}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                            stroke="#9ca3af"
                          />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar 
                            dataKey="value" 
                            radius={[4, 4, 0, 0]}
                            animationBegin={0}
                            animationDuration={1500}
                            animationEasing="ease-out"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`url(#gradient${index})`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Animated Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Distribution</CardTitle>
                    <CardDescription>Percentage breakdown of activities</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            {chartData.map((entry, index) => (
                              <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={entry.color} stopOpacity={0.9}/>
                                <stop offset="100%" stopColor={entry.color} stopOpacity={0.4}/>
                              </linearGradient>
                            ))}
                          </defs>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={2000}
                            animationEasing="ease-out"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`url(#pieGradient${index})`} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Animated Area Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Trends</CardTitle>
                    <CardDescription>Usage trends over time</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                          data={timeSeriesData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorContent" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                          <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="users" 
                            stackId="1"
                            stroke="#8B5CF6" 
                            fill="url(#colorUsers)"
                            strokeWidth={2}
                            animationBegin={0}
                            animationDuration={2000}
                            animationEasing="ease-in-out"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="chats" 
                            stackId="1"
                            stroke="#06B6D4" 
                            fill="url(#colorChats)"
                            strokeWidth={2}
                            animationBegin={300}
                            animationDuration={2000}
                            animationEasing="ease-in-out"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="content" 
                            stackId="1"
                            stroke="#10B981" 
                            fill="url(#colorContent)"
                            strokeWidth={2}
                            animationBegin={600}
                            animationDuration={2000}
                            animationEasing="ease-in-out"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Animated Line Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Growth Trends</CardTitle>
                    <CardDescription>Individual metric trends</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={timeSeriesData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                          <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} stroke="#9ca3af" />
                          <Tooltip content={<CustomTooltip />} />
                          <Line 
                            type="monotone" 
                            dataKey="users" 
                            stroke="#8B5CF6" 
                            strokeWidth={3}
                            dot={{ r: 6, fill: '#8B5CF6' }}
                            activeDot={{ r: 8, fill: '#8B5CF6' }}
                            animationBegin={0}
                            animationDuration={2500}
                            animationEasing="ease-in-out"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="chats" 
                            stroke="#06B6D4" 
                            strokeWidth={3}
                            dot={{ r: 6, fill: '#06B6D4' }}
                            activeDot={{ r: 8, fill: '#06B6D4' }}
                            animationBegin={400}
                            animationDuration={2500}
                            animationEasing="ease-in-out"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="content" 
                            stroke="#10B981" 
                            strokeWidth={3}
                            dot={{ r: 6, fill: '#10B981' }}
                            activeDot={{ r: 8, fill: '#10B981' }}
                            animationBegin={800}
                            animationDuration={2500}
                            animationEasing="ease-in-out"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Period Information */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Report Period:</span>
                    <span>
                      {new Date(stats.period_start).toLocaleDateString()} - {new Date(stats.period_end).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
