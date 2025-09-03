import jsPDF from 'jspdf';

interface Flashcard {
  id?: number;
  type: string;
  question: string;
  answer: string;
  difficulty: string;
}

interface Quiz {
  type: string;
  answer: string;
  options: string[];
  question: string;
  difficulty: string;
  correct_answer_option: string;
}

interface Exercise {
  type: 'fill_blank' | 'true_false' | 'short_answer' | 'matching';
  instruction: string;
  exercise_text?: string;
  answer: string | Record<string, string>;
  difficulty: string;
  concepts?: string[];
  definitions?: string[];
}

interface SessionStats {
  correct: number;
  difficult: number;
  timeSpent: number;
}

interface ExportData {
  sessionStats: SessionStats;
  sessionRatings: (null | 'again' | 'hard' | 'good' | 'easy')[];
  flashcards: Flashcard[];
  quizzes?: Quiz[];
  exercises?: Exercise[];
  bookmarkedCards: number[];
  time: string;
}

export const generateStudyProgressPDF = (data: ExportData) => {
  const doc = new jsPDF();

  // Set initial position
  let yPos = 25;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to format time properly
  const formatTimeSpent = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 1 && remainingSeconds === 0) {
      return '1 minute';
    } else if (remainingSeconds === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 1) {
      return `1 minute ${remainingSeconds} seconds`;
    } else {
      return `${minutes} minutes ${remainingSeconds} seconds`;
    }
  };

  // Helper function to add text with proper word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, lineHeight: number = 1.2) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return lines.length * (fontSize * lineHeight * 0.35); // Return height used
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPos = 25;
      return true;
    }
    return false;
  };

  // Header with MemoSpark branding
  doc.setFillColor(59, 130, 246); // Blue color
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('MemoSpark', margin, 30);

  // Subtitle
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Study Progress Report', margin, 40);

  // Decorative line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.line(margin, 45, pageWidth - margin, 45);

  // Reset text color for content
  doc.setTextColor(0, 0, 0);
  yPos = 70;

  // Session Summary
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Session Summary', margin, yPos);
  yPos += 15;

  // Session stats in a styled box with better spacing
  const boxHeight = 65;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, 'FD');

  const sessionDate = new Date(data.time).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Date with better positioning
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text(`Date: ${sessionDate}`, margin + 10, yPos + 15);

  // Stats in two columns with proper alignment
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  // Left column
  doc.text(`Correct Answers: ${data.sessionStats.correct}`, margin + 10, yPos + 30);
  doc.text(`Time Spent: ${formatTimeSpent(data.sessionStats.timeSpent)}`, margin + 10, yPos + 42);

  // Right column
  doc.text(`Difficult Cards: ${data.sessionStats.difficult}`, margin + contentWidth / 2 + 10, yPos + 30);
  doc.text(`Total Cards: ${data.flashcards.length}`, margin + contentWidth / 2 + 10, yPos + 42);

  yPos += boxHeight + 20;

  // Progress Overview
  if (data.sessionRatings.length > 0) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Progress Overview', margin, yPos);
    yPos += 15;

    // Progress stats in a styled box with better layout
    const progressBoxHeight = 55;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, yPos, contentWidth, progressBoxHeight, 3, 3, 'FD');

    const totalCards = data.sessionRatings.length;
    const againCount = data.sessionRatings.filter(r => r === 'again').length;
    const hardCount = data.sessionRatings.filter(r => r === 'hard').length;
    const goodCount = data.sessionRatings.filter(r => r === 'good').length;
    const easyCount = data.sessionRatings.filter(r => r === 'easy').length;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`Total Cards Reviewed: ${totalCards}`, margin + 10, yPos + 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    // Progress breakdown with better spacing and colors
    const columnWidth = contentWidth / 4;

    doc.setTextColor(239, 68, 68); // Red for again
    doc.text(`Again: ${againCount}`, margin + 10, yPos + 32);

    doc.setTextColor(245, 101, 101); // Orange for hard  
    doc.text(`Hard: ${hardCount}`, margin + 10 + columnWidth, yPos + 32);

    doc.setTextColor(34, 197, 94); // Green for good
    doc.text(`Good: ${goodCount}`, margin + 10 + columnWidth * 2, yPos + 32);

    doc.setTextColor(16, 185, 129); // Teal for easy
    doc.text(`Easy: ${easyCount}`, margin + 10 + columnWidth * 3, yPos + 32);

    yPos += progressBoxHeight + 20;
  }

  // Flashcards Section
  if (data.flashcards.length > 0) {
    checkNewPage(40);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Flashcards', margin, yPos);
    yPos += 20;

    data.flashcards.forEach((card, index) => {
      // Estimate card height dynamically
      const questionHeight = Math.ceil((card.question.length / 80)) * 12;
      const answerHeight = Math.ceil((card.answer.length / 80)) * 12;
      const estimatedHeight = Math.max(75, 40 + questionHeight + answerHeight);

      checkNewPage(estimatedHeight);

      // Card container with better styling
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, contentWidth, estimatedHeight - 5, 3, 3, 'FD');

      // Card header with number and difficulty
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(`Card ${index + 1}`, margin + 10, yPos + 15);

      // Difficulty badge with better positioning
      const difficultyColors: Record<string, [number, number, number]> = {
        'easy': [34, 197, 94],
        'medium': [251, 191, 36],
        'hard': [239, 68, 68]
      };

      const difficultyColor = difficultyColors[card.difficulty.toLowerCase()] || [100, 100, 100];
      doc.setFillColor(...difficultyColor);
      doc.roundedRect(contentWidth - 30, yPos + 5, 25, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const diffText = card.difficulty.toUpperCase();
      const diffTextWidth = doc.getStringUnitWidth(diffText) * 8 / doc.internal.scaleFactor;
      doc.text(diffText, contentWidth - 17.5 - (diffTextWidth / 2), yPos + 13);

      let currentY = yPos + 30;

      // Question with better formatting
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Q:', margin + 10, currentY);

      doc.setFont('helvetica', 'normal');
      const questionLines = doc.splitTextToSize(card.question, contentWidth - 50);
      doc.text(questionLines, margin + 25, currentY);
      currentY += questionLines.length * 6 + 8;

      // Answer with better formatting
      doc.setFont('helvetica', 'bold');
      doc.text('A:', margin + 10, currentY);

      doc.setFont('helvetica', 'normal');
      const answerLines = doc.splitTextToSize(card.answer, contentWidth - 50);
      doc.text(answerLines, margin + 25, currentY);
      currentY += answerLines.length * 6 + 5;

      // Bookmark indicator with better styling
      if (data.bookmarkedCards.includes(card.id || index)) {
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('★ Bookmarked', margin + 10, currentY + 5);
      }

      yPos += estimatedHeight + 10;
    });
  }

  // Quizzes Section with improved formatting
  if (data.quizzes && data.quizzes.length > 0) {
    checkNewPage(40);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Quizzes', margin, yPos);
    yPos += 20;

    data.quizzes.forEach((quiz, index) => {
      // Estimate quiz height dynamically
      const questionHeight = Math.ceil((quiz.question.length / 70)) * 12;
      const optionsHeight = quiz.options.length * 15;
      const estimatedHeight = Math.max(100, 50 + questionHeight + optionsHeight);

      checkNewPage(estimatedHeight);

      // Quiz container
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, yPos, contentWidth, estimatedHeight - 5, 3, 3, 'FD');

      // Quiz number
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(`Quiz ${index + 1}`, margin + 10, yPos + 15);

      let currentY = yPos + 30;

      // Question
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Q:', margin + 10, currentY);

      doc.setFont('helvetica', 'normal');
      const questionLines = doc.splitTextToSize(quiz.question, contentWidth - 50);
      doc.text(questionLines, margin + 25, currentY);
      currentY += questionLines.length * 6 + 10;

      // Options with better formatting
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      quiz.options.forEach((option, optIndex) => {
        const optionLetter = String.fromCharCode(65 + optIndex);
        doc.setFont('helvetica', 'bold');
        doc.text(`${optionLetter}.`, margin + 25, currentY);

        doc.setFont('helvetica', 'normal');
        const optionLines = doc.splitTextToSize(option, contentWidth - 70);
        doc.text(optionLines, margin + 35, currentY);
        currentY += Math.max(12, optionLines.length * 6 + 2);
      });

      // Correct answer with better styling
      currentY += 5;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text(`Correct Answer: ${quiz.correct_answer_option}`, margin + 10, currentY);

      yPos += estimatedHeight + 10;
    });
  }

  // Exercises Section with improved formatting
  if (data.exercises && data.exercises.length > 0) {
    checkNewPage(40);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Exercises', margin, yPos);
    yPos += 20;

    data.exercises.forEach((exercise, index) => {
      // Estimate exercise height including answer
      const instructionHeight = Math.ceil((exercise.instruction.length / 80)) * 12;
      const answerTextForHeight = typeof exercise.answer === 'string' ? exercise.answer :
        Object.entries(exercise.answer).map(([key, value]) => `${key}: ${value}`).join(', ');
      const answerHeight = Math.ceil((answerTextForHeight.length / 80)) * 12;
      const estimatedHeight = Math.max(100, 60 + instructionHeight + answerHeight);

      checkNewPage(estimatedHeight);

      // Exercise container
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(margin, yPos, contentWidth, estimatedHeight - 5, 3, 3, 'FD');

      // Exercise number
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 163, 74);
      doc.text(`Exercise ${index + 1}`, margin + 10, yPos + 15);

      // Type with better formatting
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const typeText = exercise.type.replace(/_/g, ' ').toUpperCase();
      doc.text(`Type: ${typeText}`, margin + 10, yPos + 28);

      let currentY = yPos + 45;

      // Instruction with better formatting
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Instruction:', margin + 10, currentY);

      doc.setFont('helvetica', 'normal');
      const instructionLines = doc.splitTextToSize(exercise.instruction, contentWidth - 50);
      doc.text(instructionLines, margin + 25, currentY + 12);
      currentY += instructionLines.length * 6 + 15;

      // Answer with better formatting
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94); // Green color for answers
      doc.text('Answer:', margin + 10, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      // Handle different answer types
      let answerText = '';
      if (typeof exercise.answer === 'string') {
        answerText = exercise.answer;
      } else if (typeof exercise.answer === 'object') {
        // For matching exercises or complex answers
        answerText = Object.entries(exercise.answer)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      }

      const answerLines = doc.splitTextToSize(answerText, contentWidth - 50);
      doc.text(answerLines, margin + 25, currentY + 12);

      yPos += estimatedHeight + 10;
    });
  }

  // Footer with page numbers
  const totalPages = (doc as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 40, pageHeight - 10);
    doc.text('Generated by MemoSpark', margin, pageHeight - 10);
  }

  return doc;
};

export const downloadStudyProgressPDF = (data: ExportData, filename: string = 'memo-spark-study-report.pdf') => {
  try {
    const doc = generateStudyProgressPDF(data);
    doc.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};