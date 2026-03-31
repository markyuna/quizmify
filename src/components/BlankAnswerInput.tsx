"use client";

import * as React from "react";
import keywordExtractor from "keyword-extractor";

type BlankAnswerInputProps = {
  answer: string;
  onAnswerChange: (value: string) => void;
};

const BLANK = "_____";

export default function BlankAnswerInput({
  answer,
  onAnswerChange,
}: BlankAnswerInputProps) {
  const keywords = React.useMemo(() => {
    const extracted = keywordExtractor.extract(answer, {
      language: "english",
      remove_digits: true,
      return_changed_case: false,
      remove_duplicates: true,
    });

    const shuffled = [...extracted].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }, [answer]);

  const answerWithBlanks = React.useMemo(() => {
    return keywords.reduce((acc, keyword) => acc.replace(keyword, BLANK), answer);
  }, [answer, keywords]);

  const blankCount = React.useMemo(() => {
    return answerWithBlanks.split(BLANK).length - 1;
  }, [answerWithBlanks]);

  const [values, setValues] = React.useState<string[]>([]);

  React.useEffect(() => {
    setValues(Array(blankCount).fill(""));
  }, [blankCount, answerWithBlanks]);

  React.useEffect(() => {
    let filled = answerWithBlanks;

    values.forEach((value) => {
      filled = filled.replace(BLANK, value.trim());
    });

    onAnswerChange(filled);
  }, [values, answerWithBlanks, onAnswerChange]);

  const parts = React.useMemo(() => answerWithBlanks.split(BLANK), [answerWithBlanks]);

  return (
    <div className="mt-4 flex w-full justify-start">
      <div className="text-xl font-semibold leading-10">
        {parts.map((part, index) => (
          <React.Fragment key={`${part}-${index}`}>
            <span>{part}</span>
            {index < parts.length - 1 && (
              <input
                className="mx-1 w-28 border-b-2 border-black bg-transparent text-center focus:border-b-4 focus:outline-none dark:border-white"
                type="text"
                value={values[index] ?? ""}
                onChange={(event) => {
                  const nextValues = [...values];
                  nextValues[index] = event.target.value;
                  setValues(nextValues);
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}