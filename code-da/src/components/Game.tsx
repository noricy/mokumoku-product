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
  const {
    state,
    candidates,
    typeChar,
    backspace,
    moveSelection,
    accept,
    skip,
    config,
  } = useTypingGame(course);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onAbort();
        return;
      }
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        skip();
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        accept();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSelection(-1);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSelection(1);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeChar(e.key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [typeChar, backspace, moveSelection, accept, skip, onAbort]);

  useEffect(() => {
    if (state.status === "finished") {
      onFinish(state.stats);
    }
  }, [state.status, state.stats, onFinish]);

  const remainingSec = Math.ceil(state.remainingMs / 1000);
  const progressPct =
    100 - (state.remainingMs / (config.durationSec * 1000)) * 100;
  const noMatch = state.buffer.length > 0 && candidates.length === 0;

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
      <div className={`terminal ${state.hasError ? "shake" : ""}`}>
        <div className="prompt-row">
          <span className="prompt-sigil">$</span>
          <span className="typed">{state.buffer}</span>
          <span className="cursor">_</span>
        </div>
        <ul className={`candidates ${noMatch ? "empty" : ""}`}>
          {candidates.length === 0 ? (
            <li className="no-match">
              {state.buffer.length === 0
                ? "(タイプしてコマンドを選ぼう)"
                : "no matches — Backspace で戻る"}
            </li>
          ) : (
            candidates.map((word, i) => {
              const prefixLen = state.buffer.length;
              return (
                <li
                  key={word}
                  className={i === state.selectedIdx ? "selected" : ""}
                >
                  <span className="cand-arrow">
                    {i === state.selectedIdx ? "▸" : " "}
                  </span>
                  <span className="cand-prefix">
                    {word.slice(0, prefixLen)}
                  </span>
                  <span className="cand-suffix">{word.slice(prefixLen)}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
      <div className="hint">
        <kbd>↑↓</kbd> 選択 &nbsp; <kbd>↹ Tab</kbd>/<kbd>Enter</kbd> 実行 &nbsp;
        <kbd>⇧↹</kbd> リフレッシュ &nbsp; <kbd>Esc</kbd> 中断
      </div>
    </div>
  );
}
