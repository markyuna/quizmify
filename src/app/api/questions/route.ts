import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { strict_output, type OutputFormat } from "@/lib/gpt";
import { getQuestionsSchema } from "@/schemas/form/quiz";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

type OpenEndedQuestion = {
  question: string;
  answer: string;
};

type MCQQuestion = OpenEndedQuestion & {
  option1: string;
  option2: string;
  option3: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, topic, type } = getQuestionsSchema.parse(body);

    let questions: OpenEndedQuestion[] | MCQQuestion[] = [];

    const prompt =
      type === "open_ended"
        ? `Generate a hard open-ended question about ${topic}.`
        : `Generate a hard multiple-choice question about ${topic}.`;

    const outputFormat: OutputFormat =
      type === "mcq"
        ? {
            question: "question",
            answer: "correct answer with max length of 15 words",
            option1: "incorrect option with max length of 15 words",
            option2: "incorrect option with max length of 15 words",
            option3: "incorrect option with max length of 15 words",
          }
        : {
            question: "question",
            answer: "answer with max length of 15 words",
          };

    try {
      console.log("OPENAI KEY loaded:", !!process.env.OPENAI_API_KEY);

      const aiQuestions = await strict_output(
        "You are a helpful AI that generates quiz questions and answers. Return valid JSON only.",
        new Array(amount).fill(prompt),
        outputFormat
      );

      if (
        !aiQuestions ||
        !Array.isArray(aiQuestions) ||
        aiQuestions.length === 0
      ) {
        throw new Error("OpenAI returned no valid questions.");
      }

      questions = aiQuestions as OpenEndedQuestion[] | MCQQuestion[];
    } catch (error) {
      console.error("⚠️ OpenAI failed, using fallback questions instead.", error);

      if (type === "mcq") {
        questions = Array.from({ length: amount }, (_, index) => ({
          question: `Sample multiple-choice question ${index + 1} about ${topic}?`,
          answer: "Correct answer",
          option1: "Wrong answer 1",
          option2: "Wrong answer 2",
          option3: "Wrong answer 3",
        }));
      } else {
        questions = Array.from({ length: amount }, (_, index) => ({
          question: `Sample open-ended question ${index + 1} about ${topic}.`,
          answer: "This is a sample correct answer.",
        }));
      }
    }

    return NextResponse.json({ questions }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error("questions route error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}