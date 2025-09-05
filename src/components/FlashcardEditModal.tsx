import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, AlertCircle, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface GeneratedCard {
  id?: string;
  type: string;
  question?: string;
  instruction?: string; // For exercises - main question/statement
  answer: string;
  difficulty: string;
  options?: string[]; // For quiz types
  concepts?: string[]; // For matching exercises
  definitions?: string[]; // For matching exercises
  exercise_type?: string; // Specific exercise type (fill_blank, true_false, etc.)
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
    difficulty: 'intermediate',
    options: [],
    concepts: [],
    definitions: [],
    exercise_type: 'fill_blank'
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { toast } = useToast();

  // Helper functions for dynamic forms
  const addOption = () => {
    const currentCount = (editedCard.options || []).length;
    setEditedCard(prev => ({
      ...prev,
      options: [...(prev.options || []), `Option ${currentCount + 1}`]
    }));
  };

  const updateOption = (index: number, value: string) => {
    setEditedCard(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }));
  };

  const removeOption = (index: number) => {
    setEditedCard(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const addConceptDefinitionPair = () => {
    const currentCount = (editedCard.concepts || []).length;
    setEditedCard(prev => ({
      ...prev,
      concepts: [...(prev.concepts || []), `Concept ${currentCount + 1}`],
      definitions: [...(prev.definitions || []), `Definition ${currentCount + 1}`]
    }));
  };

  const updateConcept = (index: number, value: string) => {
    setEditedCard(prev => ({
      ...prev,
      concepts: prev.concepts?.map((concept, i) => i === index ? value : concept) || []
    }));
  };

  const updateDefinition = (index: number, value: string) => {
    setEditedCard(prev => ({
      ...prev,
      definitions: prev.definitions?.map((def, i) => i === index ? value : def) || []
    }));
  };

  const removeConceptDefinitionPair = (index: number) => {
    setEditedCard(prev => ({
      ...prev,
      concepts: prev.concepts?.filter((_, i) => i !== index) || [],
      definitions: prev.definitions?.filter((_, i) => i !== index) || []
    }));
  };

  // Initialize form data when flashcard changes
  useEffect(() => {
    if (flashcard) {
      const initialCard = { ...flashcard };

      // Ensure quiz cards have proper default options if empty
      if (initialCard.type === 'quiz' && (!initialCard.options || initialCard.options.length === 0)) {
        initialCard.options = ['Option 1', 'Option 2'];
      }

      // Ensure matching exercises have proper defaults
      if (initialCard.type === 'exercise' && initialCard.exercise_type === 'matching') {
        if (!initialCard.concepts || initialCard.concepts.length === 0) {
          initialCard.concepts = ['Concept 1', 'Concept 2'];
        }
        if (!initialCard.definitions || initialCard.definitions.length === 0) {
          initialCard.definitions = ['Definition 1', 'Definition 2'];
        }
      }

      setEditedCard(initialCard);
      setHasUnsavedChanges(false);
    } else if (mode === 'create') {
      setEditedCard({
        type: 'flashcard',
        question: '',
        answer: '',
        difficulty: 'intermediate',
        options: [],
        concepts: [],
        definitions: [],
        exercise_type: 'fill_blank'
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

    // Common validation
    if (!editedCard.answer.trim()) {
      newErrors.answer = 'Answer is required';
    } else if (editedCard.answer.trim().length < 2) {
      newErrors.answer = 'Answer must be at least 2 characters long';
    }

    // Type-specific validation
    if (editedCard.type === 'flashcard') {
      if (!editedCard.question?.trim()) {
        newErrors.question = 'Question is required';
      } else if (editedCard.question.trim().length < 5) {
        newErrors.question = 'Question must be at least 5 characters long';
      }
    } else if (editedCard.type === 'quiz') {
      if (!editedCard.question?.trim()) {
        newErrors.question = 'Question is required';
      } else if (editedCard.question.trim().length < 5) {
        newErrors.question = 'Question must be at least 5 characters long';
      }

      if (!editedCard.options || editedCard.options.length < 2) {
        newErrors.options = 'At least 2 options are required for quiz';
      } else if (editedCard.options.some(opt => !opt.trim())) {
        newErrors.options = 'All options must have content';
      } else if (!editedCard.options.includes(editedCard.answer)) {
        newErrors.answer = 'Answer must match one of the options';
      }
    } else if (editedCard.type === 'exercise') {
      if (!editedCard.instruction?.trim()) {
        newErrors.instruction = 'Instruction/Question is required';
      } else if (editedCard.instruction.trim().length < 5) {
        newErrors.instruction = 'Instruction must be at least 5 characters long';
      }

      if (editedCard.exercise_type === 'matching') {
        if (!editedCard.concepts || editedCard.concepts.length < 2) {
          newErrors.concepts = 'At least 2 concepts are required for matching';
        } else if (editedCard.concepts.some(concept => !concept.trim())) {
          newErrors.concepts = 'All concepts must have content';
        }

        if (!editedCard.definitions || editedCard.definitions.length < 2) {
          newErrors.definitions = 'At least 2 definitions are required for matching';
        } else if (editedCard.definitions.some(def => !def.trim())) {
          newErrors.definitions = 'All definitions must have content';
        }
      }
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
                    onValueChange={(value) => {
                      updateField('type', value);
                      // Reset type-specific fields when type changes
                      if (value === 'quiz') {
                        setEditedCard(prev => ({
                          ...prev,
                          options: prev.options?.length ? prev.options : ['Option 1', 'Option 2']
                        }));
                      } else if (value === 'exercise' && editedCard.exercise_type === 'matching') {
                        setEditedCard(prev => ({
                          ...prev,
                          concepts: prev.concepts?.length ? prev.concepts : ['Concept 1', 'Concept 2'],
                          definitions: prev.definitions?.length ? prev.definitions : ['Definition 1', 'Definition 2']
                        }));
                      }
                    }}
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

              {/* Exercise Type Selection (only for exercises) */}
              {editedCard.type === 'exercise' && (
                <div>
                  <Label htmlFor="exercise-type">Exercise Type</Label>
                  <Select
                    value={editedCard.exercise_type || 'fill_blank'}
                    onValueChange={(value) => {
                      updateField('exercise_type', value);
                      // Reset type-specific fields
                      if (value === 'matching') {
                        setEditedCard(prev => ({
                          ...prev,
                          concepts: prev.concepts?.length ? prev.concepts : ['', ''],
                          definitions: prev.definitions?.length ? prev.definitions : ['', '']
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                      <SelectItem value="matching">Matching</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Dynamic Form Fields Based on Type */}
              {editedCard.type === 'flashcard' && (
                <>
                  {/* Flashcard Question */}
                  <div>
                    <Label htmlFor="question">Question *</Label>
                    <Textarea
                      id="question"
                      placeholder="Enter the question for this flashcard..."
                      value={editedCard.question || ''}
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

                  {/* Flashcard Answer */}
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
                </>
              )}

              {editedCard.type === 'quiz' && (
                <>
                  {/* Quiz Question */}
                  <div>
                    <Label htmlFor="question">Question *</Label>
                    <Textarea
                      id="question"
                      placeholder="Enter the quiz question..."
                      value={editedCard.question || ''}
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

                  {/* Quiz Options */}
                  <div>
                    <Label>Answer Options *</Label>
                    <div className="space-y-2 mt-1">
                      {(editedCard.options || []).map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className={errors.options ? 'border-red-500' : ''}
                          />
                          {(editedCard.options?.length || 0) > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOption}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                    {errors.options && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.options}
                      </p>
                    )}
                  </div>

                  {/* Correct Answer Selection */}
                  <div>
                    <Label htmlFor="answer">Correct Answer *</Label>
                    <Select
                      value={editedCard.answer}
                      onValueChange={(value) => updateField('answer', value)}
                    >
                      <SelectTrigger className={`mt-1 ${errors.answer ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Select the correct answer" />
                      </SelectTrigger>
                      <SelectContent>
                        {(editedCard.options || [])
                          .filter(option => option.trim() !== '') // Only show non-empty options
                          .map((option, index) => (
                            <SelectItem key={index} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        {(editedCard.options || []).filter(option => option.trim() !== '').length === 0 && (
                          <SelectItem value="no-options" disabled>
                            No options available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.answer && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.answer}
                      </p>
                    )}
                  </div>
                </>
              )}

              {editedCard.type === 'exercise' && (
                <>
                  {/* Exercise Instruction/Question */}
                  <div>
                    <Label htmlFor="instruction">
                      {editedCard.exercise_type === 'fill_blank' ? 'Fill-in-the-Blank Statement *' :
                        editedCard.exercise_type === 'true_false' ? 'True/False Statement *' :
                          editedCard.exercise_type === 'short_answer' ? 'Question *' :
                            editedCard.exercise_type === 'matching' ? 'Matching Instructions *' : 'Question/Instruction *'}
                    </Label>
                    <Textarea
                      id="instruction"
                      placeholder={
                        editedCard.exercise_type === 'fill_blank' ? 'Enter statement with blanks (use _______ for blanks)...' :
                          editedCard.exercise_type === 'true_false' ? 'Enter a statement that can be true or false...' :
                            editedCard.exercise_type === 'short_answer' ? 'Enter the question...' :
                              editedCard.exercise_type === 'matching' ? 'Enter instructions for matching...' : 'Enter the instruction...'
                      }
                      value={editedCard.instruction || ''}
                      onChange={(e) => updateField('instruction', e.target.value)}
                      className={`mt-1 min-h-[100px] ${errors.instruction ? 'border-red-500' : ''}`}
                    />
                    {errors.instruction && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.instruction}
                      </p>
                    )}
                  </div>

                  {/* Exercise-specific fields */}
                  {editedCard.exercise_type === 'matching' ? (
                    <div>
                      <Label>Concepts and Definitions *</Label>
                      <div className="space-y-2 mt-1">
                        {(editedCard.concepts || []).map((concept, index) => (
                          <div key={index} className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder={`Concept ${index + 1}`}
                              value={concept}
                              onChange={(e) => updateConcept(index, e.target.value)}
                              className={errors.concepts ? 'border-red-500' : ''}
                            />
                            <div className="flex items-center space-x-2">
                              <Input
                                placeholder={`Definition ${index + 1}`}
                                value={editedCard.definitions?.[index] || ''}
                                onChange={(e) => updateDefinition(index, e.target.value)}
                                className={errors.definitions ? 'border-red-500' : ''}
                              />
                              {(editedCard.concepts?.length || 0) > 2 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeConceptDefinitionPair(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addConceptDefinitionPair}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Concept-Definition Pair
                        </Button>
                      </div>
                      {(errors.concepts || errors.definitions) && (
                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.concepts || errors.definitions}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="answer">
                        {editedCard.exercise_type === 'true_false' ? 'Correct Answer (True/False) *' : 'Answer *'}
                      </Label>
                      {editedCard.exercise_type === 'true_false' ? (
                        <Select
                          value={editedCard.answer}
                          onValueChange={(value) => updateField('answer', value)}
                        >
                          <SelectTrigger className={`mt-1 ${errors.answer ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select True or False" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="True">True</SelectItem>
                            <SelectItem value="False">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Textarea
                          id="answer"
                          placeholder={
                            editedCard.exercise_type === 'fill_blank' ? 'Enter the word(s) that fill the blank(s)...' :
                              'Enter the expected answer...'
                          }
                          value={editedCard.answer}
                          onChange={(e) => updateField('answer', e.target.value)}
                          className={`mt-1 min-h-[100px] ${errors.answer ? 'border-red-500' : ''}`}
                        />
                      )}
                      {errors.answer && (
                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.answer}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Character count */}
              <div className="text-sm text-muted-foreground">
                {editedCard.type === 'flashcard' && `Question: ${(editedCard.question || '').length} characters | Answer: ${editedCard.answer.length} characters`}
                {editedCard.type === 'quiz' && `Question: ${(editedCard.question || '').length} characters | Options: ${(editedCard.options || []).length}`}
                {editedCard.type === 'exercise' && `Instruction: ${(editedCard.instruction || '').length} characters | Answer: ${editedCard.answer.length} characters`}
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
