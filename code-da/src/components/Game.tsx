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
    isPreview,
    typeChar,
    backspace,
    moveSelection,
    accept,
    refresh,
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
        refresh();
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
  }, [typeChar, backspace, moveSelection, accept, refresh, onAbort]);

  useEffect(() => {
    if (state.status === "finished") onFinish(state.stats);
  }, [state.status, state.stats, onFinish]);

  const remainingSec = Math.ceil(state.remainingMs / 1000);
  const progressPct =
    100 - (state.remainingMs / (config.durationSec * 1000)) * 100;

  // Target word display: split by buffer progress
  const tTyped = state.target.slice(0, state.buffer.length);
  const tCursor = state.target[state.buffer.length] ?? "";
  const tRest = state.target.slice(state.buffer.length + 1);

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

      <div className={`target-box ${state.hasError ? "shake" : ""}`}>
        <div className="target-label">お題</div>
        <pre className="target-word">
          <span className="t-typed">{tTyped}</span>
          <span className="t-cursor">{tCursor || " "}</span>
          <span className="t-rest">{tRest}</span>
        </pre>
      </div>

      <div className="input-row">
        <span className="prompt-sigil">$</span>
        <span className="typed-buf">{state.buffer}</span>
        <span className="caret">_</span>
      </div>

      <ul className={`candidates ${isPreview ? "preview" : ""}`}>
        {candidates.length === 0 && !isPreview ? (
          <li className="no-match">no matches — Backspace で戻る</li>
        ) : (
          candidates.map((word, i) => {
            const isTarget = !isPreview && word === state.target;
            const isSelected = !isPreview && i === state.selectedIdx;
            const prefixLen = isPreview ? 0 : state.buffer.length;
            return (
              <li
                key={word + "-" + i}
                className={[
                  isSelected ? "selected" : "",
                  isTarget ? "is-target" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="cand-cursor">{isSelected ? "▸" : " "}</span>
                <span className="cand-prefix">{word.slice(0, prefixLen)}</span>
                <span className="cand-suffix">{word.slice(prefixLen)}</span>
                {isTarget && <span className="target-tag">target</span>}
              </li>
            );
          })
        )}
      </ul>

      <div className="hint">
        <kbd>↑↓</kbd> 選択 &nbsp;
        <kbd>↹ Tab</kbd> / <kbd>Enter</kbd> target に合えば実行 &nbsp;
        <kbd>⇧↹</kbd> リフレッシュ &nbsp;
        <kbd>Backspace</kbd> 1文字戻る &nbsp;
        <kbd>Esc</kbd> 中断
      </div>
    </div>
  );
}
