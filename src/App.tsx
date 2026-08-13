import { useState } from "react";
import { BankedInput } from "./components/BankedInput";
import { Calendar } from "./components/Calendar";
import { StatusPanel } from "./components/StatusPanel";
import { Day, fromLocalDate, sameDay } from "./lib/schedule";

export default function App() {
  const today = fromLocalDate(new Date());
  const [bankedText, setBankedText] = useState("");
  const [selected, setSelected] = useState<Day | null>(null);
  const [visible, setVisible] = useState({ year: today.year, month: today.month });

  const parsed = Number.parseInt(bankedText, 10);
  const banked = Number.isInteger(parsed) && parsed >= 0 ? parsed : null;

  return (
    <main className="app">
      <h1>Film Calendar</h1>
      <p className="tagline">Releases every Monday &amp; Thursday</p>

      <BankedInput value={bankedText} onChange={setBankedText} />

      <Calendar
        today={today}
        banked={banked}
        visible={visible}
        onNavigate={setVisible}
        selected={selected}
        onSelect={(day) =>
          setSelected(selected && sameDay(day, selected) ? null : day)
        }
      />

      <StatusPanel banked={banked} today={today} selected={selected} />
    </main>
  );
}
