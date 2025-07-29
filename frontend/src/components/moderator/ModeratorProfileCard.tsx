import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { makeRequest } from '@/lib/apiCall';

export function ModeratorProfileCard() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    makeRequest(`${API_BASE_URL}/api/v1/content-moderator/profile`, 'GET', null)
      .then(res => res.data)
      .then(setProfile);
  }, []);

  if (!profile) return <div>Loading...</div>;

  return (
    <Card className="glass-card max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Moderator Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2"><b>Moderator ID:</b> {profile.moderator_id}</div>
        <div className="mb-2"><b>Contents Modified:</b> {profile.contents_modified}</div>
        <div className="mb-2"><b>Quizzes Modified:</b> {profile.quizzes_modified}</div>
        <div className="mb-2"><b>Total Time Spent:</b> {profile.total_time_spent} min</div>
        <div className="mb-2"><b>Domains:</b> {profile.domains?.join(', ')}</div>
        <div className="mb-2"><b>Topics:</b> {profile.topics?.join(', ')}</div>
      </CardContent>
    </Card>
  );
} 