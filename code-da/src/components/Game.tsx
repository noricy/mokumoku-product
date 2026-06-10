import { useEffect } from "react";
import { useTypingGame } from "../hooks/useTypingGame";
import type { Course } from "../data/words";
import type { GameStats } from "../hooks/useTypingGame";

type Props = {
  course: Course;
  onFinish: (stats: GameStats) => void;
  onAbort: () => void;
};

export function Game({ course, onFinish, onAbort }: Props) {
  const { state, handleKey, tabComplete, config } = useTypingGame(course);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onAbort();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        tabComplete();
        return;
      }
      if (e.key.length === 1) {
        handleKey(e.key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, tabComplete, onAbort]);

  useEffect(() => {
    if (state.status === "finished") {
      onFinish(state.stats);
    }
  }, [state.status, state.stats, onFinish]);

  const typed = state.currentWord.slice(0, state.typedIndex);
  const cursor = state.currentWord[state.typedIndex] ?? "";
  const rest = state.currentWord.slice(state.typedIndex + 1);
  const remainingSec = Math.ceil(state.remainingMs / 1000);
  const progressPct =
    100 - (state.remainingMs / (config.durationSec * 1000)) * 100;
  const canComplete = state.typedIndex > 0;

  return (
    <div className="screen game">
      <div className="hud">
        <div className="hud-cell">
          <span className="hud-label">残り</span>
          <span className="hud-value time">{remainingSec}s</span>
        </div>
        <div className="hud-cell">
          <span className="hud-label">獲得</span>
          <span className="hud-value yen">¥{state.stats.earnedYen}</span>
        </div>
        <div className="hud-cell">
          <span className="hud-label">目標</span>
          <span className="hud-value goal">¥{config.price}</span>
        </div>
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${progressPct}%` }} />
      </div>
      <div className={`word-box ${state.hasError ? "shake" : ""}`}>
        <pre className="word">
          <span className="typed">{typed}</span>
          <span className="cursor">{cursor || " "}</span>
          <span className={`rest ${canComplete ? "ghost" : ""}`}>{rest}</span>
        </pre>
        {canComplete && (
          <div className="complete-badge">
            <kbd>↹ Tab</kbd> で補完
          </div>
        )}
      </div>
      <div className="hint">
        <kbd>↹ Tab</kbd>{" "}
        {canComplete ? "残りを補完(残文字は¥なし)" : "お題スキップ"} &nbsp;
        <kbd>Esc</kbd> 中断
      </div>
    </div>
  );
}
