interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}

const LABELS = [0, 25, 50, 75, 100]

export function ProgressSlider({ value, onChange, min = 0, max = 100, step = 5 }: Props) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="progress-slider flex-1"
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
        />
        <span className="text-sm font-medium tabular-nums w-9 text-right text-foreground shrink-0">
          {value}%
        </span>
      </div>
      <div className="flex justify-between px-0.5">
        {LABELS.map((v) => (
          <span key={v} className="text-[10px] text-muted-foreground/60 tabular-nums">
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}
