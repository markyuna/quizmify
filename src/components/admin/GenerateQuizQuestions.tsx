"use client";

import { useState } from "react";

export default function GenerateQuizQuestions() {
  const [topic, setTopic] = useState("JavaScript");
  const [difficulty, setDifficulty] = useState("easy");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function handleGenerate() {
    try {
      setLoading(true);
      setResult("");

      const secret = prompt("Enter admin secret");
      if (!secret) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({
          topic,
          difficulty,
          count: Number(count),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error generating questions");
      }

      setResult(`✅ ${data.inserted} preguntas generadas y guardadas`);
    } catch (error) {
      setResult(
        `❌ ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
      <h2 className="mb-4 text-xl font-semibold">Generar preguntas</h2>

      <div className="grid gap-4">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3"
          placeholder="Tema"
        />

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
        >
          <option value="easy">easy</option>
          <option value="medium">medium</option>
          <option value="hard">hard</option>
        </select>

        <input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3"
        />

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 font-semibold disabled:opacity-50"
        >
          {loading ? "Generando..." : "Generar y guardar"}
        </button>

        {result ? <p className="text-sm text-slate-300">{result}</p> : null}
      </div>
    </div>
  );
}