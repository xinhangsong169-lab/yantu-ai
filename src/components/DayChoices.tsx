import { addDays, formatDay, todayISO, weekdayName, weekdayOf } from '../lib/dates';

const NAMES = ['今天', '明天', '后天'];

export function DayChoices({ value, onChange, label }: { value: string; onChange: (iso: string) => void; label: string }) {
  const today = todayISO();
  const days = Array.from({ length: 8 }, (_, index) => addDays(today, index));

  return (
    <div className="field">
      <span>{label}</span>
      <div className="day-choices" role="group" aria-label={label}>
        {days.map((iso, index) => (
          <button key={iso} type="button" aria-pressed={value === iso} onClick={() => onChange(iso)}>
            <strong>{NAMES[index] || weekdayName(weekdayOf(iso))}</strong>
            <span>{formatDay(iso)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
