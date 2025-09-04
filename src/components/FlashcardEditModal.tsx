import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, AlertCircle, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface GeneratedCard {
  id?: string;
  type: string;
  question: string;
  answer: string;
  difficulty: string;
}

interface FlashcardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcard: GeneratedCard | null;
  onSave: (updatedCard: GeneratedCard, originalCard: GeneratedCard) => Promise<void>;
  onDelete?: (cardId: string) => Promise<void>;
  isLoading?: boolean;
  mode?: 'edit' | 'create';
}

const FlashcardEditModal: React.FC<FlashcardEditModalProps> = ({
  isOpen,
  onClose,
  flashcard,
  onSave,
  onDelete,
  isLoading = false,
  mode = 'edit'
}) => {
  const [editedCard, setEditedCard] = useState<GeneratedCard>({
    type: 'flashcard',
    question: '',
    answer: '',
    difficulty: 'intermediate'
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { toast } = useToast();

  // Initialize form data when flashcard changes
  useEffect(() => {
    if (flashcard) {
      setEditedCard({ ...flashcard });
      setHasUnsavedChanges(false);
    } else if (mode === 'create') {
      setEditedCard({
        type: 'flashcard',
        question: '',
        answer: '',
        difficulty: 'intermediate'
      });
      setHasUnsavedChanges(false);
    }
    setErrors({});
    setPreviewMode(false);
  }, [flashcard, mode, isOpen]);

  // Track changes
  useEffect(() => {
    if (flashcard && mode === 'edit') {
      const hasChanges = (
        editedCard.question !== flashcard.question ||
        editedCard.answer !== flashcard.answer ||
        editedCard.difficulty !== flashcard.difficulty ||
        editedCard.type !== flashcard.type
      );
      setHasUnsavedChanges(hasChanges);
    } else if (mode === 'create') {
      const hasContent = Boolean(editedCard.question.trim() || editedCard.answer.trim());
      setHasUnsavedChanges(hasContent);
    }
  }, [editedCard, flashcard, mode]);

  const validateCard = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editedCard.question.trim()) {
      newErrors.question = 'Question is required';
    } else if (editedCard.question.trim().length < 5) {
      newErrors.question = 'Question must be at least 5 characters long';
    }

    if (!editedCard.answer.trim()) {
      newErrors.answer = 'Answer is required';
    } else if (editedCard.answer.trim().length < 2) {
      newErrors.answer = 'Answer must be at least 2 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateCard()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editedCard, flashcard || editedCard);
      setHasUnsavedChanges(false);
      toast({
        title: mode === 'create' ? "Card Created" : "Card Updated",
        description: mode === 'create' ? "New flashcard has been created successfully." : "Your flashcard has been updated successfully."
      });
      onClose();
    } catch (error) {
      console.error('Error saving flashcard:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save flashcard. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!flashcard?.id || !onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(flashcard.id);
      toast({
        title: "Card Deleted",
        description: "The flashcard has been deleted successfully."
      });
      onClose();
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete flashcard. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close without saving?"
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  const updateField = (field: keyof GeneratedCard, value: string) => {
    setEditedCard(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const mapAndCapitalizeDifficulty = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'Easy';
      case 'intermediate': return 'Medium';
      case 'advanced': return 'Hard';
      default: return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{mode === 'create' ? 'Create New Flashcard' : 'Edit Flashcard'}</span>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center gap-1"
              >
                {previewMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new flashcard for your deck.'
              : 'Make changes to your flashcard. Click save when you\'re done.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview Mode */}
          {previewMode ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-6 border-2 border-dashed border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className="text-xs">
                    {editedCard.type} • {mapAndCapitalizeDifficulty(editedCard.difficulty)}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-blue-600">Question:</Label>
                    <p className="text-sm text-foreground mt-1 leading-relaxed bg-white dark:bg-gray-900 p-3 rounded border">
                      {editedCard.question || 'No question entered'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-green-600">Answer:</Label>
                    <p className="text-sm text-foreground mt-1 leading-relaxed bg-white dark:bg-gray-900 p-3 rounded border">
                      {editedCard.answer || 'No answer entered'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="space-y-4">
              {/* Card Type and Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="card-type">Card Type</Label>
                  <Select
                    value={editedCard.type}
                    onValueChange={(value) => updateField('type', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flashcard">Flashcard</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="exercise">Exercise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={editedCard.difficulty}
                    onValueChange={(value) => updateField('difficulty', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Easy</SelectItem>
                      <SelectItem value="intermediate">Medium</SelectItem>
                      <SelectItem value="advanced">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Question */}
              <div>
                <Label htmlFor="question">Question *</Label>
                <Textarea
                  id="question"
                  placeholder="Enter the question for this flashcard..."
                  value={editedCard.question}
                  onChange={(e) => updateField('question', e.target.value)}
                  className={`mt-1 min-h-[100px] ${errors.question ? 'border-red-500' : ''}`}
                />
                {errors.question && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.question}
                  </p>
                )}
              </div>

              {/* Answer */}
              <div>
                <Label htmlFor="answer">Answer *</Label>
                <Textarea
                  id="answer"
                  placeholder="Enter the answer for this flashcard..."
                  value={editedCard.answer}
                  onChange={(e) => updateField('answer', e.target.value)}
                  className={`mt-1 min-h-[100px] ${errors.answer ? 'border-red-500' : ''}`}
                />
                {errors.answer && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.answer}
                  </p>
                )}
              </div>

              {/* Character count */}
              <div className="text-sm text-muted-foreground">
                Question: {editedCard.question.length} characters | Answer: {editedCard.answer.length} characters
              </div>
            </div>
          )}

          {/* Error Display */}
          {Object.keys(errors).length > 0 && !previewMode && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix the errors above before saving.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {mode === 'edit' && onDelete && flashcard?.id && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting || isSaving || isLoading}
                className="flex items-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSaving || isDeleting || isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isDeleting || isLoading || Object.keys(errors).length > 0}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {mode === 'create' ? 'Create Card' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FlashcardEditModal;
