import { useState } from "react";
import { CourseSelect } from "./components/CourseSelect";
import { Game } from "./components/Game";
import { Result } from "./components/Result";
import type { Course } from "./data/words";
import type { GameStats } from "./hooks/useTypingGame";
import "./App.css";

type Phase =
  | { name: "select" }
  | { name: "playing"; course: Course; runId: number }
  | { name: "result"; course: Course; stats: GameStats };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: "select" });

  return (
    <div className="app">
      {phase.name === "select" && (
        <CourseSelect
          onSelect={(course) =>
            setPhase({ name: "playing", course, runId: Date.now() })
          }
        />
      )}
      {phase.name === "playing" && (
        <Game
          key={phase.runId}
          course={phase.course}
          onFinish={(stats) =>
            setPhase({ name: "result", course: phase.course, stats })
          }
          onAbort={() => setPhase({ name: "select" })}
        />
      )}
      {phase.name === "result" && (
        <Result
          course={phase.course}
          stats={phase.stats}
          onRetry={() =>
            setPhase({
              name: "playing",
              course: phase.course,
              runId: Date.now(),
            })
          }
          onBack={() => setPhase({ name: "select" })}
        />
      )}
    </div>
  );
}
