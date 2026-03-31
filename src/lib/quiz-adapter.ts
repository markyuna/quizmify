export type SupabaseQuizQuestion = {
    id: string;
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string | null;
  };
  
  export function mapSupabaseQuestionToGameQuestion(
    question: SupabaseQuizQuestion
  ) {
    return {
      id: question.id,
      question: question.question,
      options: JSON.stringify(question.options),
      answer: question.correct_answer,
    };
  }