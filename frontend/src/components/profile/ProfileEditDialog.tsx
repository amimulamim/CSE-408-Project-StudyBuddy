import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Plus, Loader2, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { ApiResponse } from '@/lib/api';
import { updateProfileData, uploadAvatar } from './api';

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

interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSave: (updatedProfile: Partial<UserProfile>) => void;
}

const roleOptions = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'professional', label: 'Professional' },
  { value: 'other', label: 'Other' }
];

export function ProfileEditDialog({ isOpen, onClose, userProfile, onSave }: ProfileEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatar: '',
    institution: '',
    role: '',
    location: '',
    study_domain: '',
    interests: [] as string[]
  });
  const [newInterest, setNewInterest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  useEffect(() => {
    if (isOpen && userProfile) {
      setFormData({
        name: userProfile.name || '',
        bio: userProfile.bio || '',
        avatar: userProfile.avatar || '',
        institution: userProfile.institution || '',
        role: userProfile.role || '',
        location: userProfile.location || '',
        study_domain: userProfile.study_domain || '',
        interests: userProfile.interests || []
      });
      setAvatarFile(null);
      setAvatarPreview('');
    }
  }, [isOpen, userProfile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setAvatarFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatarFile = () => {
    setAvatarFile(null);
    setAvatarPreview('');
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const formatInterestsForAPI = (originalInterests: string[], newInterests: string[]) => {
    const added = newInterests.filter(interest => !originalInterests.includes(interest));
    const removed = originalInterests.filter(interest => !newInterests.includes(interest));
    
    const operations = [
      ...added.map(interest => `+${interest}`),
      ...removed.map(interest => `-${interest}`)
    ];
    
    return operations.join(',');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsLoading(true);
    try {
      // const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      
      // Handle avatar upload first if file is selected
      let avatarUrl = formData.avatar;
      if (avatarFile) {
        try {
          // const avatarFormData = new FormData();
          // avatarFormData.append('avatar', avatarFile);

          // const avatarResponse:ApiResponse = await makeRequest(
          //   `${API_BASE_URL}/api/v1/user/profile/avatar`,
          //   'PUT',
          //   avatarFormData
          // );
          const avatarResponse:ApiResponse = await uploadAvatar(avatarFile);

          if (avatarResponse.status === 'success') {
            avatarUrl = avatarResponse.data?.avatar_url; 
            // not showing success toast just for avatar upload
            // toast.success('Avatar uploaded successfully');
          } else {
            throw new Error(avatarResponse.data?.message || 'Failed to upload avatar');
          }
        } catch (avatarError) {
          toast.error('Failed to upload avatar');
          setIsLoading(false);
          return; // Don't proceed with profile update if avatar upload fails
        }
      }

      // Now update the profile with other data
      const updateData: any = {
        name: formData.name,
        bio: formData.bio,
        institution: formData.institution,
        role: formData.role,
        location: formData.location,
        study_domain: formData.study_domain
      };

      // Include avatar URL if it changed (either from file upload or URL input)
      if (avatarUrl !== userProfile.avatar) {
        updateData.avatar = avatarUrl;
      }

      // Only include interests if they changed
      const originalInterests = userProfile.interests || [];
      const newInterests = formData.interests;
      if (JSON.stringify(originalInterests.sort()) !== JSON.stringify(newInterests.sort())) {
        updateData.interests = formatInterestsForAPI(originalInterests, newInterests);
      }

      // const response:ApiResponse = await makeRequest(
      //   `${API_BASE_URL}/api/v1/user/profile`,
      //   'PUT',
      //   updateData
      // );
      const response:ApiResponse = await updateProfileData(updateData);

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success') {
          toast.success('Profile updated successfully');
          
          // Update form data with the actual avatar URL from server
          const updatedFormData = { ...formData };
          if (avatarUrl) {
            updatedFormData.avatar = avatarUrl;
          }
          
          onSave(updatedFormData);
          onClose();
        } else {
          toast.error(response.msg || 'Failed to update profile');
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCurrentAvatarSrc = () => {
    if (avatarPreview) return avatarPreview;
    return formData.avatar;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. Changes will be saved to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="space-y-4">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={getCurrentAvatarSrc()} alt={formData.name} />
                <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {getInitials(formData.name || 'U')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                {/* File Upload */}
                <div>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    {avatarFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeAvatarFile}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {avatarFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {avatarFile.name} ({(avatarFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                {/* URL Input - Alternative option */}
                <div className="relative">
                  <Label htmlFor="avatar" className="text-xs text-muted-foreground">
                    Or enter image URL
                  </Label>
                  <Input
                    id="avatar"
                    value={formData.avatar}
                    onChange={(e) => handleInputChange('avatar', e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="text-sm"
                    disabled={!!avatarFile}
                  />
                </div>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG, GIF. Max size: 5MB.
            </p>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                placeholder="Your school or organization"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="study_domain">Study Domain</Label>
            <Input
              id="study_domain"
              value={formData.study_domain}
              onChange={(e) => handleInputChange('study_domain', e.target.value)}
              placeholder="Computer Science, Mathematics, etc."
            />
          </div>

          {/* Interests */}
          <div>
            <Label>Interests</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add an interest"
                onKeyDown={(e) => e.key === 'Enter' && addInterest()}
              />
              <Button type="button" onClick={addInterest} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.interests.map((interest, index) => (
                  <Badge key={index} variant="secondary" className="pr-1">
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}