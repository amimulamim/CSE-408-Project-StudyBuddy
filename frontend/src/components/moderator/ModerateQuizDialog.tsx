import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { makeRequest } from '@/lib/apiCall';

export function ModerateQuizDialog({ quiz, onClose, onModerated }: any) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    await makeRequest(`${API_BASE_URL}/api/v1/content-moderator/quiz/${quiz.quizId}/moderate`, 'PUT', JSON.stringify({ approve: true }));
    toast.success('Quiz approved');
    setLoading(false);
    onModerated();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-lg">
        <DialogHeader>
          <DialogTitle>Moderate Quiz: {quiz.topic}</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <div><b>Domain:</b> {quiz.domain}</div>
          <div><b>Difficulty:</b> {quiz.difficulty}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleApprove} disabled={loading}>Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 