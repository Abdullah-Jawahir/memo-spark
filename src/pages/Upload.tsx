
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload as UploadIcon, FileText, Image, File, Cloud, CheckCircle, AlertCircle, Info, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const Upload = () => {
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);

  const supportedFormats = [
    { icon: FileText, name: "PDF", description: "Text documents, study materials" },
    { icon: Image, name: "Images", description: "JPG, PNG - with OCR support" },
    { icon: File, name: "Text Files", description: "TXT, DOCX files" },
    { icon: Cloud, name: "Cloud Import", description: "Google Drive, Dropbox" }
  ];

  const handleFileUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setUploadComplete(true);
          
          // Generate mock flashcards for demo
          const mockCards = [
            {
              id: 1,
              question: "What is the primary function of mitochondria in cells?",
              answer: "Mitochondria are responsible for producing ATP (energy) through cellular respiration, often called the 'powerhouse of the cell'.",
              type: "Q&A",
              difficulty: "Medium"
            },
            {
              id: 2,
              question: "The process of _____ converts glucose into ATP in the presence of oxygen.",
              answer: "cellular respiration",
              type: "Fill in the blank",
              difficulty: "Easy"
            },
            {
              id: 3,
              question: "Which organelle contains chlorophyll and is responsible for photosynthesis?",
              answer: "Chloroplasts",
              type: "Q&A",
              difficulty: "Easy"
            }
          ];
          setGeneratedCards(mockCards);
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const isGuest = !user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Upload Your Study Materials</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Transform your documents into interactive flashcards automatically. 
            Our AI will analyze your content and create personalized learning cards.
          </p>
        </div>

        {/* Guest User Banner */}
        {isGuest && (
          <Alert className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
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
              <Badge variant="default" className="cursor-pointer">English</Badge>
              <Badge variant="outline" className="cursor-pointer">සිංහල (Sinhala)</Badge>
              <Badge variant="outline" className="cursor-pointer">தமிழ் (Tamil)</Badge>
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop files here or click to browse</h3>
                  <p className="text-gray-600 mb-4">Support for PDF, images, and text files up to 10MB</p>
                  <Button onClick={handleFileUpload} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    Choose Files
                  </Button>
                </div>
              )}

              {isUploading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing your document...</h3>
                  <p className="text-gray-600 mb-4">Analyzing content and generating flashcards</p>
                  <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">{uploadProgress}% complete</p>
                </div>
              )}

              {uploadComplete && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Complete!</h3>
                  <p className="text-gray-600 mb-4">Generated {generatedCards.length} flashcards from your document</p>
                  
                  {isGuest && (
                    <Alert className="mb-4 border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-sm">
                        <strong>Guest Mode:</strong> These flashcards are for temporary use only—create a free account to save them and track your progress!
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-center gap-3">
                    <Link to={`/study?guest=true&cards=${encodeURIComponent(JSON.stringify(generatedCards))}`}>
                      <Button variant="outline">Preview Cards</Button>
                    </Link>
                    <Link to={`/study?guest=true&cards=${encodeURIComponent(JSON.stringify(generatedCards))}`}>
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                        {isGuest ? 'Try Studying' : 'Start Studying'}
                      </Button>
                    </Link>
                    {isGuest && (
                      <Link to="/register">
                        <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Save Progress
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supported Formats & Options */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Supported Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportedFormats.map((format, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <format.icon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">{format.name}</h4>
                        <p className="text-sm text-gray-600">{format.description}</p>
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
                <ul className="text-sm text-gray-600 space-y-2">
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
