import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ModeratorContentList } from '@/components/moderator/ModeratorContentList';
import { ModeratorProfileCard } from '@/components/moderator/ModeratorProfileCard';

export default function ModeratorDashboard() {
  const [activeTab, setActiveTab] = useState('pending-content');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold gradient-text mb-2">Moderator Dashboard</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending-content">Pending Content</TabsTrigger>
          {/* <TabsTrigger value="pending-quizzes">Pending Quizzes</TabsTrigger> */}
          <TabsTrigger value="all-content">All Content</TabsTrigger>
          {/* <TabsTrigger value="all-quizzes">All Quizzes</TabsTrigger> */}
          <TabsTrigger value="profile">Profile & Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="pending-content">
          <ModeratorContentList type="slides_pending" />
        </TabsContent>
        {/* <TabsContent value="pending-quizzes">
          <ModeratorQuizList type="pending" />
        </TabsContent> */}
        <TabsContent value="all-content">
          <ModeratorContentList type="all" />
        </TabsContent>
        {/* <TabsContent value="all-quizzes">
          <ModeratorQuizList type="all" />
        </TabsContent> */}
        <TabsContent value="profile">
          <ModeratorProfileCard />
        </TabsContent>
      </Tabs>
    </div>
  );
} 