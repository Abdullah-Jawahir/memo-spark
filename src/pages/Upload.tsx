import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload as UploadIcon, FileText, Image, File, Cloud, CheckCircle, AlertCircle, Info, UserPlus, Eye, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';
import { API_ENDPOINTS } from '@/config/api';

interface GeneratedCard {
  type: string;
  question: string;
  answer: string;
  difficulty: string;
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
  const [showPreview, setShowPreview] = useState(false);

  const supportedFormats = [
    { icon: FileText, name: "PDF", description: "Text documents, study materials" },
    { icon: Image, name: "Images", description: "JPG, PNG - with OCR support" },
    { icon: File, name: "Text Files", description: "TXT, DOCX files" },
    { icon: Cloud, name: "Cloud Import", description: "Google Drive, Dropbox" }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setProcessingStatus('processing');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('language', selectedLanguage);
    formData.append('is_guest', !user ? '1' : '0');

    try {
      const response = await axios.post(API_ENDPOINTS.DOCUMENTS.UPLOAD, formData, {
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
        }
      });

      setDocumentId(response.data.document_id);
      checkProcessingStatus(response.data.document_id);
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive"
      });
      setIsUploading(false);
      setProcessingStatus('failed');
    }
  };

  const checkProcessingStatus = async (id: string) => {
    try {
      const response = await axios.get(API_ENDPOINTS.DOCUMENTS.STATUS(id), {
        headers: {
          'Authorization': session ? `Bearer ${session.access_token}` : undefined
        }
      });
      const { status, metadata } = response.data;

      if (status === 'completed') {
        setProcessingStatus('completed');
        setIsUploading(false);
        setUploadComplete(true);
        setGeneratedCards(metadata.generated_cards || []);
      } else if (status === 'failed') {
        setProcessingStatus('failed');
        setIsUploading(false);
        toast({
          title: "Processing failed",
          description: metadata.error || "There was an error processing your file.",
          variant: "destructive"
        });
      } else {
        // Still processing, check again after a delay
        setTimeout(() => checkProcessingStatus(id), 2000);
      }
    } catch (error) {
      console.error('Status check failed:', error);
      setProcessingStatus('failed');
      setIsUploading(false);
    }
  };

  const isGuest = !user;

  // Calculate difficulty distribution
  const getDifficultyDistribution = () => {
    const distribution = generatedCards.reduce((acc, card) => {
      acc[card.difficulty] = (acc[card.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return distribution;
  };

  const difficultyDistribution = getDifficultyDistribution();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      <div className="absolute top-4 right-4 z-50"><ThemeSwitcher /></div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-4">Upload Your Study Materials</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transform your documents into interactive flashcards automatically. 
            Our AI will analyze your content and create personalized learning cards.
          </p>
        </div>

        {/* Guest User Banner */}
        {isGuest && (
          <Alert className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Try out MemoSpark instantly—no sign-up needed!</strong> Upload a document and generate flashcards to experience our AI-powered learning platform. 
              <Link to="/register" className="ml-2 underline font-medium hover:text-blue-600">
                Create a free account to save your progress →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Language Selection */}
        <Card className="mb-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {!isUploading && !uploadComplete && (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png"
                  />
                  <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {selectedFile ? selectedFile.name : 'Drop files here or click to browse'}
                  </h3>
                  <p className="text-muted-foreground mb-4">Support for PDF, images, and text files up to 10MB</p>
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

              {isUploading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Processing your document...</h3>
                  <p className="text-muted-foreground mb-4">Analyzing content and generating flashcards</p>
                  <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">{uploadProgress}% complete</p>
                </div>
              )}

              {uploadComplete && (
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
                  
                  <div className="flex justify-center gap-4 mb-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      {showPreview ? 'Hide Preview' : 'Preview Cards'}
                    </Button>
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2"
                      onClick={() => {
                        console.log('Upload page debug - generatedCards:', generatedCards);
                        // Store cards in localStorage instead of URL parameters
                        localStorage.setItem('guestCards', JSON.stringify(generatedCards));
                        console.log('Stored cards in localStorage');
                        // Navigate to study page
                        navigate('/study');
                      }}
                    >
                      <BookOpen className="h-4 w-4" />
                      {isGuest ? 'Try Studying' : 'Start Studying'}
                    </Button>
                    {isGuest && (
                      <Link to="/register">
                        <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Save Progress
                        </Button>
                      </Link>
                    )}
                  </div>

                  {/* Preview Cards Section */}
                  {showPreview && (
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold text-foreground mb-4">Generated Flashcards Preview</h4>
                      
                      {/* Summary Statistics */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{generatedCards.length}</div>
                          <div className="text-xs text-blue-600">Total Cards</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {Object.keys(difficultyDistribution).length}
                          </div>
                          <div className="text-xs text-green-600">Difficulty Levels</div>
                        </div>
                      </div>
                      
                      {/* Difficulty Breakdown */}
                      {Object.keys(difficultyDistribution).length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-foreground mb-2">Difficulty Distribution:</h5>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(difficultyDistribution).map(([difficulty, count]) => (
                              <Badge key={difficulty} variant="outline" className="text-xs">
                                {difficulty}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="max-h-96 overflow-y-auto space-y-4">
                        {generatedCards.map((card, index) => (
                          <Card key={index} className="text-left hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="text-xs">
                                  {card.type} • {card.difficulty}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Card {index + 1}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    title="Edit card"
                                  >
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
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
            </CardContent>
          </Card>

          {/* Supported Formats & Options */}
          <div className="space-y-8">
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
                    <Input id="deck-name" placeholder="e.g., Biology Chapter 5" className="mt-1" />
                  </div>
                  
                  <div>
                    <Label>Card Types</Label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">Question & Answer</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">Fill in the blanks</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Multiple choice</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label>Difficulty Level</Label>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline" className="cursor-pointer">Beginner</Badge>
                      <Badge variant="default" className="cursor-pointer">Intermediate</Badge>
                      <Badge variant="outline" className="cursor-pointer">Advanced</Badge>
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
    </div>
  );
};

export default Upload;
