import { useRef, useEffect, useCallback } from 'react'
import type { TextareaHTMLAttributes } from 'react'

type AutoGrowTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'rows' | 'className'> & {
  value: string
  onChange: (value: string) => void
  /** Minimum height in rows; the textarea grows beyond this as content wraps. */
  minRows?: number
  className?: string
}

/**
 * Textarea that always shows its full content: height is recomputed from
 * scrollHeight on every value change and on window resize.
 */
export default function AutoGrowTextarea({
  value,
  onChange,
  minRows = 1,
  className = '',
  ...rest
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    // border-box sizing: scrollHeight excludes borders, so add them back
    const borders = el.offsetHeight - el.clientHeight
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + borders}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  useEffect(() => {
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  return (
    <textarea
      {...rest}
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`overflow-hidden resize-none ${className}`}
    />
  )
}
