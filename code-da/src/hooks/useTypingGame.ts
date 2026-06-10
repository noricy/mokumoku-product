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

const QUOTE_CHARS = ['"', "'", "`"];
// Tokens containing any of these are treated as literals (not completable).
// See SPEC.md §3.5.2.
const LITERAL_CHARS = /[{}()<>[\]|&;]/;

// Determine the next-token completion target for the given buffer length.
// Returns { newLen, ok } where ok=false means the current/next token is a
// literal (or otherwise non-completable) and Tab should be a no-op.
const completionFor = (
  target: string,
  bufferLen: number
): { newLen: number; ok: boolean } => {
  let i = bufferLen;
  // Skip any whitespace separating us from the next token
  while (i < target.length && target[i] === " ") i++;
  if (i >= target.length) {
    // Nothing left — buffer already at end of target; treat as full complete.
    return { newLen: target.length, ok: true };
  }
  // Quoted-string token → literal
  if (QUOTE_CHARS.includes(target[i])) {
    return { newLen: bufferLen, ok: false };
  }
  const start = i;
  while (i < target.length && target[i] !== " ") i++;
  const text = target.slice(start, i);
  if (text.length < 2 || LITERAL_CHARS.test(text)) {
    return { newLen: bufferLen, ok: false };
  }
  let newLen = i;
  if (newLen < target.length && target[newLen] === " ") newLen++;
  return { newLen, ok: true };
};

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

  // True when the next token (the one Tab would complete) is a literal.
  // Used by the UI to dim the Tab hint and show "no completion here".
  const currentTokenIsLiteral = useMemo(() => {
    if (isPreview) return false;
    if (state.buffer.length >= state.target.length) return false;
    return !completionFor(state.target, state.buffer.length).ok;
  }, [isPreview, state.buffer.length, state.target]);

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
        // selected is not target — Tab is a no-op hint (no penalty)
        return { ...s, hasError: true };
      }
      const { newLen, ok } = completionFor(s.target, s.buffer.length);
      if (!ok) {
        // current/next token is a literal — Tab is a no-op hint (no penalty)
        return { ...s, hasError: true };
      }
      const newBuffer = s.target.slice(0, newLen);
      // Full target completed via Tab (rare: only when only one token remained
      // and it had no trailing space)
      if (newBuffer === s.target) {
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
      }
      return {
        ...s,
        buffer: newBuffer,
        selectedIdx: selectionForTarget(s.course, newBuffer, s.target),
        hasError: false,
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
    currentTokenIsLiteral,
    typeChar,
    backspace,
    moveSelection,
    accept,
    refresh,
    config,
  };
}
