import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  buffer: string;
  selectedIdx: number;
  hasError: boolean;
  remainingMs: number;
  stats: GameStats;
  status: "playing" | "finished";
};

const MAX_CANDIDATES = 6;

const yenPerChar = (course: Course): number => {
  switch (course) {
    case "casual":
      return 4;
    case "recommended":
      return 5;
    case "premium":
      return 6;
  }
};

// random sample of N items from arr, no repeats
const sample = <T,>(arr: readonly T[], n: number): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

export function useTypingGame(course: Course) {
  const config = COURSES[course];
  const durationMs = config.durationSec * 1000;

  // Initial buffer-empty candidates picked once and held in a ref so they
  // do not reshuffle on every render. After the first accept they will be
  // refreshed via setInitialPool.
  const [initialPool, setInitialPool] = useState<string[]>(() =>
    sample(WORDS[course], MAX_CANDIDATES)
  );

  const [state, setState] = useState<GameState>(() => ({
    course,
    buffer: "",
    selectedIdx: 0,
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

  // Candidates derived from current buffer. When buffer is empty we use the
  // held initialPool so the list does not jitter while the user is reading it.
  const candidates = useMemo(() => {
    if (state.buffer.length === 0) return initialPool;
    return WORDS[state.course]
      .filter((w) => w.startsWith(state.buffer))
      .slice(0, MAX_CANDIDATES);
  }, [state.buffer, state.course, initialPool]);

  const typeChar = useCallback((ch: string) => {
    setState((s) => {
      if (s.status !== "playing") return s;
      const next = s.buffer + ch;
      const hasMatch = WORDS[s.course].some((w) => w.startsWith(next));
      if (!hasMatch) {
        return {
          ...s,
          hasError: true,
          stats: { ...s.stats, missedChars: s.stats.missedChars + 1 },
        };
      }
      return {
        ...s,
        buffer: next,
        selectedIdx: 0,
        hasError: false,
        stats: {
          ...s.stats,
          correctChars: s.stats.correctChars + 1,
          earnedYen: s.stats.earnedYen + yenPerChar(s.course),
        },
      };
    });
  }, []);

  const backspace = useCallback(() => {
    setState((s) => {
      if (s.status !== "playing") return s;
      if (s.buffer.length === 0) return s;
      return {
        ...s,
        buffer: s.buffer.slice(0, -1),
        selectedIdx: 0,
        hasError: false,
      };
    });
  }, []);

  const moveSelection = useCallback(
    (dir: 1 | -1) => {
      setState((s) => {
        if (s.status !== "playing") return s;
        const max = candidates.length - 1;
        if (max < 0) return s;
        const next = Math.min(Math.max(0, s.selectedIdx + dir), max);
        return { ...s, selectedIdx: next };
      });
    },
    [candidates]
  );

  const accept = useCallback(() => {
    setState((s) => {
      if (s.status !== "playing") return s;
      if (candidates.length === 0) return s;
      if (s.buffer.length === 0) return s; // must commit at least one char
      // refresh the buffer-empty pool for the next round
      setInitialPool(sample(WORDS[s.course], MAX_CANDIDATES));
      return {
        ...s,
        buffer: "",
        selectedIdx: 0,
        hasError: false,
        stats: { ...s.stats, completedWords: s.stats.completedWords + 1 },
      };
    });
  }, [candidates]);

  const skip = useCallback(() => {
    setState((s) => {
      if (s.status !== "playing") return s;
      if (s.buffer.length > 0) {
        // pressing skip while typing just clears the buffer (no penalty)
        return {
          ...s,
          buffer: "",
          selectedIdx: 0,
          hasError: false,
        };
      }
      // empty-buffer skip: refresh suggestions with a small penalty
      setInitialPool(sample(WORDS[s.course], MAX_CANDIDATES));
      return {
        ...s,
        selectedIdx: 0,
        hasError: false,
        stats: { ...s.stats, missedChars: s.stats.missedChars + 2 },
      };
    });
  }, []);

  return {
    state,
    candidates,
    typeChar,
    backspace,
    moveSelection,
    accept,
    skip,
    config,
  };
}
