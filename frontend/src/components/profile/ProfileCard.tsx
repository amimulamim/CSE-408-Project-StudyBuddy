import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Edit3, MapPin, GraduationCap, Briefcase, Hash, Crown, Sparkles, ArrowLeft, Trophy, Target, Flame, Star } from 'lucide-react';
import { ProfileEditDialog } from './ProfileEditDialog';

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

interface AnalyticsStats {
  totalQuizzes: number;
  averageScore: number;
  totalContentGenerated: number;
  studyStreak: number;
  masteredTopics: number;
  timeSpentStudying: number;
}

interface ProfileCardProps {
  userProfile: UserProfile;
  analyticsStats: AnalyticsStats;
  onProfileUpdate?: (updatedProfile: Partial<UserProfile>) => void;
}

export function ProfileCard({ userProfile, analyticsStats, onProfileUpdate }: ProfileCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileUpdate = (updatedData: Partial<UserProfile>) => {
    onProfileUpdate?.(updatedData);
    setIsEditDialogOpen(false);
  };

  // Achievement badges based on analytics
  const getAchievementBadges = () => {
    const badges = [];

    if (analyticsStats.totalQuizzes >= 50) {
      badges.push({
        icon: <Trophy className="h-4 w-4" />,
        text: "Quiz Master",
        color: "from-yellow-500 to-orange-500",
        textColor: "text-white"
      });
    } else if (analyticsStats.totalQuizzes >= 10) {
      badges.push({
        icon: <Trophy className="h-4 w-4" />,
        text: "Quiz Explorer",
        color: "from-blue-500 to-purple-600",
        textColor: "text-white"
      });
    }

    if (analyticsStats.averageScore >= 90) {
      badges.push({
        icon: <Star className="h-4 w-4" />,
        text: "Perfectionist",
        color: "from-purple-500 to-pink-600",
        textColor: "text-white"
      });
    } else if (analyticsStats.averageScore >= 80) {
      badges.push({
        icon: <Target className="h-4 w-4" />,
        text: "High Achiever",
        color: "from-green-500 to-emerald-600",
        textColor: "text-white"
      });
    }

    if (analyticsStats.studyStreak >= 30) {
      badges.push({
        icon: <Flame className="h-4 w-4" />,
        text: "Study Legend",
        color: "from-red-500 to-orange-600",
        textColor: "text-white"
      });
    } else if (analyticsStats.studyStreak >= 7) {
      badges.push({
        icon: <Flame className="h-4 w-4" />,
        text: "Consistent",
        color: "from-orange-500 to-red-600",
        textColor: "text-white"
      });
    }

    if (analyticsStats.masteredTopics >= 10) {
      badges.push({
        icon: <Sparkles className="h-4 w-4" />,
        text: "Expert",
        color: "from-indigo-500 to-purple-600",
        textColor: "text-white"
      });
    } else if (analyticsStats.masteredTopics >= 5) {
      badges.push({
        icon: <Sparkles className="h-4 w-4" />,
        text: "Specialist",
        color: "from-cyan-500 to-blue-600",
        textColor: "text-white"
      });
    }

    return badges.slice(0, 3); // Limit to 3 badges to avoid clutter
  };

  const achievementBadges = getAchievementBadges();

  return (
    <>
      <Card className="overflow-hidden glass-card">
        <div className="h-28 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
        </div>
        
        <CardHeader className="relative pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl -mt-12 relative z-10">
              <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
              <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials(userProfile.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div>
                      <CardTitle className="text-2xl font-bold glass-text-title mb-1">{userProfile.name}</CardTitle>
                      <p className="glass-text-description text-base font-medium">{userProfile.email}</p>
                    </div>
                    
                    {/* Achievement Badges */}
                    {achievementBadges.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {achievementBadges.map((badge, index) => (
                          <Badge 
                            key={index}
                            className={`text-xs font-bold px-3 py-1 bg-gradient-to-r ${badge.color} ${badge.textColor} shadow-lg border-0 flex items-center gap-1.5`}
                          >
                            {badge.icon}
                            {badge.text}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-2 self-start sm:self-center">
                  {userProfile.is_admin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/admin/dashboard')}
                      className="button-light-purple"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="button-light-blue"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Bio Section */}
          {userProfile.bio && (
            <div className="bg-slate-800/30 rounded-lg p-4 border border-white/10">
              <h4 className="text-base font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                About
              </h4>
              <p className="text-slate-300 leading-relaxed font-medium">
                {userProfile.bio}
              </p>
            </div>
          )}

          {/* Profile Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userProfile.role && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-400/20">
                <div className="p-2 rounded-full bg-emerald-500/20">
                  <Briefcase className="h-6 w-6 text-emerald-400 font-bold" />
                </div>
                <div>
                  <p className="text-emerald-300 font-semibold text-sm uppercase tracking-wide">Role</p>
                  <p className="text-slate-200 font-bold text-lg">{userProfile.role}</p>
                </div>
              </div>
            )}

            {userProfile.institution && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-400/20">
                <div className="p-2 rounded-full bg-blue-500/20">
                  <GraduationCap className="h-6 w-6 text-blue-400 font-bold" />
                </div>
                <div>
                  <p className="text-blue-300 font-semibold text-sm uppercase tracking-wide">Institution</p>
                  <p className="text-slate-200 font-bold text-lg">{userProfile.institution}</p>
                </div>
              </div>
            )}

            {userProfile.location && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-400/20">
                <div className="p-2 rounded-full bg-pink-500/20">
                  <MapPin className="h-6 w-6 text-pink-400 font-bold" />
                </div>
                <div>
                  <p className="text-pink-300 font-semibold text-sm uppercase tracking-wide">Location</p>
                  <p className="text-slate-200 font-bold text-lg">{userProfile.location}</p>
                </div>
              </div>
            )}

            {userProfile.study_domain && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-400/20">
                <div className="p-2 rounded-full bg-purple-500/20">
                  <Hash className="h-6 w-6 text-purple-400 font-bold" />
                </div>
                <div>
                  <p className="text-purple-300 font-semibold text-sm uppercase tracking-wide">Study Domain</p>
                  <p className="text-slate-200 font-bold text-lg">{userProfile.study_domain}</p>
                </div>
              </div>
            )}
          </div>

          {/* Interests */}
          {userProfile.interests && userProfile.interests.length > 0 && (
            <div className="bg-slate-800/30 rounded-lg p-4 border border-white/10">
              <h4 className="text-base font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Hash className="h-5 w-5 text-cyan-400" />
                Interests & Expertise
              </h4>
              <div className="flex flex-wrap gap-3">
                {userProfile.interests.map((interest, index) => (
                  <Badge 
                    key={index} 
                    className="text-sm font-medium px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 border border-cyan-400/30 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-200"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Plan Badge */}
          <div className="bg-slate-800/30 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-yellow-500/20">
                  <Crown className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-yellow-300 font-semibold text-sm uppercase tracking-wide">Current Plan</p>
                  <p className="text-slate-200 font-bold text-lg capitalize">{userProfile.current_plan}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        userProfile={userProfile}
        onSave={handleProfileUpdate}
      />
    </>
  );
}