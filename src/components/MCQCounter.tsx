"use client";

type MCQCounterProps = {
  currentQuestionIndex: number;
  questionsLength: number;
};

const MCQCounter = ({
  currentQuestionIndex,
  questionsLength,
}: MCQCounterProps) => {
  const progress = ((currentQuestionIndex + 1) / questionsLength) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>
          Question {currentQuestionIndex + 1} / {questionsLength}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default MCQCounter;