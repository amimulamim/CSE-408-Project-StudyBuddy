import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Trophy,
  BookOpen,
  Target,
  Clock,
  Brain,
  Sparkles,
  Calendar
} from 'lucide-react';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { QuizPerformanceChart } from '@/components/analytics/QuizPerformanceChart';
import { ContentAnalyticsChart } from '@/components/analytics/ContentAnalyticsChart';
import { ScoreDistributionChart } from '@/components/analytics/ScoreDistributionChart';
import { DifficultyAnalysisChart } from '@/components/analytics/DifficultyAnalysisChart';
import { ProgressTimelineChart } from '@/components/analytics/ProgressTimelineChart';
import { TopicMasteryChart } from '@/components/analytics/TopicMasteryChart';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  bio: string;
  institution: string;
  role: string;
  is_admin: boolean;
  avatar: string;
  current_plan: string;
  location: string;
  study_domain: string;
  interests: string[];
}

interface QuizResult {
  quiz_id: string;
  score: number;
  total: number;
  difficulty: string;
  topic: string;
  domain: string;
  duration: number;
  collection_name: string;
  createdAt: string;
  percentage: number;
}

interface ContentData {
  contentId: string;
  type: string;
  topic: string;
  collection_name?: string;
  createdAt: string;
  difficulty?: string;
}

interface AnalyticsStats {
  totalQuizzes: number;
  averageScore: number;
  totalContentGenerated: number;
  studyStreak: number;
  masteredTopics: number;
  timeSpentStudying: number;
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [contentData, setContentData] = useState<ContentData[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats>({
    totalQuizzes: 0,
    averageScore: 0,
    totalContentGenerated: 0,
    studyStreak: 0,
    masteredTopics: 0,
    timeSpentStudying: 0
  });
  
  // Chart customization states
  const [chartTimeframe, setChartTimeframe] = useState('30days');
  const [selectedMetric, setSelectedMetric] = useState('score');

  useEffect(() => {
    fetchUserProfile();
    fetchAnalyticsData();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest(`${API_BASE_URL}/api/v1/user/profile`, 'GET');
      
      if (response && response.status === 'success') {
        setUserProfile(response.data);
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      // Fetch quiz results
      let processedQuizData: QuizResult[] = [];
      const quizResponse = await makeRequest(`${API_BASE_URL}/api/v1/quiz/quiz-marks`, 'GET');
      if (quizResponse?.status === 'success' && quizResponse.data) {
        processedQuizData = quizResponse.data
          .filter((quiz: any) => Number(quiz.total) > 0) // Filter out quizzes with total 0
          .map((quiz: any) => ({
            ...quiz,
            score: Number(quiz.score),
            total: Number(quiz.total),
            duration: Number(quiz.duration) || 0,
            percentage: (Number(quiz.score) / Number(quiz.total)) * 100
          }));
        setQuizResults(processedQuizData);
      }

      // Fetch content data
      const contentResponse = await makeRequest(`${API_BASE_URL}/api/v1/content/user`, 'GET');
      if (contentResponse?.status === 'success' && contentResponse.data.contents) {
        setContentData(contentResponse.data.contents);
      }

      // Calculate analytics stats
      calculateAnalyticsStats(processedQuizData || [], contentResponse?.data.contents || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalyticsStats = (quizData: any[], contentData: any[]) => {
    const totalQuizzes = quizData.length;
    const averageScore = totalQuizzes > 0 
      ? quizData.reduce((sum, quiz) => {
          const score = Number(quiz.score);
          const total = Number(quiz.total);
          return sum + (score / total) * 100;
        }, 0) / totalQuizzes 
      : 0;
    
    const totalContentGenerated = contentData.length;
    const masteredTopics = new Set(
      quizData.filter(quiz => {
        const score = Number(quiz.score);
        const total = Number(quiz.total);
        return (score / total) * 100 >= 80;
      }).map(quiz => quiz.topic)
    ).size;
    
    // Calculate study streak (simplified)
    const studyStreak = calculateStudyStreak(quizData, contentData);
    
    // Estimate time spent studying (based on quiz durations and content generation)
    const timeSpentStudying = quizData.reduce((total, quiz) => total + (Number(quiz.duration) || 0), 0);

    setAnalyticsStats({
      totalQuizzes,
      averageScore,
      totalContentGenerated,
      studyStreak,
      masteredTopics,
      timeSpentStudying
    });
  };

  const calculateStudyStreak = (quizData: any[], contentData: any[]) => {
    // Combine and sort all study activities by date
    const allActivities = [
      ...quizData.map(q => ({ date: new Date(q.createdAt), type: 'quiz' })),
      ...contentData.map(c => ({ date: new Date(c.createdAt), type: 'content' }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const activity of allActivities) {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((currentDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
        break;
      }
    }

    return streak;
  };

  const handleProfileUpdate = (updatedProfile: Partial<UserProfile>) => {
    setUserProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
    toast.success('Profile updated successfully');
  };

  if (loading) {
    return <LoadingOverlay message="Loading profile and analytics..." />;
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <Card className="glass-card p-8">
          <CardContent className="text-center">
            <h2 className="text-xl font-bold glass-text-title mb-2">Profile not found</h2>
            <p className="glass-text-description">Unable to load user profile</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    
    <div className="min-h-screen ">
      {analyticsLoading && <LoadingOverlay message="Updating analytics..." />}
      
      <div className="container mx-auto py-8">
        {/* Use the existing ProfileCard component */}
        <div className="mb-8">
          <ProfileCard 
            userProfile={userProfile} 
            onProfileUpdate={handleProfileUpdate}
            analyticsStats={analyticsStats}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="glass-card text-center p-4">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold glass-text-title">{analyticsStats.totalQuizzes}</div>
            <div className="text-sm glass-text-description">Total Quizzes</div>
          </Card>
          
          <Card className="glass-card text-center p-4">
            <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold glass-text-title">{analyticsStats.averageScore.toFixed(2)}%</div>
            <div className="text-sm glass-text-description">Average Score</div>
          </Card>
          
          <Card className="glass-card text-center p-4">
            <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold glass-text-title">{analyticsStats.totalContentGenerated}</div>
            <div className="text-sm glass-text-description">Content Generated</div>
          </Card>
          
          <Card className="glass-card text-center p-4">
            <Sparkles className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold glass-text-title">{analyticsStats.studyStreak}</div>
            <div className="text-sm glass-text-description">Study Streak</div>
          </Card>
          
          <Card className="glass-card text-center p-4">
            <Brain className="h-8 w-8 text-pink-500 mx-auto mb-2" />
            <div className="text-2xl font-bold glass-text-title">{analyticsStats.masteredTopics}</div>
            <div className="text-sm glass-text-description">Mastered Topics</div>
          </Card>
          
          <Card className="glass-card text-center p-4">
            <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold glass-text-title">{Math.round(analyticsStats.timeSpentStudying / 60)}h</div>
            <div className="text-sm glass-text-description">Study Time</div>
          </Card>
        </div>

        {/* Analytics Dashboard */}
        <div className="glass-card p-6 mb-8 rounded-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold glass-text-title">Performance Analytics</h2>
              <p className="glass-text-description">Detailed insights into your learning progress</p>
            </div>
            
            {/* Chart Customization Controls */}
            <div className="flex items-center gap-4">
              <Select value={chartTimeframe} onValueChange={setChartTimeframe}>
                <SelectTrigger className="glass-input w-40">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 3 months</SelectItem>
                  <SelectItem value="1year">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="glass-input w-40">
                  <SelectValue placeholder="Metric" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="score">Score Trends</SelectItem>
                  <SelectItem value="difficulty">Difficulty Progress</SelectItem>
                  <SelectItem value="topics">Topic Performance</SelectItem>
                  <SelectItem value="time">Time Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="glass-card w-full justify-start">
              <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="quiz-performance" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <TrendingUp className="h-4 w-4 mr-2" />
                Quiz Performance
              </TabsTrigger>
              <TabsTrigger value="content-analytics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <PieChart className="h-4 w-4 mr-2" />
                Content Analytics
              </TabsTrigger>
              <TabsTrigger value="progress-timeline" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Calendar className="h-4 w-4 mr-2" />
                Progress Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="glass-text-title flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Score Distribution
                    </CardTitle>
                    <CardDescription className="glass-text-description">
                      Distribution of your quiz scores
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScoreDistributionChart data={quizResults} />
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="glass-text-title flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      Difficulty Analysis
                    </CardTitle>
                    <CardDescription className="glass-text-description">
                      Performance across difficulty levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DifficultyAnalysisChart data={quizResults} />
                  </CardContent>
                </Card>
              </div>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="glass-text-title flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Topic Mastery
                  </CardTitle>
                  <CardDescription className="glass-text-description">
                    Your performance across different topics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TopicMasteryChart data={quizResults} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiz-performance">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="glass-text-title">Quiz Performance Over Time</CardTitle>
                  <CardDescription className="glass-text-description">
                    Track your quiz performance trends and improvements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <QuizPerformanceChart 
                    data={quizResults} 
                    timeframe={chartTimeframe}
                    metric={selectedMetric}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content-analytics">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="glass-text-title">Content Generation Analytics</CardTitle>
                  <CardDescription className="glass-text-description">
                    Insights into your content creation patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContentAnalyticsChart 
                    data={contentData} 
                    timeframe={chartTimeframe}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress-timeline">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="glass-text-title">Learning Progress Timeline</CardTitle>
                  <CardDescription className="glass-text-description">
                    Your complete learning journey over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProgressTimelineChart 
                    quizData={quizResults}
                    contentData={contentData}
                    timeframe={chartTimeframe}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
    
  );
}