interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function BankedInput({ value, onChange }: Props) {
  return (
    <label className="banked-input">
      <span>Episodes banked (filmed &amp; ready to release)</span>
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Episodes banked"
      />
    </label>
  );
}
