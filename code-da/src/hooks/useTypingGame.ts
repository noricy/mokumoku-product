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
  target: string;
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

const sample = <T,>(arr: readonly T[], n: number): T[] => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

const pickTarget = (course: Course, prev?: string): string => {
  const pool = WORDS[course];
  let next = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && next === prev) {
    next = pool[(pool.indexOf(next) + 1) % pool.length];
  }
  return next;
};

const candidatesOf = (course: Course, buffer: string): string[] =>
  WORDS[course].filter((w) => w.startsWith(buffer)).slice(0, MAX_CANDIDATES);

// When buffer changes, default the selection back to the row that contains
// the current target (so the player can press Tab immediately once the
// target is uniquely identifiable). Falls back to 0 if target dropped out.
const selectionForTarget = (
  course: Course,
  buffer: string,
  target: string
): number => {
  const idx = candidatesOf(course, buffer).indexOf(target);
  return idx >= 0 ? idx : 0;
};

export function useTypingGame(course: Course) {
  const config = COURSES[course];
  const durationMs = config.durationSec * 1000;

  // Held random sample for the "buffer is empty" preview list; only refreshed
  // on target change so it doesn't jitter while the player is reading.
  const [emptyPreview, setEmptyPreview] = useState<string[]>(() =>
    sample(WORDS[course], MAX_CANDIDATES)
  );

  const [state, setState] = useState<GameState>(() => ({
    course,
    target: pickTarget(course),
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

  const isPreview = state.buffer.length === 0;

  const candidates = useMemo(() => {
    if (isPreview) return emptyPreview;
    return candidatesOf(state.course, state.buffer);
  }, [isPreview, state.course, state.buffer, emptyPreview]);

  const typeChar = useCallback((ch: string) => {
    setState((s) => {
      if (s.status !== "playing") return s;
      const expected = s.target[s.buffer.length];
      if (ch !== expected) {
        return {
          ...s,
          hasError: true,
          stats: { ...s.stats, missedChars: s.stats.missedChars + 1 },
        };
      }
      const nextBuffer = s.buffer + ch;
      const earned = yenPerChar(s.course);
      // Word complete via typing
      if (nextBuffer === s.target) {
        const newTarget = pickTarget(s.course, s.target);
        setEmptyPreview(sample(WORDS[s.course], MAX_CANDIDATES));
        return {
          ...s,
          target: newTarget,
          buffer: "",
          selectedIdx: 0,
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
        buffer: nextBuffer,
        selectedIdx: selectionForTarget(s.course, nextBuffer, s.target),
        hasError: false,
        stats: {
          ...s.stats,
          correctChars: s.stats.correctChars + 1,
          earnedYen: s.stats.earnedYen + earned,
        },
      };
    });
  }, []);

  const backspace = useCallback(() => {
    setState((s) => {
      if (s.status !== "playing") return s;
      if (s.buffer.length === 0) return s;
      const nextBuffer = s.buffer.slice(0, -1);
      return {
        ...s,
        buffer: nextBuffer,
        selectedIdx:
          nextBuffer.length === 0
            ? 0
            : selectionForTarget(s.course, nextBuffer, s.target),
        hasError: false,
      };
    });
  }, []);

  const moveSelection = useCallback((dir: 1 | -1) => {
    setState((s) => {
      if (s.status !== "playing") return s;
      if (s.buffer.length === 0) return s; // preview: navigation disabled
      const cands = candidatesOf(s.course, s.buffer);
      if (cands.length === 0) return s;
      const max = cands.length - 1;
      const next = Math.min(Math.max(0, s.selectedIdx + dir), max);
      return { ...s, selectedIdx: next };
    });
  }, []);

  const accept = useCallback(() => {
    setState((s) => {
      if (s.status !== "playing") return s;
      if (s.buffer.length === 0) return s; // preview: Tab disabled
      const cands = candidatesOf(s.course, s.buffer);
      const selected = cands[s.selectedIdx];
      if (selected !== s.target) {
        // hint only — no penalty, no state change beyond shake feedback
        return { ...s, hasError: true };
      }
      const newTarget = pickTarget(s.course, s.target);
      setEmptyPreview(sample(WORDS[s.course], MAX_CANDIDATES));
      return {
        ...s,
        target: newTarget,
        buffer: "",
        selectedIdx: 0,
        hasError: false,
        stats: {
          ...s.stats,
          completedWords: s.stats.completedWords + 1,
          // Tab-completed chars yield no yen; only typed chars do.
        },
      };
    });
  }, []);

  const refresh = useCallback(() => {
    setState((s) => {
      if (s.status !== "playing") return s;
      if (s.buffer.length === 0) {
        // refresh target with small penalty
        const newTarget = pickTarget(s.course, s.target);
        setEmptyPreview(sample(WORDS[s.course], MAX_CANDIDATES));
        return {
          ...s,
          target: newTarget,
          buffer: "",
          selectedIdx: 0,
          hasError: false,
          stats: { ...s.stats, missedChars: s.stats.missedChars + 3 },
        };
      }
      // clear buffer, keep target
      return { ...s, buffer: "", selectedIdx: 0, hasError: false };
    });
  }, []);

  return {
    state,
    candidates,
    isPreview,
    typeChar,
    backspace,
    moveSelection,
    accept,
    refresh,
    config,
  };
}
