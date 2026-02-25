import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload as UploadIcon, FileText, Image, File, Cloud, CheckCircle, AlertCircle, Info, UserPlus, Eye, BookOpen, Lock, Edit, Trash2, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { API_ENDPOINTS } from '@/config/api';
import FlashcardEditModal from '@/components/FlashcardEditModal';
import { DeckManagementService, GeneratedCard } from '@/services/deckManagementService';

interface ApiErrorResponse {
  error: string;
  code?: string;
}

const isApiError = (error: unknown): error is { response: { data: ApiErrorResponse } } => {
  return error && typeof error === 'object' && 'response' in error &&
    error.response && typeof error.response === 'object' && 'data' in error.response &&
    error.response.data && typeof error.response.data === 'object' && 'error' in error.response.data;
};

// Helper to extract generated content from various API response shapes
function extractGeneratedContent(response: any): {
  quizzes?: any[];
  exercises?: any[];
  flashcards?: any[];
} | null {
  console.log('Extracting generated content from response:', response);

  // Case 1: Status response with generated_cards in data
  if (response?.data?.generated_cards) {
    console.log('Found generated_cards in response.data:', response.data.generated_cards);
    return {
      flashcards: response.data.generated_cards.flashcard || [],
      quizzes: response.data.generated_cards.quiz || [],
      exercises: response.data.generated_cards.exercise || []
    };
  }

  // Case 2: Status response with nested data.data
  if (response?.data?.data?.generated_cards) {
    console.log('Found generated_cards in response.data.data:', response.data.data.generated_cards);
    return {
      flashcards: response.data.data.generated_cards.flashcard || [],
      quizzes: response.data.data.generated_cards.quiz || [],
      exercises: response.data.data.generated_cards.exercise || []
    };
  }

  // Case 3: Status response with generated_content
  if (response?.data?.generated_content) {
    console.log('Found generated_content in response.data:', response.data.generated_content);
    const content = response.data.generated_content;
    return {
      flashcards: content.flashcard || content.flashcards || [],
      quizzes: content.quiz || content.quizzes || [],
      exercises: content.exercise || content.exercises || []
    };
  }

  // Case 4: New upload (nested in metadata)
  if (response?.metadata?.generated_content) {
    console.log('Found generated_content in metadata:', response.metadata.generated_content);
    let content = response.metadata.generated_content;
    if (content.generated_content) {
      content = content.generated_content;
    }
    return {
      flashcards: content.flashcard || content.flashcards || [],
      quizzes: content.quiz || content.quizzes || [],
      exercises: content.exercise || content.exercises || []
    };
  }

  // Case 5: Already processed (flat)
  if (response?.result?.generated_content) {
    console.log('Found generated_content in result:', response.result.generated_content);
    const content = response.result.generated_content;
    return {
      flashcards: content.flashcard || content.flashcards || [],
      quizzes: content.quiz || content.quizzes || [],
      exercises: content.exercise || content.exercises || []
    };
  }

  // Case 6: Direct access
  if (response?.generated_content) {
    console.log('Found generated_content directly:', response.generated_content);
    const content = response.generated_content;
    return {
      flashcards: content.flashcard || content.flashcards || [],
      quizzes: content.quiz || content.quizzes || [],
      exercises: content.exercise || content.exercises || []
    };
  }

  console.log('No generated content found in response');
  return null;
}

const Upload = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [processingStage, setProcessingStage] = useState<string>('');
  const [processingLogs, setProcessingLogs] = useState<any[]>([]);
  const [showDetailedLogs, setShowDetailedLogs] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [guestLimitExceeded, setGuestLimitExceeded] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [cardTypes, setCardTypes] = useState<string[]>(["flashcard", "quiz", "exercise"]); // default all types checked
  const [difficulty, setDifficulty] = useState<string>("intermediate");

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<GeneratedCard | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [deckManagementService] = useState(new DeckManagementService());
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Ref to prevent duplicate uploads
  const uploadInProgressRef = useRef(false);

  interface Quiz {
    type: string;
    answer: string;
    options: string[];
    question: string;
    difficulty: string;
    correct_answer_option: string;
  }

  interface Exercise {
    type: 'fill_blank' | 'fill_in_the_blank' | 'true_false' | 'short_answer' | 'matching' | 'multiple_choice';
    instruction: string;
    question?: string;
    answer: string | Record<string, string>;
    difficulty: string;
    concepts?: string[];
    definitions?: string[];
    options?: string[];
  }

  interface GeneratedContent {
    flashcards?: GeneratedCard[];
    quizzes?: Quiz[];
    exercises?: Exercise[];
    [key: string]: unknown;
  }
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const generatedContentRef = useRef<GeneratedContent | null>(null);

  // Keep the ref in sync with the state
  useEffect(() => {
    if (generatedContent) {
      generatedContentRef.current = generatedContent;
    }
  }, [generatedContent]);

  const supportedFormats = [
    { icon: FileText, name: "PDF", description: "Text documents, study materials" },
    { icon: File, name: "Text Files", description: "TXT, DOCX files" },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check file type
      const allowedTypes = ['.pdf', '.docx', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (allowedTypes.includes(fileExtension)) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Unsupported file type",
          description: "Please upload a PDF, DOCX, or TXT file",
          variant: "destructive"
        });
      }
    }
  };

  // Helper to get the correct upload endpoint
  const getUploadEndpoint = () =>
    isGuest
      ? API_ENDPOINTS.DOCUMENTS.GUEST_UPLOAD
      : API_ENDPOINTS.DOCUMENTS.UPLOAD;

  // Helper to get the correct status endpoint
  const getStatusEndpoint = (id: string) =>
    isGuest
      ? typeof API_ENDPOINTS.DOCUMENTS.GUEST_STATUS === 'function'
        ? API_ENDPOINTS.DOCUMENTS.GUEST_STATUS(id)
        : API_ENDPOINTS.DOCUMENTS.GUEST_STATUS
      : API_ENDPOINTS.DOCUMENTS.STATUS(id);

  // Helper to get the correct cancel endpoint
  const getCancelEndpoint = (id: string) =>
    isGuest
      ? API_ENDPOINTS.DOCUMENTS.GUEST_CANCEL(id)
      : API_ENDPOINTS.DOCUMENTS.CANCEL(id);

  const handleFileUpload = async () => {
    // Prevent duplicate uploads
    if (uploadInProgressRef.current) {
      console.log('Upload already in progress, ignoring duplicate request');
      return;
    }
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    // Validation: Deck name required
    if (!deckName.trim()) {
      toast({
        title: "Deck name required",
        description: "Please enter a name for your deck before uploading.",
        variant: "destructive"
      });
      return;
    }

    // Validation: At least one card type selected
    if (!cardTypes || cardTypes.length === 0) {
      toast({
        title: "Select at least one card type",
        description: "Please select at least one card type to generate.",
        variant: "destructive"
      });
      return;
    }

    // Set upload in progress flag
    uploadInProgressRef.current = true;
    setIsUploading(true);
    setUploadProgress(0);
    setProcessingStatus('processing');
    setProcessingMessage('Uploading file...');
    setGuestLimitExceeded(false);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('language', selectedLanguage);
    formData.append('deck_name', deckName);
    cardTypes.forEach(type => formData.append('card_types[]', type));
    formData.append('difficulty', difficulty);
    formData.append('is_guest', !user ? '1' : '0');

    try {
      const response = await axios.post(getUploadEndpoint(), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': session ? `Bearer ${session.access_token}` : undefined
        },
        transformRequest: [(data) => {
          data.set('is_guest', !user);
          return data;
        }],
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
          if (progress < 100) {
            setProcessingMessage(`Uploading file... ${progress}%`);
          } else {
            setProcessingMessage('Upload complete, processing document...');
          }
        }
      });

      // Use the helper to extract generated content
      const content = extractGeneratedContent(response.data);
      if (content) {
        setGeneratedContent(content);
        generatedContentRef.current = content;
        setGeneratedCards(Array.isArray(content.flashcards) ? content.flashcards : []);
        localStorage.setItem('generatedContent', JSON.stringify(content));
        localStorage.setItem('currentDeckName', deckName); // Store deck name for enrichment
        setUploadComplete(true);
        setProcessingStatus('completed');
      } else if (response.data.document_id) {
        // If not already processed, check status as before
        setDocumentId(response.data.document_id);

        // Handle queue information
        if (response.data.status === 'queued') {
          setProcessingMessage('Document uploaded and queued for processing...');
          setProcessingStage('queued');
          if (response.data.queue_info) {
            setProcessingMessage(`Document queued for processing (delay: ${response.data.queue_info.delay})`);
          }
        } else {
          setProcessingMessage('Document uploaded successfully, starting content analysis...');
        }

        checkProcessingStatus(response.data.document_id);
      } else {
        toast({
          title: "Upload failed",
          description: "No generated content found in response.",
          variant: "destructive"
        });
        setIsUploading(false);
        setProcessingStatus('failed');
      }
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      
      // Reset upload in progress flag
      uploadInProgressRef.current = false;

      // Handle specific guest limit exceeded error
      if (isApiError(error) && error.response.data.code === 'GUEST_LIMIT_EXCEEDED') {
        setGuestLimitExceeded(true);
        setProcessingStatus('failed');
        setIsUploading(false);
        toast({
          title: "Upload limit reached",
          description: error.response.data.error || "Guest users can only upload one document. Please sign up to upload more documents.",
          variant: "destructive"
        });
        return;
      }

      // Handle other errors
      const errorMessage = isApiError(error) ? error.response.data.error : "There was an error uploading your file. Please try again.";

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsUploading(false);
      setProcessingStatus('failed');
    }
  };

  const checkProcessingStatus = async (id: string) => {
    try {
      setProcessingMessage('Checking document processing status...');

      // Build query string for card_types[]
      const params = new URLSearchParams();
      cardTypes.forEach(type => params.append('card_types[]', type));
      const url = `${getStatusEndpoint(id)}?${params.toString()}`;
      const response = await axios.get(url, {
        headers: {
          'Authorization': session ? `Bearer ${session.access_token}` : undefined
        }
      });

      // Check if response has status information for better messaging
      const status = response.data.status;
      const stage = response.data.stage || 'processing';
      const message = response.data.message || 'Processing document...';
      const logs = response.data.logs || [];

      // Update processing information
      setProcessingStage(stage);
      setProcessingMessage(message);
      setProcessingLogs(logs);

      if (status === 'processing' || status === 'queued') {
        // Update message based on processing stage
        setProcessingMessage(message);
      }

      // Check if document processing is completed
      if (status === 'completed') {
        console.log('Document processing completed, extracting content...');

        // Use the helper to extract generated content
        const content = extractGeneratedContent(response.data);
        console.log('Extracted content:', content);

        if (content && (content.flashcards?.length > 0 || content.quizzes?.length > 0 || content.exercises?.length > 0)) {
          // Reset upload in progress flag
          uploadInProgressRef.current = false;
          setProcessingStatus('completed');
          setIsUploading(false);
          setUploadComplete(true);
          setProcessingMessage('Content generation completed successfully!');
          setGeneratedContent(content);
          generatedContentRef.current = content;
          setGeneratedCards(Array.isArray(content.flashcards) ? content.flashcards : []);
          localStorage.setItem('generatedContent', JSON.stringify(content));
          localStorage.setItem('currentDeckName', deckName); // Store deck name for enrichment

          toast({
            title: "Processing Complete!",
            description: `Generated ${content.flashcards?.length || 0} flashcards, ${content.quizzes?.length || 0} quiz questions, and ${content.exercises?.length || 0} exercises.`,
            variant: "default"
          });
        } else {
          console.warn('Processing completed but no content found');
          // Reset upload in progress flag
          uploadInProgressRef.current = false;
          setProcessingStatus('failed');
          setIsUploading(false);
          setProcessingMessage('No content was generated from your document');
          toast({
            title: "Processing Completed",
            description: "Document was processed but no content was generated. The document might be empty or contain unsupported content.",
            variant: "destructive"
          });
        }
      } else if (status === 'failed') {
        // Reset upload in progress flag
        uploadInProgressRef.current = false;
        setProcessingStatus('failed');
        setIsUploading(false);
        setProcessingMessage('Document processing failed');
        toast({
          title: "Processing failed",
          description: response.data.metadata?.error || "There was an error processing your file.",
          variant: "destructive"
        });
      } else {
        // Still processing, check again after a delay (increased to avoid rate limiting)
        setTimeout(() => checkProcessingStatus(id), 5000); // Changed from 2000ms to 5000ms
      }
    } catch (error) {
      console.error('Status check failed:', error);
      // Reset upload in progress flag
      uploadInProgressRef.current = false;
      setProcessingStatus('failed');
      setIsUploading(false);
      setProcessingMessage('Status check failed');
    }
  };

  const handleCancelProcessing = async () => {
    if (!documentId) return;

    try {
      setProcessingMessage('Cancelling document processing...');

      const response = await axios.delete(getCancelEndpoint(documentId), {
        headers: {
          'Authorization': session ? `Bearer ${session.access_token}` : undefined,
          'Content-Type': 'application/json'
        },
        data: {
          is_guest: !user
        }
      });

      if (response.status === 200) {
        // Successfully cancelled on backend - reset upload in progress flag
        uploadInProgressRef.current = false;
        setIsUploading(false);
        setProcessingStatus('idle');
        setDocumentId(null);
        setProcessingMessage('');
        setProcessingStage('');
        setProcessingLogs([]);
        setShowDetailedLogs(false);
        setSelectedFile(null);

        toast({
          title: "Processing Cancelled",
          description: "Document processing has been successfully cancelled.",
        });
      }
    } catch (error: unknown) {
      console.error('Failed to cancel processing:', error);

      // Even if backend cancel fails, reset the frontend state and upload flag
      uploadInProgressRef.current = false;
      setIsUploading(false);
      setProcessingStatus('idle');
      setDocumentId(null);
      setProcessingMessage('');
      setProcessingStage('');
      setProcessingLogs([]);
      setShowDetailedLogs(false);
      setSelectedFile(null);

      const errorMessage = isApiError(error)
        ? error.response.data.error
        : "Failed to cancel processing on server, but stopped locally.";

      toast({
        title: "Cancel Request",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const isGuest = !user;

  // Reset guest limit exceeded state when user signs in
  useEffect(() => {
    if (user && guestLimitExceeded) {
      setGuestLimitExceeded(false);
      setProcessingStatus('idle');
      setProcessingMessage('');
      setProcessingStage('');
      setProcessingLogs([]);
      setShowDetailedLogs(false);
      setUploadComplete(false);
      setGeneratedCards([]);
      setSelectedFile(null);
      setDocumentId(null);
    }
  }, [user, guestLimitExceeded]);

  // Calculate difficulty distribution
  const getDifficultyDistribution = () => {
    const distribution = generatedCards.reduce((acc, card) => {
      acc[card.difficulty] = (acc[card.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return distribution;
  };

  const difficultyDistribution = getDifficultyDistribution();

  // Add utility for mapping and capitalizing difficulty
  const mapAndCapitalizeDifficulty = (difficulty: string | undefined) => {
    if (!difficulty) return 'Unknown';
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'Easy';
      case 'intermediate': return 'Medium';
      case 'advanced': return 'Hard';
      default: return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    }
  };

  // Edit modal handlers
  const handleEditCard = (card: GeneratedCard, index: number) => {
    setEditingCard(card);
    setEditingIndex(index);
    setEditModalOpen(true);
  };

  const handleSaveCard = async (updatedCard: GeneratedCard, originalCard: GeneratedCard) => {
    try {
      // For upload preview, we're working with localStorage content
      const updatedCards = deckManagementService.updateLocalFlashcard(
        generatedCards,
        editingIndex,
        updatedCard
      );

      setGeneratedCards(updatedCards as GeneratedCard[]);

      // Update the generated content in localStorage as well
      const currentContent = generatedContentRef.current;
      if (currentContent) {
        const updatedContent = {
          ...currentContent,
          flashcards: updatedCards as GeneratedCard[]
        };
        setGeneratedContent(updatedContent);
        generatedContentRef.current = updatedContent;
        localStorage.setItem('generatedContent', JSON.stringify(updatedContent));
      }

      setEditModalOpen(false);
      setEditingCard(null);
      setEditingIndex(-1);
    } catch (error) {
      console.error('Error saving flashcard:', error);
      throw error; // Re-throw to let the modal handle the error display
    }
  };

  const handleDeleteCard = async (cardIndex: number) => {
    try {
      const updatedCards = deckManagementService.deleteLocalFlashcard(
        generatedCards,
        cardIndex
      );

      setGeneratedCards(updatedCards as GeneratedCard[]);

      // Update the generated content in localStorage as well
      const currentContent = generatedContentRef.current;
      if (currentContent) {
        const updatedContent = {
          ...currentContent,
          flashcards: updatedCards as GeneratedCard[]
        };
        setGeneratedContent(updatedContent);
        generatedContentRef.current = updatedContent;
        localStorage.setItem('generatedContent', JSON.stringify(updatedContent));
      }

      setEditModalOpen(false);
      setEditingCard(null);
      setEditingIndex(-1);

      toast({
        title: "Card Deleted",
        description: "The flashcard has been removed from your deck."
      });
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      throw error;
    }
  };

  const handleAddCard = () => {
    const newCard: GeneratedCard = {
      type: 'flashcard',
      question: '',
      answer: '',
      difficulty: 'intermediate'
    };
    setEditingCard(newCard);
    setEditingIndex(-1); // -1 indicates new card
    setEditModalOpen(true);
  };

  const handleCreateCard = async (newCard: GeneratedCard) => {
    try {
      const updatedCards = deckManagementService.addLocalFlashcard(
        generatedCards,
        newCard
      );

      setGeneratedCards(updatedCards as GeneratedCard[]);

      // Update the generated content in localStorage as well
      const currentContent = generatedContentRef.current;
      if (currentContent) {
        const updatedContent = {
          ...currentContent,
          flashcards: updatedCards as GeneratedCard[]
        };
        setGeneratedContent(updatedContent);
        generatedContentRef.current = updatedContent;
        localStorage.setItem('generatedContent', JSON.stringify(updatedContent));
      }

      setEditModalOpen(false);
      setEditingCard(null);
      setEditingIndex(-1);
    } catch (error) {
      console.error('Error creating flashcard:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      {/* Navigation Header */}
      <div className="relative w-full">
        <div className="flex justify-between items-center p-4 md:p-6">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-1.5 md:p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg group-hover:scale-105 transition-transform">
              <BookOpen className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MemoSpark
            </span>
          </Link>
          <ThemeSwitcher />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 pt-4 md:pt-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 md:mb-4">Upload Your Study Materials</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base px-4 md:px-0">
            Transform your documents into interactive flashcards automatically.
            Our AI will analyze your content and create personalized learning cards.
          </p>
        </div>

        {/* Guest User Banner */}
        {isGuest && !guestLimitExceeded && (
          <Alert className="mb-4 md:mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-100 text-sm md:text-base">
              <strong>Try out MemoSpark instantly—no sign-up needed!</strong> Upload a document and generate flashcards to experience our AI-powered learning platform.
              <Link to="/register" className="ml-2 underline font-medium hover:text-blue-600 dark:hover:text-blue-300 block sm:inline mt-2 sm:mt-0">
                Create a free account to save your progress →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Guest Limit Exceeded Banner */}
        {guestLimitExceeded && (
          <Alert className="mb-4 md:mb-6 border-red-200 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm md:text-base">
              <strong>Upload limit reached!</strong> Guest users can only upload one document per session.
              <Link to="/register" className="ml-2 underline font-medium hover:text-red-600 block sm:inline mt-2 sm:mt-0">
                Create a free account to upload unlimited documents →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Language Selection */}
        <Card className="mb-6 md:mb-8">
          <CardHeader>
            <CardTitle>Select Content Language</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Badge
                variant={selectedLanguage === 'en' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedLanguage('en')}
              >
                English
              </Badge>
              <Badge
                variant={selectedLanguage === 'si' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedLanguage('si')}
              >
                සිංහල (Sinhala)
              </Badge>
              <Badge
                variant={selectedLanguage === 'ta' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedLanguage('ta')}
              >
                தமிழ் (Tamil)
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {!isUploading && !uploadComplete && (
                <div
                  className={`border-2 border-dashed ${isDragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-gray-300 hover:border-blue-400'
                    } rounded-lg p-8 text-center transition-colors cursor-pointer`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.txt"
                  />
                  <UploadIcon className={`h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'} mx-auto mb-4 transition-colors`} />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {selectedFile ? selectedFile.name : isDragOver ? 'Drop your file here' : 'Drop files here or click to browse'}
                  </h3>
                  <p className="text-muted-foreground mb-4">Support for PDF and text files up to 10MB</p>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileUpload();
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                    disabled={!selectedFile}
                  >
                    Upload File
                  </Button>
                </div>
              )}

              {isUploading && !uploadComplete && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {uploadProgress < 100 ? 'Uploading Document...' : 'Processing Document...'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {processingMessage || 'Analyzing content and generating flashcards'}
                  </p>

                  {/* Progress bar for upload */}
                  {uploadProgress < 100 && (
                    <>
                      <Progress value={uploadProgress} className="max-w-xs mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{uploadProgress}% uploaded</p>
                    </>
                  )}

                  {/* Processing stages indicator */}
                  {uploadProgress >= 100 && (
                    <div className="mt-4 space-y-4">
                      {/* Stage indicator */}
                      {processingStage && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            Current Stage: {processingStage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      )}

                      {/* Animated dots */}
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                        <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                        <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full" style={{ animationDelay: '0.4s' }}></div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        This may take 2-3 minutes depending on document size
                      </p>

                      {/* Processing logs */}
                      {processingLogs.length > 0 && (
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDetailedLogs(!showDetailedLogs)}
                            className="text-xs mb-2"
                          >
                            {showDetailedLogs ? 'Hide' : 'Show'} Processing Details
                          </Button>

                          {showDetailedLogs && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                              <div className="space-y-1">
                                {processingLogs.slice(-5).map((log, index) => (
                                  <div key={index} className="text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                                    </span>
                                    <span className={`ml-2 ${log.type === 'success' ? 'text-green-600 dark:text-green-400' :
                                      log.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                                        'text-blue-600 dark:text-blue-400'
                                      }`}>
                                      {log.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Document ID for reference */}
                      {documentId && (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400">
                            Processing ID: {documentId}
                          </p>

                          {/* Manual refresh and cancel buttons */}
                          <div className="flex justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => checkProcessingStatus(documentId)}
                              className="text-xs"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Check Status
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelProcessing}
                              className="text-xs text-red-600"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}              {uploadComplete && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Upload Complete!</h3>
                  <p className="text-muted-foreground mb-4">Generated {generatedCards.length} flashcards from your document</p>

                  {isGuest && (
                    <Alert className="mb-4 border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-sm">
                        <strong>Guest Mode:</strong> These flashcards are for temporary use only—create a free account to save them and track your progress!
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2 w-full h-full min-w-[140px]"
                      >
                        <Eye className="h-4 w-4" />
                        {showPreview ? 'Hide Preview' : 'Preview Cards'}
                      </Button>
                      <Button
                        className="bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2 w-full h-full min-w-[140px]"
                        onClick={() => {
                          const content = generatedContentRef.current;
                          console.log('Saving to localStorage (from button):', content);
                          if (content && content.flashcards && content.flashcards.length > 0) {
                            localStorage.setItem('generatedContent', JSON.stringify(content));
                            localStorage.setItem('currentDeckName', deckName); // Store deck name for enrichment
                            navigate('/study');
                          }
                        }}
                        disabled={
                          !generatedContentRef.current ||
                          !generatedContentRef.current.flashcards ||
                          generatedContentRef.current.flashcards.length === 0
                        }
                      >
                        <BookOpen className="h-4 w-4" />
                        {isGuest ? 'Try Studying' : 'Start Studying'}
                      </Button>
                    </div>
                    {isGuest && (
                      <div className="flex justify-center mt-4">
                        <Link to="/register" className="w-full sm:w-auto">
                          <Button
                            variant="outline"
                            className="border-green-500 text-green-700 hover:bg-green-50 flex items-center gap-2 w-full sm:w-[200px] h-full min-w-[140px]"
                          >
                            <UserPlus className="h-4 w-4" />
                            Save Progress
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Preview Cards Section */}
                  {showPreview && (
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold text-foreground mb-4">Generated Content Preview</h4>

                      {/* Summary Statistics */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{generatedCards.length}</div>
                          <div className="text-xs text-blue-600">Flashcards</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {generatedContent?.quizzes?.length || 0}
                          </div>
                          <div className="text-xs text-purple-600">Quizzes</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {generatedContent?.exercises?.length || 0}
                          </div>
                          <div className="text-xs text-green-600">Exercises</div>
                        </div>
                      </div>

                      {/* Difficulty Breakdown */}
                      {Object.keys(difficultyDistribution).length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-foreground mb-2">Difficulty Distribution:</h5>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(difficultyDistribution).map(([difficulty, count]) => (
                              <Badge key={difficulty} variant="outline" className="text-xs">
                                {mapAndCapitalizeDifficulty(difficulty)}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Card Button */}
                      <div className="mb-4 flex justify-between items-center">
                        <h5 className="text-sm font-medium text-foreground">Flashcards ({generatedCards.length})</h5>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddCard}
                          className="flex items-center gap-1 text-xs"
                        >
                          <Plus className="h-3 w-3" />
                          Add Card
                        </Button>
                      </div>

                      <div className="max-h-96 overflow-y-auto space-y-4">
                        {generatedCards.map((card, index) => (
                          <Card key={index} className="text-left hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="text-xs">
                                  {card.type} • {mapAndCapitalizeDifficulty(card.difficulty)}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Card {index + 1}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    title="Edit card"
                                    onClick={() => handleEditCard(card, index)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium text-blue-600">Question:</Label>
                                <p className="text-sm text-foreground mt-1 leading-relaxed">{card.question}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-green-600">Answer:</Label>
                                <p className="text-sm text-foreground mt-1 leading-relaxed">{card.answer}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Guest Limit Exceeded State */}
              {guestLimitExceeded && (
                <div className="text-center py-8">
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-lg p-8 border-2 border-dashed border-red-200 dark:border-red-800">
                    <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Upload Limit Reached</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Guest users can only upload one document per session. Create a free account to upload unlimited documents and save your progress!
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link to="/register">
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Create Free Account
                        </Button>
                      </Link>
                      <Link to="/login">
                        <Button variant="outline" className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Sign In
                        </Button>
                      </Link>
                    </div>

                    <div className="mt-6 text-sm text-muted-foreground">
                      <p>Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign in here</Link></p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supported Formats & Options */}
          <div className="space-y-4 md:space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Supported Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportedFormats.map((format, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-card rounded-lg">
                      <format.icon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-foreground">{format.name}</h4>
                        <p className="text-sm text-muted-foreground">{format.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generation Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deck-name">Deck Name</Label>
                    <Input
                      id="deck-name"
                      placeholder="e.g., Biology Chapter 5"
                      className="mt-1"
                      value={deckName}
                      onChange={e => setDeckName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Card Types</Label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={cardTypes.includes('flashcard')}
                          onChange={e => {
                            setCardTypes(prev => e.target.checked ? [...prev, 'flashcard'] : prev.filter(t => t !== 'flashcard'));
                          }}
                        />
                        <span className="text-sm">Question & Answer</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={cardTypes.includes('exercise')}
                          onChange={e => {
                            setCardTypes(prev => e.target.checked ? [...prev, 'exercise'] : prev.filter(t => t !== 'exercise'));
                          }}
                        />
                        <span className="text-sm">Fill in the blanks</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={cardTypes.includes('quiz')}
                          onChange={e => {
                            setCardTypes(prev => e.target.checked ? [...prev, 'quiz'] : prev.filter(t => t !== 'quiz'));
                          }}
                        />
                        <span className="text-sm">Multiple choice</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label>Difficulty Level</Label>
                    <div className="mt-2 flex gap-2">
                      <Badge
                        variant={difficulty === 'beginner' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setDifficulty('beginner')}
                      >
                        Beginner
                      </Badge>
                      <Badge
                        variant={difficulty === 'intermediate' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setDifficulty('intermediate')}
                      >
                        Intermediate
                      </Badge>
                      <Badge
                        variant={difficulty === 'advanced' ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setDifficulty('advanced')}
                      >
                        Advanced
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span>Pro Tips</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Clear, well-structured documents work best</li>
                  <li>• Include headings and subheadings for better organization</li>
                  <li>• High-quality images improve OCR accuracy</li>
                  <li>• Review generated cards before studying</li>
                  {isGuest && (
                    <li className="text-blue-600 font-medium">• Sign up to save your flashcards and track progress!</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Flashcard Edit Modal */}
      <FlashcardEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingCard(null);
          setEditingIndex(-1);
        }}
        flashcard={editingCard}
        onSave={editingIndex === -1 ? handleCreateCard : handleSaveCard}
        onDelete={editingIndex !== -1 ? () => handleDeleteCard(editingIndex) : undefined}
        mode={editingIndex === -1 ? 'create' : 'edit'}
      />
    </div>
  );
};

export default Upload;
