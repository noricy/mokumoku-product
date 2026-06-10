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
        <p>
          IDE風: 1文字打った後の <kbd>↹ Tab</kbd> で残りを補完 (打ってない分の¥は無し)
        </p>
        <p>0文字状態の <kbd>↹ Tab</kbd> はお題スキップ (微ペナルティ) / <kbd>Esc</kbd> で中断</p>
      </footer>
    </div>
  );
}
