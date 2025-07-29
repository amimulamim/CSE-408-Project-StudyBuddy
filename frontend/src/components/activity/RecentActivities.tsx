import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  FileText, 
  Trophy, 
  Clock, 
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { makeRequest } from '@/lib/apiCall';

interface Activity {
  activity_type: string;
  details: {
    id?: string;
    topic?: string;
    content_type?: string;
    chat_id?: string;
    title?: string;
    score?: number;
    total?: number;
    quiz_id?: string;
  };
  created_at: string;
}

interface RecentActivitiesProps {
  readonly className?: string;
  readonly limit?: number;
}

export function RecentActivities({ className = '', limit = 5 }: RecentActivitiesProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchActivities = async (showRefreshToast = false) => {
    try {
      const loadingState = showRefreshToast ? setRefreshing : setLoading;
      loadingState(true);

      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const url = `${API_BASE_URL}/api/v1/user/activities?limit=${limit}`;
      
      const response = await makeRequest<Activity[]>(url, 'GET', null);
      
      // Handle the response based on the ApiResponse pattern
      const hasApiResponseStructure = response && typeof response === 'object' && 'status' in response;
      
      if (hasApiResponseStructure) {
        const apiResponse = response as { status: string; data?: Activity[]; msg?: string };
        if (apiResponse.status === 'success' && apiResponse.data) {
          setActivities(apiResponse.data);
        } else {
          throw new Error(apiResponse.msg || 'Failed to fetch activities');
        }
      } else {
        // Direct response (should be Activity[])
        setActivities(response as Activity[]);
      }
      
      if (showRefreshToast) {
        toast.success('Activities refreshed!');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      if (showRefreshToast) {
        toast.error('Failed to refresh activities');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [limit]);

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'chat':
        return MessageSquare;
      case 'content':
        return FileText;
      case 'quiz':
      case 'quiz_taken':
        return Trophy;
      default:
        return BookOpen;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'chat':
        return 'text-blue-400';
      case 'content':
        return 'text-green-400';
      case 'quiz':
      case 'quiz_taken':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getActivityBadgeColor = (activityType: string) => {
    switch (activityType) {
      case 'chat':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'content':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'quiz':
      case 'quiz_taken':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
    }
  };

  const formatActivityTitle = (activity: Activity) => {
    switch (activity.activity_type) {
      case 'chat':
        return activity.details.title || 'Chat Session';
      case 'content':
        return activity.details.topic || 'Generated Content';
      case 'quiz':
      case 'quiz_taken':
        return activity.details.topic || 'Quiz Attempt';
      default:
        return 'Activity';
    }
  };

  const formatActivityDescription = (activity: Activity) => {
    switch (activity.activity_type) {
      case 'chat':
        return 'Had a conversation with AI assistant';
      case 'content':
        return `Generated ${activity.details.content_type || 'content'}`;
      case 'quiz':
      case 'quiz_taken': {
        const score = activity.details.score;
        const total = activity.details.total;
        if (score !== undefined && total !== undefined) {
          const percentage = Math.round((score / total) * 100);
          return `Scored ${score}/${total} (${percentage}%)`;
        }
        return 'Completed a quiz';
      }
      default:
        return 'Performed an activity';
    }
  };

  const handleActivityClick = (activity: Activity) => {
    switch (activity.activity_type) {
      case 'chat':
        if (activity.details.chat_id || activity.details.id) {
          navigate(`/chat/${activity.details.chat_id || activity.details.id}`);
        } else {
          navigate('/chat');
        }
        break;
      case 'content':
        // Navigate to specific content based on type and id
        if (activity.details.id) {
          const contentType = activity.details.content_type?.toLowerCase();
          if (contentType === 'flashcards') {
            navigate(`/content/flashcards/${activity.details.id}`);
          } else if (contentType === 'slides' || contentType === 'summary') {
            navigate(`/content/slides/${activity.details.id}`);
          } else {
            navigate('/dashboard/content');
          }
        } else {
          navigate('/dashboard/content');
        }
        break;
      case 'quiz':
      case 'quiz_taken':
        // Navigate to quiz results if we have quiz_id
        if (activity.details.quiz_id) {
          navigate(`/quiz/results/${activity.details.quiz_id}`);
        } else {
          navigate('/dashboard/quiz');
        }
        break;
      default:
        break;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Card className={`glass-card ${className}`}>
        <CardHeader>
          <CardTitle className="glass-text-title">Recent Activity</CardTitle>
          <CardDescription className="glass-text-description">
            Your latest interactions and generated content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={`loading-skeleton-${i}`} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 animate-pulse">
                <div className="w-10 h-10 bg-white/10 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="glass-text-title">Recent Activity</CardTitle>
            <CardDescription className="glass-text-description">
              Your latest interactions and generated content
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities(true)}
            disabled={refreshing}
            className="glass-card hover:bg-white/10 border-white/20 hover:border-white/30"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="relative mb-4">
              <BookOpen className="h-12 w-12 mx-auto text-gray-300 opacity-60" />
            </div>
            <p className="glass-text-description">
              No recent activity yet. Start by chatting with AI or generating content!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => {
              const IconComponent = getActivityIcon(activity.activity_type);
              const iconColor = getActivityColor(activity.activity_type);
              const badgeColor = getActivityBadgeColor(activity.activity_type);
              
              return (
                <button
                  key={`${activity.activity_type}-${index}-${activity.created_at}`}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors group text-left"
                  onClick={() => handleActivityClick(activity)}
                  type="button"
                >
                  <div className={`p-2 rounded-full bg-white/10 ${iconColor} group-hover:bg-white/20 transition-colors`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium glass-text-title truncate">
                        {formatActivityTitle(activity)}
                      </h4>
                      <Badge className={`text-xs ${badgeColor}`}>
                        {activity.activity_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs glass-text-description">
                      {formatActivityDescription(activity)}
                    </p>
                  </div>
                  
                  <div className="flex items-center text-xs glass-text-description">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimeAgo(activity.created_at)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
