import { COURSES, type Course } from "../data/words";

type Props = {
  onSelect: (course: Course) => void;
};

const ORDER: Course[] = ["casual", "recommended", "premium"];

export function CourseSelect({ onSelect }: Props) {
  return (
    <div className="screen">
      <header className="title">
        <h1>
          <span className="prompt">$</span> code-da
        </h1>
        <p className="subtitle">
          もくもく会のドリンク代の元を取れ! コードを打って稼ぐタイピングゲーム
        </p>
      </header>
      <ul className="course-list">
        {ORDER.map((id) => {
          const c = COURSES[id];
          return (
            <li key={id}>
              <button className="course-card" onClick={() => onSelect(id)}>
                <div className="course-emoji">{c.emoji}</div>
                <div className="course-body">
                  <div className="course-label">{c.label}</div>
                  <div className="course-desc">{c.description}</div>
                  <div className="course-meta">
                    <span>¥{c.price}</span>
                    <span>{c.durationSec}秒</span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <footer className="footnote">
        <p>お題のコードを打って稼ぐ。IDE 補完で省略するか、ベタ打ちで¥盛るかは自由</p>
        <p>
          <kbd>↑↓</kbd> 候補選択 / <kbd>↹ Tab</kbd> 補完 (target 一致時のみ) /{" "}
          <kbd>⇧↹</kbd> リフレッシュ / <kbd>Esc</kbd> 中断
        </p>
      </footer>
    </div>
  );
}
