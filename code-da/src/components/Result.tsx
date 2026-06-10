import { COURSES, type Course } from "../data/words";
import type { GameStats } from "../hooks/useTypingGame";

type Props = {
  course: Course;
  stats: GameStats;
  onRetry: () => void;
  onBack: () => void;
};

const computeRank = (ratio: number): { rank: string; comment: string } => {
  if (ratio >= 2) return { rank: "SS", comment: "ぼろ儲けです" };
  if (ratio >= 1.5) return { rank: "S", comment: "黒字ランチが余裕で食えます" };
  if (ratio >= 1.2) return { rank: "A", comment: "コーヒー1杯おかわり可" };
  if (ratio >= 1.0) return { rank: "B", comment: "元は取れました" };
  if (ratio >= 0.7) return { rank: "C", comment: "あと一歩…精進あれ" };
  return { rank: "D", comment: "今日のあなたは赤字です" };
};

export function Result({ course, stats, onRetry, onBack }: Props) {
  const config = COURSES[course];
  const ratio = stats.earnedYen / config.price;
  const { rank, comment } = computeRank(ratio);
  const totalKeys = stats.correctChars + stats.missedChars;
  const accuracy = totalKeys === 0 ? 0 : (stats.correctChars / totalKeys) * 100;
  const minutes = stats.elapsedMs / 60000;
  // approximate WPM using 5-char-per-word convention
  const wpm = minutes === 0 ? 0 : stats.correctChars / 5 / minutes;
  const diff = stats.earnedYen - config.price;

  const shareText =
    `code-da ${config.emoji}${config.label} 結果\n` +
    `ランク: ${rank}\n` +
    `獲得: ¥${stats.earnedYen} (${diff >= 0 ? "+" : ""}${diff})\n` +
    `WPM: ${wpm.toFixed(1)} / 正確率: ${accuracy.toFixed(1)}%`;

  const onShare = () => {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("text", shareText);
    url.searchParams.set("hashtags", "コード打");
    window.open(url.toString(), "_blank", "noopener");
  };

  return (
    <div className="screen result">
      <div className={`rank-badge rank-${rank}`}>{rank}</div>
      <p className="rank-comment">{comment}</p>
      <dl className="result-table">
        <div>
          <dt>コース</dt>
          <dd>
            {config.emoji} {config.label} (¥{config.price})
          </dd>
        </div>
        <div>
          <dt>獲得額</dt>
          <dd className={diff >= 0 ? "good" : "bad"}>
            ¥{stats.earnedYen}{" "}
            <span className="diff">
              ({diff >= 0 ? "+" : ""}
              {diff})
            </span>
          </dd>
        </div>
        <div>
          <dt>完了お題</dt>
          <dd>{stats.completedWords}</dd>
        </div>
        <div>
          <dt>WPM</dt>
          <dd>{wpm.toFixed(1)}</dd>
        </div>
        <div>
          <dt>正確率</dt>
          <dd>{accuracy.toFixed(1)}%</dd>
        </div>
        <div>
          <dt>正タイプ / ミス</dt>
          <dd>
            {stats.correctChars} / {stats.missedChars}
          </dd>
        </div>
      </dl>
      <div className="result-actions">
        <button onClick={onRetry}>もう一度</button>
        <button onClick={onBack}>コース選択へ</button>
        <button onClick={onShare} className="share">
          結果をシェア
        </button>
      </div>
    </div>
  );
}
