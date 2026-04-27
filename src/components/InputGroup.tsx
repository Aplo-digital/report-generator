import * as React from 'react'

export interface InputGroupProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  description?: string
  error?: string
  size?: 'sm' | 'default' | 'lg'
  /** Rendered in a muted addon slot flush to the left edge */
  leading?: React.ReactNode
  /** Rendered in a muted addon slot flush to the right edge (text, icon, select) */
  trailing?: React.ReactNode
  /** Rendered as a full-height action slot flush to the right edge (button) — no muted bg */
  trailingAction?: React.ReactNode
  containerClassName?: string
}

const sizes = {
  sm:      { addon: 'px-2.5 text-xs',  input: 'px-2.5 py-1 text-xs'  },
  default: { addon: 'px-3 text-sm',    input: 'px-3 py-2 text-sm'     },
  lg:      { addon: 'px-4 text-base',  input: 'px-4 py-3 text-base'   },
}

export const InputGroup = React.forwardRef<HTMLInputElement, InputGroupProps>(
  (
    {
      label,
      description,
      error,
      size = 'default',
      leading,
      trailing,
      trailingAction,
      containerClassName,
      className,
      id,
      onFocus,
      onBlur,
      ...inputProps
    },
    ref,
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const sz = sizes[size]
    const hasLeading = leading !== undefined
    const hasTrailing = trailing !== undefined
    const hasTrailingAction = trailingAction !== undefined

    const [focused, setFocused] = React.useState(false)

    const wrapperBorder = error
      ? 'border-destructive'
      : focused
        ? 'border-primary shadow-[0_0_0_3px_hsl(179_100%_21%/0.12)]'
        : 'border-border'

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium mb-1.5">
            {label}
          </label>
        )}

        <div
          className={[
            'flex items-stretch rounded-md border overflow-hidden',
            'transition-[border-color,box-shadow] duration-200',
            wrapperBorder,
          ].join(' ')}
        >
          {/* Leading addon */}
          {hasLeading && (
            <div
              className={`flex items-center shrink-0 border-r border-border bg-muted select-none ${sz.addon}`}
            >
              {leading}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            className={[
              'flex-1 min-w-0 bg-surface outline-none text-foreground',
              'placeholder:text-muted-foreground',
              sz.input,
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={error ? true : undefined}
            onFocus={(e) => { setFocused(true); onFocus?.(e) }}
            onBlur={(e) => { setFocused(false); onBlur?.(e) }}
            {...inputProps}
          />

          {/* Trailing addon — muted bg, for text / icons / selects */}
          {hasTrailing && (
            <div
              className={`flex items-center shrink-0 border-l border-border bg-muted  select-none ${sz.addon}`}
            >
              {trailing}
            </div>
          )}

          {/* Trailing action — no bg, for buttons */}
          {hasTrailingAction && (
            <div className="flex items-stretch shrink-0 border-l border-border">
              {trailingAction}
            </div>
          )}
        </div>

        {(description || error) && (
          <p className={`mt-1.5 text-xs ${error ? 'text-destructive' : ''}`}>
            {error ?? description}
          </p>
        )}
      </div>
    )
  },
)
InputGroup.displayName = 'InputGroup'
