import { API_BASE_URL, fetchWithAuth } from '@/config/api';

export interface GeneratedCard {
  id?: string;
  materialId?: string;
  realMaterialId?: string; // The actual StudyMaterial ID for API calls
  cardIndex?: number;
  type: string;
  question?: string; // For flashcards and quizzes
  instruction?: string; // For exercise types (generic instruction like "Fill in the blank.")
  exercise_text?: string; // For exercise types (actual question text)
  answer: string;
  difficulty: string;
  options?: string[]; // For quiz types
  concepts?: string[]; // For matching exercises
  definitions?: string[]; // For matching exercises
  exercise_type?: string; // Specific exercise type (fill_blank, true_false, etc.)
}

export interface FlashcardUpdate {
  id: string;
  question?: string;
  answer?: string;
  difficulty?: string;
  type?: string;
}

export interface DeckInfo {
  id: string;
  name: string;
  card_count: number;
  flashcard_count?: number;
  quiz_count?: number;
  exercise_count?: number;
  last_studied?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class DeckManagementService {
  /**
   * Update a single flashcard
   */
  async updateFlashcard(
    materialId: string,
    cardIndex: number,
    data: Partial<GeneratedCard>,
    session?: { access_token: string } | null
  ): Promise<ApiResponse<GeneratedCard>> {
    try {
      // Map data based on card type
      const mappedData: any = { ...data };

      // For exercises, map 'question' to 'exercise_text' if needed
      if (data.type === 'exercise' && data.question && !data.exercise_text) {
        mappedData.exercise_text = data.question;
        delete mappedData.question;
      }

      const url = `${API_BASE_URL}/api/study-materials/${materialId}/flashcards/${cardIndex}`;
      console.log('PUT Request URL:', url);
      console.log('PUT Request Data:', mappedData);
      console.log('PUT Request Session:', session ? 'Present' : 'Missing');

      const response = await fetchWithAuth(
        url,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mappedData),
        },
        session
      );

      return {
        success: true,
        data: response.data,
        message: response.message || 'Flashcard updated successfully'
      };
    } catch (error) {
      console.error('Error updating flashcard:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update flashcard'
      };
    }
  }

  /**
   * Delete a flashcard
   */
  async deleteFlashcard(
    materialId: string,
    cardIndex: number,
    session?: { access_token: string } | null
  ): Promise<ApiResponse> {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/study-materials/${materialId}/flashcards/${cardIndex}`,
        {
          method: 'DELETE',
        },
        session
      );

      return {
        success: true,
        message: response.message || 'Flashcard deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete flashcard'
      };
    }
  }

  /**
   * Create a new flashcard in a study material
   */
  async createFlashcard(
    materialId: string,
    data: GeneratedCard,
    session?: { access_token: string } | null
  ): Promise<ApiResponse<GeneratedCard>> {
    try {
      // Map data based on card type
      const mappedData: any = { ...data };

      // For exercises, map 'question' to 'exercise_text' if needed
      if (data.type === 'exercise' && data.question && !data.exercise_text) {
        mappedData.exercise_text = data.question;
        delete mappedData.question;
      }

      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/study-materials/${materialId}/flashcards`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mappedData),
        },
        session
      );

      return {
        success: true,
        data: response.data,
        message: response.message || 'Flashcard created successfully'
      };
    } catch (error) {
      console.error('Error creating flashcard:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create flashcard'
      };
    }
  }

  /**
   * Get all flashcards from a specific study material
   */
  async getStudyMaterialFlashcards(
    materialId: string,
    session?: { access_token: string } | null
  ): Promise<ApiResponse<GeneratedCard[]>> {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/study-materials/${materialId}/flashcards`,
        {
          method: 'GET',
        },
        session
      );

      return {
        success: true,
        data: response.data || [],
        message: 'Flashcards retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching study material flashcards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch flashcards'
      };
    }
  }

  /**
   * Get deck details including card count
   */
  async getDeckDetails(
    deckId: string,
    session?: { access_token: string } | null
  ): Promise<ApiResponse<DeckInfo>> {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/decks/${deckId}`,
        {
          method: 'GET',
        },
        session
      );

      return {
        success: true,
        data: response.data,
        message: 'Deck details retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching deck details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch deck details'
      };
    }
  }

  /**
   * Update deck details (e.g., name)
   */
  async updateDeck(
    deckId: string,
    data: { name: string },
    session?: { access_token: string } | null
  ): Promise<ApiResponse<DeckInfo>> {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/decks/${deckId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        },
        session
      );

      return {
        success: true,
        data: response.data,
        message: response.message || 'Deck updated successfully'
      };
    } catch (error) {
      console.error('Error updating deck:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update deck'
      };
    }
  }

  /**
   * Get all flashcards in a deck using existing materials endpoint
   */
  async getDeckFlashcards(
    deckId: string,
    session?: { access_token: string } | null
  ): Promise<ApiResponse<{ materials: any[]; flashcards: GeneratedCard[]; realMaterials?: any[] }>> {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/decks/${deckId}/materials`,
        {
          method: 'GET',
        },
        session
      );

      // Extract all flashcards and quizzes from the new API structure
      const allFlashcards: GeneratedCard[] = [];
      const materials: any[] = [];

      // Process flashcards
      if (response.flashcards && Array.isArray(response.flashcards)) {
        response.flashcards.forEach((card: any, index: number) => {
          allFlashcards.push({
            ...card,
            id: card.id || `flashcard-${index}`,
            materialId: 'flashcards', // Keep synthetic ID for display grouping
            realMaterialId: card.id?.toString(), // Store real ID for API calls
            cardIndex: 0, // Each StudyMaterial contains only one card at index 0
            type: 'flashcard'
          });
        });

        // Create a synthetic material entry for flashcards
        if (response.flashcards.length > 0) {
          materials.push({
            id: 'flashcards',
            type: 'flashcard',
            title: 'Flashcards',
            content: response.flashcards
          });
        }
      }

      // Process quizzes
      if (response.quizzes && Array.isArray(response.quizzes)) {
        response.quizzes.forEach((quiz: any, index: number) => {
          const processedCard = {
            ...quiz,
            id: quiz.id || `quiz-${index}`,
            materialId: 'quizzes', // Keep synthetic ID for display grouping
            realMaterialId: quiz.id?.toString(), // Store real ID for API calls
            cardIndex: 0, // Each StudyMaterial contains only one card at index 0
            type: 'quiz'
          };

          allFlashcards.push(processedCard);
        });

        // Create a synthetic material entry for quizzes
        if (response.quizzes.length > 0) {
          materials.push({
            id: 'quizzes',
            type: 'quiz',
            title: 'Quizzes',
            content: response.quizzes
          });
        }
      }

      // Process exercises if they exist
      if (response.exercises && Array.isArray(response.exercises)) {
        response.exercises.forEach((exercise: any, index: number) => {
          // Map 'exercise_text' to 'question' for UI consistency (actual question text)
          const mappedExercise = {
            ...exercise,
            question: exercise.exercise_text || exercise.question, // Use exercise_text as question (actual question)
            instruction: exercise.instruction // Keep original instruction (generic type instruction)
          };

          const processedCard = {
            ...mappedExercise,
            id: exercise.id || `exercise-${index}`,
            materialId: 'exercises', // Keep synthetic ID for display grouping
            realMaterialId: exercise.id?.toString(), // Store real ID for API calls
            cardIndex: 0, // Each StudyMaterial contains only one card at index 0
            type: 'exercise'
          };

          allFlashcards.push(processedCard);
        });        // Create a synthetic material entry for exercises
        if (response.exercises.length > 0) {
          materials.push({
            id: 'exercises',
            type: 'exercise',
            title: 'Exercises',
            content: response.exercises
          });
        }
      }

      return {
        success: true,
        data: {
          materials: materials,
          flashcards: allFlashcards,
          realMaterials: response.materials || [] // Include real materials for operations
        },
        message: 'Flashcards retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching deck flashcards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch flashcards'
      };
    }
  }

  /**
   * Get deck information using existing materials endpoint
   */
  async getDeckInfo(
    deckId: string,
    session?: { access_token: string } | null
  ): Promise<ApiResponse<DeckInfo>> {
    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/decks/${deckId}/materials`,
        {
          method: 'GET',
        },
        session
      );

      const deckInfo: DeckInfo = {
        id: response.deck.id,
        name: response.deck.name,
        card_count: (response.flashcards || []).length
      };

      return {
        success: true,
        data: deckInfo,
        message: 'Deck information retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching deck info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch deck information'
      };
    }
  }

  /**
   * Bulk update multiple flashcards (NOT IMPLEMENTED IN BACKEND YET)
   */
  async bulkUpdateFlashcards(
    updates: FlashcardUpdate[],
    session?: { access_token: string } | null
  ): Promise<ApiResponse> {
    // TODO: Implement when backend endpoints are available
    throw new Error('Bulk flashcard update not implemented in backend yet');
  }

  /**
   * Update deck name (NOT IMPLEMENTED IN BACKEND YET)
   */
  async updateDeckName(
    deckId: string,
    name: string,
    session?: { access_token: string } | null
  ): Promise<ApiResponse> {
    // TODO: Implement when backend endpoints are available
    throw new Error('Deck name update not implemented in backend yet');
  }

  /**
   * Save generated content from upload/search to a proper deck (NOT IMPLEMENTED IN BACKEND YET)
   */
  async saveGeneratedContentToDeck(
    deckName: string,
    content: {
      flashcards?: GeneratedCard[];
      quizzes?: any[];
      exercises?: any[];
    },
    session?: { access_token: string } | null
  ): Promise<ApiResponse<{ deckId: string }>> {
    // TODO: Implement when backend endpoints are available
    throw new Error('Save generated content to deck not implemented in backend yet');
  }  /**
   * Update flashcard in temporary/localStorage content
   * Used for upload preview editing before deck is saved
   */
  updateLocalFlashcard(
    flashcards: GeneratedCard[],
    index: number,
    updatedCard: GeneratedCard
  ): GeneratedCard[] {
    const updated = [...flashcards];
    updated[index] = { ...updatedCard };
    return updated;
  }

  /**
   * Delete flashcard from temporary/localStorage content
   */
  deleteLocalFlashcard(
    flashcards: GeneratedCard[],
    index: number
  ): GeneratedCard[] {
    return flashcards.filter((_, i) => i !== index);
  }

  /**
   * Add flashcard to temporary/localStorage content
   */
  addLocalFlashcard(
    flashcards: GeneratedCard[],
    newCard: GeneratedCard
  ): GeneratedCard[] {
    return [...flashcards, newCard];
  }
}

// Export a singleton instance
const deckManagementService = new DeckManagementService();
export default deckManagementService;

// Also export the class for potential direct instantiation
export { DeckManagementService };
