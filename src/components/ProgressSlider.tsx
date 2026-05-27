interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}

const LABELS = [0, 25, 50, 75, 100]

const THUMB_RADIUS = 8.5

export function ProgressSlider({ value, onChange, min = 0, max = 100, step = 5 }: Props) {
  const pct = (value - min) / (max - min)

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="progress-slider w-full block"
          style={{ '--pct': pct } as React.CSSProperties}
        />
        <div className="relative h-3.5">
          {LABELS.map((v) => (
            <span
              key={v}
              className="absolute text-[10px] text-muted-foreground/60 tabular-nums"
              style={{
                left: `calc(${THUMB_RADIUS}px + (100% - ${THUMB_RADIUS * 2}px) * ${v / 100})`,
                transform: 'translateX(-50%)',
              }}
            >
              {v}
            </span>
          ))}
        </div>
      </div>
      {/* <span className="text-sm font-medium tabular-nums w-9 text-right text-foreground shrink-0">
        {value}%
      </span> */}
    </div>
  )
}
