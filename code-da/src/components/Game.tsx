import { useEffect, useRef } from "react";
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
    currentTokenIsLiteral,
    typeChar,
    backspace,
    moveSelection,
    accept,
    refresh,
    config,
  } = useTypingGame(course);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the hidden input on mount. On iOS Safari this won't open the
  // soft keyboard without a user gesture — the user must tap the game area
  // first; see the onClick handler on the root element.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Special keys (desktop physical keyboard). Printable chars and Backspace
  // come through onBeforeInput on the hidden input instead, so they aren't
  // handled here (would double-fire).
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveSelection, accept, refresh, onAbort]);

  useEffect(() => {
    if (state.status === "finished") onFinish(state.stats);
  }, [state.status, state.stats, onFinish]);

  const focusInput = () => inputRef.current?.focus();

  // beforeinput is the cross-platform-reliable way to capture text input,
  // including from Android/iOS soft keyboards which often don't fire keydown
  // for character keys.
  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const ev = e.nativeEvent as InputEvent;
    e.preventDefault();
    if (ev.inputType === "insertText" && ev.data) {
      for (const ch of ev.data) {
        // Skip non-printable control chars (tab, newline) — those are special keys
        if (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) !== 127) {
          typeChar(ch);
        }
      }
    } else if (ev.inputType?.startsWith("deleteContent")) {
      backspace();
    }
  };

  // Wrap each action button so it triggers its action AND refocuses the
  // hidden input, keeping the soft keyboard open on mobile.
  const withRefocus = (action: () => void) => () => {
    action();
    focusInput();
  };

  const remainingSec = Math.ceil(state.remainingMs / 1000);
  const progressPct =
    100 - (state.remainingMs / (config.durationSec * 1000)) * 100;

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
        {/* Real input overlaid transparently on the row. User taps anywhere
            on the prompt → keyboard opens (iOS-friendly: no programmatic
            focus required for the initial tap). Stays value="" because we
            preventDefault every beforeinput; the visible buffer below is
            the display of state.buffer. */}
        <input
          ref={inputRef}
          className="real-input"
          type="text"
          value=""
          onChange={() => {}}
          onBeforeInput={handleBeforeInput}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="text"
          aria-label="code-da input"
        />
        <span className="prompt-sigil">$</span>
        <span className="typed-buf">{state.buffer}</span>
        <span className="caret">_</span>
        {currentTokenIsLiteral && (
          <span className="literal-tag">literal — Tab 不可</span>
        )}
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

      <div className="actions">
        <button
          type="button"
          className="act"
          aria-label="up"
          onClick={withRefocus(() => moveSelection(-1))}
        >
          ↑
        </button>
        <button
          type="button"
          className="act"
          aria-label="down"
          onClick={withRefocus(() => moveSelection(1))}
        >
          ↓
        </button>
        <button
          type="button"
          className="act primary"
          aria-label="accept"
          onClick={withRefocus(() => accept())}
        >
          ↹ Tab
        </button>
        <button
          type="button"
          className="act"
          aria-label="refresh"
          onClick={withRefocus(() => refresh())}
        >
          ⇧↹
        </button>
        <button
          type="button"
          className="act"
          aria-label="backspace"
          onClick={withRefocus(() => backspace())}
        >
          ⌫
        </button>
        <button
          type="button"
          className="act danger"
          aria-label="abort"
          onClick={() => onAbort()}
        >
          Esc
        </button>
      </div>

      <div className="hint">
        <kbd>↑↓</kbd> 選択 &nbsp;
        <kbd>↹ Tab</kbd> / <kbd>Enter</kbd> 実行 &nbsp;
        <kbd>⇧↹</kbd> リフレッシュ &nbsp;
        <kbd>⌫</kbd> 1文字戻る &nbsp;
        <kbd>Esc</kbd> 中断
      </div>
    </div>
  );
}
