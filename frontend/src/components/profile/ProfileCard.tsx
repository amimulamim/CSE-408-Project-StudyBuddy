import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Edit3, MapPin, GraduationCap, Briefcase, Hash } from 'lucide-react';
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

interface ProfileCardProps {
  userProfile: UserProfile;
  onProfileUpdate?: (updatedProfile: Partial<UserProfile>) => void;
}

export function ProfileCard({ userProfile, onProfileUpdate }: ProfileCardProps) {
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

  return (
    <>
      <Card className="overflow-hidden glass-card">
        <div className="h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative">
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
        
        <CardHeader className="relative pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-20 w-20 border-4 border-white shadow-lg -mt-10 relative z-10">
              <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials(userProfile.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-xl glass-text-title">{userProfile.name}</CardTitle>
                  <p className="glass-text-description text-sm">{userProfile.email}</p>
                </div>
                <div className="flex gap-2 self-start sm:self-center">
                  {userProfile.is_admin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/admin/dashboard')}
                      className="glass-button-secondary border"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="glass-button-secondary border"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Bio Section */}
          {userProfile.bio && (
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {userProfile.bio}
              </p>
            </div>
          )}

          {/* Profile Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userProfile.role && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Role:</span> {userProfile.role}
                </span>
              </div>
            )}

            {userProfile.institution && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Institution:</span> {userProfile.institution}
                </span>
              </div>
            )}

            {userProfile.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Location:</span> {userProfile.location}
                </span>
              </div>
            )}

            {userProfile.study_domain && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Study Domain:</span> {userProfile.study_domain}
                </span>
              </div>
            )}
          </div>

          {/* Interests */}
          {userProfile.interests && userProfile.interests.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Interests</h4>
              <div className="flex flex-wrap gap-2">
                {userProfile.interests.map((interest, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Plan Badge */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <Badge 
                variant={userProfile.current_plan === 'premium' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {userProfile.current_plan}
              </Badge>
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