import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  Shield,
  BarChart3,
  Activity,
  UserPlus,
  TrendingUp,
  Cog
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { ApiResponse } from '@/lib/api';

interface AdminStats {
  totalUsers: number;
  totalChats: number;
  totalQuizzes: number;
  totalContent: number;
}

const chartConfig = {
  users: {
    label: "Users",
    color: "hsl(var(--chart-1))",
  },
  chats: {
    label: "Chats",
    color: "hsl(var(--chart-2))",
  },
  content: {
    label: "Content",
    color: "hsl(var(--chart-3))",
  },
};

const userGrowthData = [
  { month: 'Jan', users: 150 },
  { month: 'Feb', users: 230 },
  { month: 'Mar', users: 320 },
  { month: 'Apr', users: 450 },
  { month: 'May', users: 580 },
  { month: 'Jun', users: 720 },
];

const activityData = [
  { name: 'Chats', value: 400, color: '#8884d8' },
  { name: 'Quizzes', value: 300, color: '#82ca9d' },
  { name: 'Content', value: 200, color: '#ffc658' },
  { name: 'Users', value: 100, color: '#ff7300' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const { userProfile, loading } = useUserRole();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalChats: 0,
    totalQuizzes: 0,
    totalContent: 0
  });
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !userProfile?.is_admin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
    }
  }, [loading, userProfile, navigate]);

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!userProfile?.is_admin) return;

      try {
        setLoadingData(true);
        const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        
        // Fetch users
        const usersResponse:ApiResponse = await makeRequest(
          `${API_BASE_URL}/api/v1/admin/users?offset=0&size=20`,
          'GET'
        );

        if (usersResponse && typeof usersResponse === 'object' && 'status' in usersResponse) {
          if (usersResponse.status === 'success' && usersResponse.data) {
            setUsers(usersResponse.data.users || []);
            setStats(prev => ({ ...prev, totalUsers: usersResponse.data.total || 0 }));
          }
        }

        // Mock data for other stats (replace with actual API calls)
        setStats(prev => ({
          ...prev,
          totalChats: 1250,
          totalQuizzes: 340,
          totalContent: 890
        }));

      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load admin data');
      } finally {
        setLoadingData(false);
      }
    };

    fetchAdminData();
  }, [userProfile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Error logging out');
    }
  };

  const switchToUserDashboard = () => {
    navigate('/dashboard');
  };

  // if (loading || loadingData) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <div className="text-center">
  //         <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
  //         <p>Loading admin dashboard...</p>
  //       </div>
  //     </div>
  //   );
  // }

  const dashboardCards = [
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      change: "+12%",
      color: "text-blue-500"
    },
    {
      title: "Active Chats",
      value: stats.totalChats.toLocaleString(),
      icon: MessageSquare,
      change: "+8%",
      color: "text-green-500"
    },
    {
      title: "Content Generated",
      value: stats.totalContent.toLocaleString(),
      icon: BookOpen,
      change: "+15%",
      color: "text-purple-500"
    },
    {
      title: "Quizzes Created",
      value: stats.totalQuizzes.toLocaleString(),
      icon: BarChart3,
      change: "+5%",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {userProfile?.name}!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={switchToUserDashboard}
              className="flex items-center gap-2"
            >
              <Cog className="h-4 w-4" />
              User Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardCards.map((card, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  {card.change} from last month
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>Monthly user registration trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="var(--color-users)" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Activity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Distribution</CardTitle>
                  <CardDescription>Platform usage breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <PieChart>
                      <Pie
                        data={activityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {activityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.slice(0, 10).map((user: any, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name || 'Unknown User'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={user.is_admin ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                        <Badge variant="outline">
                          {user.current_plan}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Overview</CardTitle>
                <CardDescription>Generated content and quiz statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Content management features coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>Configure platform settings and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Admin settings panel coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}