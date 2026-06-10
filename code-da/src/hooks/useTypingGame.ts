import { useCallback, useEffect, useRef, useState } from "react";
import { COURSES, WORDS, type Course } from "../data/words";

export type GameStats = {
  correctChars: number;
  missedChars: number;
  completedWords: number;
  earnedYen: number;
  elapsedMs: number;
};

export type GameState = {
  course: Course;
  currentWord: string;
  typedIndex: number;
  hasError: boolean;
  remainingMs: number;
  stats: GameStats;
  status: "playing" | "finished";
};

const pickWord = (course: Course, prev?: string): string => {
  const pool = WORDS[course];
  let next = pool[Math.floor(Math.random() * pool.length)];
  // avoid immediate repeat when the pool is large enough
  if (pool.length > 1 && next === prev) {
    next = pool[(pool.indexOf(next) + 1) % pool.length];
  }
  return next;
};

const yenPerChar = (course: Course): number => {
  // tuned so that a fluent typist can break even on each course
  switch (course) {
    case "casual":
      return 3;
    case "recommended":
      return 4;
    case "premium":
      return 5;
  }
};

export function useTypingGame(course: Course) {
  const config = COURSES[course];
  const durationMs = config.durationSec * 1000;

  const [state, setState] = useState<GameState>(() => ({
    course,
    currentWord: pickWord(course),
    typedIndex: 0,
    hasError: false,
    remainingMs: durationMs,
    stats: {
      correctChars: 0,
      missedChars: 0,
      completedWords: 0,
      earnedYen: 0,
      elapsedMs: 0,
    },
    status: "playing",
  }));

  const startedAtRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = performance.now();
      const elapsed = now - startedAtRef.current;
      const remaining = Math.max(0, durationMs - elapsed);
      setState((s) => {
        if (s.status !== "playing") return s;
        if (remaining <= 0) {
          return {
            ...s,
            remainingMs: 0,
            stats: { ...s.stats, elapsedMs: durationMs },
            status: "finished",
          };
        }
        return {
          ...s,
          remainingMs: remaining,
          stats: { ...s.stats, elapsedMs: elapsed },
        };
      });
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [durationMs]);

  const handleKey = useCallback(
    (key: string) => {
      setState((s) => {
        if (s.status !== "playing") return s;
        const expected = s.currentWord[s.typedIndex];
        if (key === expected) {
          const nextIndex = s.typedIndex + 1;
          if (nextIndex >= s.currentWord.length) {
            const earned = s.currentWord.length * yenPerChar(s.course);
            return {
              ...s,
              currentWord: pickWord(s.course, s.currentWord),
              typedIndex: 0,
              hasError: false,
              stats: {
                ...s.stats,
                correctChars: s.stats.correctChars + 1,
                completedWords: s.stats.completedWords + 1,
                earnedYen: s.stats.earnedYen + earned,
              },
            };
          }
          return {
            ...s,
            typedIndex: nextIndex,
            hasError: false,
            stats: { ...s.stats, correctChars: s.stats.correctChars + 1 },
          };
        }
        return {
          ...s,
          hasError: true,
          stats: { ...s.stats, missedChars: s.stats.missedChars + 1 },
        };
      });
    },
    []
  );

  const skip = useCallback(() => {
    setState((s) => {
      if (s.status !== "playing") return s;
      return {
        ...s,
        currentWord: pickWord(s.course, s.currentWord),
        typedIndex: 0,
        hasError: false,
        stats: { ...s.stats, missedChars: s.stats.missedChars + 5 },
      };
    });
  }, []);

  return { state, handleKey, skip, config };
}
