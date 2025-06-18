import { useState, useEffect, useCallback } from 'react';
import { getAuth, User } from 'firebase/auth';
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
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async (isRefetch = false) => {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      if (isRefetch) {
        setRefetching(true);
      } else {
        setLoading(true);
      }
      
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
      const response = await makeRequest<UserProfile>(
        `${API_BASE_URL}/api/v1/user/profile`,
        'GET'
      );

      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 'success' && response.data) {
          setUserProfile(response.data as UserProfile);
          setError(null);
        } else {
          setError('Failed to fetch user profile');
          if (!isRefetch) toast.error('Failed to load user profile');
        }
      } else {
        setUserProfile(response as UserProfile);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Error fetching user profile');
      if (!isRefetch) toast.error('Error loading user profile');
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  }, []);

  const refetchUserProfile = useCallback(async () => {
    await fetchUserProfile(true);
  }, [fetchUserProfile]);

  useEffect(() => {
    fetchUserProfile(false);
  }, [fetchUserProfile]);

  return { 
    userProfile, 
    loading, 
    refetching,
    error, 
    refetchUserProfile 
  };
};