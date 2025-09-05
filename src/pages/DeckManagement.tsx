import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, BookOpen, Edit, Trash2, Plus, Save, Loader2, Search, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { Link } from 'react-router-dom';
import FlashcardEditModal from '@/components/FlashcardEditModal';
import deckManagementService, { GeneratedCard, DeckInfo } from '@/services/deckManagementService';

const getCardTypeName = (type: string) => {
  const typeMap: { [key: string]: string } = {
    flashcard: 'flashcard',
    quiz: 'quiz',
    exercise: 'exercise'
  };
  return typeMap[type] || 'card';
};

const DeckManagement = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();

  const [deck, setDeck] = useState<DeckInfo | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [realMaterials, setRealMaterials] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<GeneratedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDeckName, setEditingDeckName] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<GeneratedCard | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<GeneratedCard | null>(null);

  useEffect(() => {
    if (deckId) {
      fetchDeckData();
    }
  }, [deckId]);

  const fetchDeckData = async () => {
    if (!deckId || !session?.access_token) return;

    setLoading(true);
    try {
      // Fetch deck details
      const deckResponse = await deckManagementService.getDeckDetails(deckId, session);
      if (deckResponse.success && deckResponse.data) {
        setDeck(deckResponse.data);
        setDeckName(deckResponse.data.name);
      }

      // Fetch flashcards and materials
      const flashcardsResponse = await deckManagementService.getDeckFlashcards(deckId, session);
      if (flashcardsResponse.success && flashcardsResponse.data) {
        setMaterials(flashcardsResponse.data.materials);
        setRealMaterials(flashcardsResponse.data.realMaterials || []);
        setFlashcards(flashcardsResponse.data.flashcards);
      }
    } catch (error) {
      console.error('Error fetching deck data:', error);
      toast({
        title: "Error",
        description: "Failed to load deck data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDeckName = async () => {
    if (!deckId || !session?.access_token || !deckName.trim()) return;

    try {
      const response = await deckManagementService.updateDeck(deckId, { name: deckName.trim() }, session);
      if (response.success) {
        setDeck(prev => prev ? { ...prev, name: deckName.trim() } : null);
        setEditingDeckName(false);
        toast({
          title: "Success",
          description: "Deck name updated successfully."
        });
      } else {
        throw new Error(response.error || 'Failed to update deck name');
      }
    } catch (error) {
      console.error('Error updating deck name:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update deck name.",
        variant: "destructive"
      });
    }
  };

  const handleEditCard = (card: GeneratedCard, index: number) => {
    setEditingCard(card);
    setEditingIndex(index);
    setIsCreateMode(false);
    setEditModalOpen(true);
  };

  const handleAddNewCard = (materialId: string) => {
    // Map synthetic material IDs to real material types
    const materialTypeMapping: { [key: string]: string } = {
      'flashcards': 'flashcard',
      'quizzes': 'quiz',
      'exercises': 'exercise'
    };

    const materialType = materialTypeMapping[materialId];
    if (!materialType) {
      toast({
        title: "Error",
        description: "Invalid material type.",
        variant: "destructive"
      });
      return;
    }

    const realMaterial = realMaterials.find(rm => rm.type === materialType);

    if (!realMaterial) {
      toast({
        title: "Error",
        description: "No material found to add the card to. Please create materials first.",
        variant: "destructive"
      });
      return;
    }

    setSelectedMaterialId(realMaterial.id.toString());
    setEditingCard({
      id: '',
      materialId: realMaterial.id.toString(),
      cardIndex: -1,
      type: materialType,
      question: '',
      answer: '',
      difficulty: 'intermediate'
    });
    setIsCreateMode(true);
    setEditingIndex(-1);
    setEditModalOpen(true);
  };

  const handleSaveCard = async (cardData: GeneratedCard, originalCard: GeneratedCard) => {
    if (!session?.access_token) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isCreateMode) {
        // Create new card
        const response = await deckManagementService.createFlashcard(
          selectedMaterialId,
          cardData,
          session
        );
        if (response.success) {
          // Success message is handled by the modal
          await fetchDeckData(); // Reload data
        } else {
          throw new Error(response.error || `Failed to create ${getCardTypeName(cardData.type)}`);
        }
      } else if (editingCard?.realMaterialId && editingCard?.cardIndex !== undefined) {
        // Update existing card using real StudyMaterial ID
        const response = await deckManagementService.updateFlashcard(
          editingCard.realMaterialId,
          editingCard.cardIndex,
          cardData,
          session
        );
        if (response.success) {
          // Success message is handled by the modal
          await fetchDeckData(); // Reload data
        } else {
          throw new Error(response.error || `Failed to update ${getCardTypeName(cardData.type)}`);
        }
      }
      setEditModalOpen(false);
      setEditingCard(null);
    } catch (error) {
      console.error(`Error saving ${getCardTypeName(cardData.type)}:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${isCreateMode ? 'create' : 'update'} ${getCardTypeName(cardData.type)}`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteCard = async (card: GeneratedCard) => {
    if (!session?.access_token || !card.realMaterialId || card.cardIndex === undefined) {
      toast({
        title: "Error",
        description: "Missing required data for deleting card",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await deckManagementService.deleteFlashcard(
        card.realMaterialId,
        card.cardIndex,
        session
      );
      if (response.success) {
        // Success message is handled by the modal
        await fetchDeckData(); // Reload data
      } else {
        throw new Error(response.error || `Failed to delete ${getCardTypeName(card.type)}`);
      }
    } catch (error) {
      console.error(`Error deleting ${getCardTypeName(card.type)}:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to delete ${getCardTypeName(card.type)}`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteConfirmation = (card: GeneratedCard) => {
    setCardToDelete(card);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (cardToDelete) {
      await handleDeleteCard(cardToDelete);
      setDeleteConfirmOpen(false);
      setCardToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setCardToDelete(null);
  };

  const handleAddCard = () => {
    // For adding a card when there are materials, use the first material
    const firstMaterialId = materials.length > 0 ? materials[0].id : '';
    handleAddNewCard(firstMaterialId);
  };

  // Filter flashcards based on search query for count display
  const filteredFlashcardsCount = materials.reduce((acc, material) => {
    const materialCards = flashcards.filter(card => card.materialId === material.id);
    const filteredCards = materialCards.filter(card => {
      const question = card.question || '';
      const answer = card.answer || '';
      return question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        answer.toLowerCase().includes(searchQuery.toLowerCase());
    });
    return acc + filteredCards.length;
  }, 0);

  const mapAndCapitalizeDifficulty = (difficulty: string) => {
    if (!difficulty) return 'Medium';
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'Easy';
      case 'intermediate': return 'Medium';
      case 'advanced': return 'Hard';
      default: return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="student">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading deck...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!deck) {
    return (
      <ProtectedRoute requiredRole="student">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Deck not found</p>
              <Link to="/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="student">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
        {/* Fixed Header */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <Link to="/" className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    MemoSpark
                  </span>
                </Link>
              </div>
              <ThemeSwitcher />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Deck Header */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex-1">
                  {editingDeckName ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={deckName}
                        onChange={(e) => setDeckName(e.target.value)}
                        className="text-2xl font-bold"
                        onBlur={handleUpdateDeckName}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateDeckName();
                          } else if (e.key === 'Escape') {
                            setDeckName(deck.name);
                            setEditingDeckName(false);
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={handleUpdateDeckName}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h1 className="text-2xl font-bold text-foreground">{deck.name}</h1>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDeckName(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-muted-foreground mt-2">
                    {deck.card_count} activities • Manage your study materials
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleAddCard} className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Card
                  </Button>
                  <Link to={`/study?deckId=${deck.id}`}>
                    <Button variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Study Deck
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Search and Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search flashcards by question or answer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing {filteredFlashcardsCount} of {flashcards.length} cards
                </p>
              )}
            </CardContent>
          </Card>

          {/* Materials and Flashcards */}
          {materials.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No materials yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload documents to create flashcards for this deck.
                </p>
                <Link to="/upload">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {materials.map((material) => {
                const materialCards = flashcards.filter(card => card.materialId === material.id);
                const filteredMaterialCards = materialCards.filter(card => {
                  const question = card.question || '';
                  const answer = card.answer || '';
                  return question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    answer.toLowerCase().includes(searchQuery.toLowerCase());
                });

                return (
                  <Card key={material.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {material.type.charAt(0).toUpperCase() + material.type.slice(1)} Material
                          </CardTitle>
                          <p className="text-muted-foreground text-sm">
                            {materialCards.length} cards • Language: {material.language}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleAddNewCard(material.id)}
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Card
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {filteredMaterialCards.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">
                            {searchQuery ? 'No cards match your search in this material.' : 'No flashcards in this material yet.'}
                          </p>
                          {!searchQuery && (
                            <Button
                              onClick={() => handleAddNewCard(material.id)}
                              size="sm"
                              variant="outline"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Card
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredMaterialCards.map((card, index) => (
                            <Card key={card.id || index} className="hover:shadow-lg transition-shadow">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {mapAndCapitalizeDifficulty(card.difficulty)}
                                    </Badge>
                                    {card.type === 'exercise' && card.exercise_type && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                        {card.exercise_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                      title="Edit card"
                                      onClick={() => handleEditCard(card, index)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                                      title="Delete card"
                                      onClick={() => handleDeleteConfirmation(card)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <Label className="text-sm font-medium text-blue-600">Question:</Label>
                                  <p className="text-sm text-foreground mt-1 leading-relaxed line-clamp-3">
                                    {card.question}
                                  </p>
                                </div>

                                {/* Special handling for matching exercises */}
                                {card.type === 'exercise' && card.exercise_type === 'matching' && card.concepts && card.definitions ? (
                                  <div>
                                    <Label className="text-sm font-medium text-green-600">Concept-Definition Pairs:</Label>
                                    <div className="text-sm text-foreground mt-1 space-y-1">
                                      {card.concepts.map((concept, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                          <span className="font-medium text-purple-600">{concept}</span>
                                          <span className="text-muted-foreground">→</span>
                                          <span className="text-orange-600">{card.definitions?.[idx] || 'N/A'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <Label className="text-sm font-medium text-green-600">Answer:</Label>
                                    <p className="text-sm text-foreground mt-1 leading-relaxed line-clamp-3">
                                      {card.answer}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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
          onSave={handleSaveCard}
          mode={isCreateMode ? 'create' : 'edit'}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete {cardToDelete ? getCardTypeName(cardToDelete.type) : 'Card'}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this {cardToDelete ? getCardTypeName(cardToDelete.type) : 'card'}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete {cardToDelete ? getCardTypeName(cardToDelete.type) : 'Card'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default DeckManagement;
