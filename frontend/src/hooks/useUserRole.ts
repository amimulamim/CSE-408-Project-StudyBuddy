import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { makeRequest } from '@/lib/apiCall';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/authState';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
  is_admin: boolean;
  current_plan: string;
  [key: string]: any;
}

export const useUserRole = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();
  let isAdmin = false;

  useEffect(() => {
    const fetchUserProfile = async () => {
      const user = await getCurrentUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
        const response = await makeRequest<UserProfile>(
          `${API_BASE_URL}/api/v1/user/profile`,
          'GET'
        );

        if (response && typeof response === 'object' && 'status' in response) {
          if (response.status === 'success' && response.data) {
            isAdmin = response.data.is_admin || false;
            console.log('printing is admin data');
            console.log(isAdmin);
            setUserProfile(response.data as UserProfile);
            setError(null);
          } else {
            setError('Failed to fetch user profile');
            toast.error('Failed to load user profile');
          }
        } else {
          setUserProfile(response as UserProfile);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Error fetching user profile');
        toast.error('Error loading user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  return { userProfile, loading, error, isAdmin };
};