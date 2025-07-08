import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, RotateCcw, Volume2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import MarkdownRenderer from '../chatbot/MarkdownRenderer';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardsViewerProps {
  flashcards: Flashcard[];
  topic: string;
  onClose: () => void;
}

export function FlashcardsViewer({ flashcards, topic, onClose }: FlashcardsViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completedCards, setCompletedCards] = useState<Set<number>>(new Set());

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  const playFlipSound = () => {
    // Placeholder for sound effect
    const audio = new Audio('/sounds/card-flip.mp3');
    audio.play().catch(() => {}); // Ignore errors if sound file doesn't exist
  };

  const playNextSound = () => {
    // Placeholder for sound effect
    const audio = new Audio('/sounds/card-next.mp3');
    audio.play().catch(() => {}); // Ignore errors if sound file doesn't exist
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    playFlipSound();
    if (!isFlipped) {
      setCompletedCards(prev => new Set([...prev, currentIndex]));
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      playNextSound();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      playNextSound();
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompletedCards(new Set());
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, isFlipped]);

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen dashboard-bg-animated flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">No flashcards found</h3>
            <p className="text-muted-foreground mb-4">This content might be corrupted or empty</p>
            <Button onClick={onClose}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg-animated p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">{topic}</h1>
            <p className="text-muted-foreground">
              Card {currentIndex + 1} of {flashcards.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {completedCards.size}/{flashcards.length} completed
            </Badge>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Flashcard */}
        <div className="flex justify-center">
          <div 
            className="relative w-full max-w-2xl h-96 perspective-1000 cursor-pointer"
            onClick={handleFlip}
          >
            <div 
              className={cn(
                "relative w-full h-full transition-transform duration-600 transform-style-preserve-3d",
                isFlipped && "rotate-y-180"
              )}
            >
              {/* Front of card */}
              <Card className={cn(
                "absolute inset-0 backface-hidden border-0 shadow-2xl flashcard-academic-front",
                completedCards.has(currentIndex) && "ring-4 ring-yellow-400 ring-opacity-80"
              )}>
                <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="mb-6">
                    <Badge 
                      variant="secondary" 
                      className="bg-white/20 text-white border-0 px-4 py-2 text-sm font-semibold backdrop-blur-sm"
                    >
                      Question
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold leading-relaxed text-white flashcard-text-shadow max-w-lg">
                    <MarkdownRenderer content={currentCard.front} textSize='text-2xl' font='font-bold'/>
                  </div>
                  <div className="mt-8 text-white/80 flashcard-light-text-shadow">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-8 h-0.5 bg-white/60"></div>
                      <span className="text-sm font-medium">TAP TO REVEAL</span>
                      <div className="w-8 h-0.5 bg-white/60"></div>
                    </div>
                    <p className="text-xs">Space bar to flip • Arrow keys to navigate</p>
                  </div>
                </CardContent>
              </Card>

              {/* Back of card */}
              <Card className="absolute inset-0 backface-hidden rotate-y-180 border-0 shadow-2xl flashcard-academic-back">
                <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="mb-6">
                    <Badge 
                      className="bg-white/20 text-white border-0 px-4 py-2 text-sm font-semibold backdrop-blur-sm"
                    >
                      Answer
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold leading-relaxed text-white flashcard-text-shadow max-w-lg whitespace-pre-wrap">
                    <MarkdownRenderer content={currentCard.back} textSize='text-xl'/>
                  </div>
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="text-white/80 flashcard-light-text-shadow">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-6 h-0.5 bg-white/60"></div>
                        <span className="text-sm font-medium">NAVIGATION</span>
                        <div className="w-6 h-0.5 bg-white/60"></div>
                      </div>
                      <p className="text-xs">← → Arrow keys • Space to flip back</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2 px-4">
            {flashcards.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentIndex ? "bg-purple-500" : 
                  completedCards.has(index) ? "bg-green-500" : "bg-gray-300"
                )}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsFlipped(false);
                }}
              />
            ))}
          </div>

          <Button 
            variant="outline" 
            onClick={handleNext}
            disabled={currentIndex === flashcards.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Keyboard shortcuts */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Keyboard shortcuts: Space (flip) • ← → (navigate) • R (reset)</p>
        </div>
      </div>
    </div>
  );
}