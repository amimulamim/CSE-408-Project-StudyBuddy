
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart3, Bell, FileText, MessageSquare, Settings, User, LogOut } from 'lucide-react';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminNotifications } from '@/components/admin/AdminNotifications';
import { AdminStatistics } from '@/components/admin/AdminStatistics';
import { AdminContentManagement } from '@/components/admin/AdminContentManagement';
import { AdminChatHistory } from '@/components/admin/AdminChatHistory';
import { AdminQuizResults } from '@/components/admin/AdminQuizResults';
import { AdminLogs } from '@/components/admin/AdminLogs';
import { useUserRole } from '@/hooks/useUserRole';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { userProfile, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState('overview');

  const handleSwitchToUserDashboard = () => {
    navigate('/dashboard');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-study-purple mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userProfile?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-8 w-8 text-study-purple" />
                <div>
                  <h1 className="text-2xl font-bold gradient-text">Admin Dashboard</h1>
                  <p className="text-sm text-muted-foreground">
                    Welcome back, {userProfile?.name}
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-study-purple">
                Admin
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleSwitchToUserDashboard}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                User Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chats
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminStatistics />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="content">
            <AdminContentManagement />
          </TabsContent>

          <TabsContent value="chats">
            <AdminChatHistory />
          </TabsContent>

          <TabsContent value="quizzes">
            <AdminQuizResults />
          </TabsContent>

          <TabsContent value="notifications">
            <AdminNotifications />
          </TabsContent>

          <TabsContent value="logs">
            <AdminLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
