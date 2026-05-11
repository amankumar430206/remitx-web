import { useState, useCallback, useRef, useEffect } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths,
  isSameDay, isWithinInterval, isBefore, isAfter, startOfDay,
  setYear, getYear,
} from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SelectMode = 'single' | 'range'
export type ViewMode = 'days' | 'years'

interface PickerState {
  startDate: Date | null
  endDate: Date | null
  hoverDate: Date | null
  viewDate: Date
  viewMode: ViewMode
  yearRangeStart: number
}

export interface UseDatePickerOptions {
  selectMode: SelectMode
  initialStartDate?: Date | null
  initialEndDate?: Date | null
  minDate?: Date | null
  maxDate?: Date | null
  numberOfMonths?: 1 | 2
  onChange?: (startDate: Date | null, endDate: Date | null) => void
}

// ─── Computed display range ───────────────────────────────────────────────────
// Returns the [displayStart, displayEnd] pair used for range bar rendering.
// In pre-commit mode (start set, no end), the hover position becomes the end.

function computeDisplayRange(
  startDate: Date | null,
  endDate: Date | null,
  hoverDate: Date | null,
  selectMode: SelectMode,
): { displayStart: Date | null; displayEnd: Date | null } {
  if (!startDate) return { displayStart: null, displayEnd: null }

  const s = startOfDay(startDate)

  if (endDate) {
    return { displayStart: s, displayEnd: startOfDay(endDate) }
  }

  if (selectMode === 'range' && hoverDate) {
    const h = startOfDay(hoverDate)
    return isBefore(h, s)
      ? { displayStart: h, displayEnd: s }
      : { displayStart: s, displayEnd: h }
  }

  return { displayStart: s, displayEnd: null }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDatePicker({
  selectMode,
  initialStartDate,
  initialEndDate,
  minDate,
  maxDate,
  numberOfMonths = 1,
  onChange,
}: UseDatePickerOptions) {
  const [state, setState] = useState<PickerState>({
    startDate: initialStartDate ?? null,
    endDate:   initialEndDate   ?? null,
    hoverDate: null,
    viewDate:  initialStartDate ?? new Date(),
    viewMode:  'days',
    yearRangeStart: getYear(new Date()) - 5,
  })

  // Ref so selectDate can read current state without being in its dependency array
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // ── Predicates ───────────────────────────────────────────────────────────

  const isDisabled = useCallback((date: Date): boolean => {
    const d = startOfDay(date)
    if (minDate && isBefore(d, startOfDay(minDate))) return true
    if (maxDate && isAfter(d, startOfDay(maxDate))) return true
    return false
  }, [minDate, maxDate])

  const getDayInfo = useCallback((date: Date) => {
    const { startDate, endDate, hoverDate } = state
    const { displayStart, displayEnd } = computeDisplayRange(startDate, endDate, hoverDate, selectMode)
    const d = startOfDay(date)

    const isStart   = !!(displayStart && isSameDay(d, displayStart))
    const isEnd     = !!(displayEnd && isSameDay(d, displayEnd))
    // Strictly inside (not endpoints themselves)
    const isInRange = !!(
      displayStart && displayEnd &&
      !isSameDay(displayStart, displayEnd) &&
      isWithinInterval(d, { start: displayStart, end: displayEnd }) &&
      !isSameDay(d, displayStart) &&
      !isSameDay(d, displayEnd)
    )
    // True when range has two distinct days (so we draw the bar extensions)
    const hasSpan   = !!(displayStart && displayEnd && !isSameDay(displayStart, displayEnd))
    // Provisional (hover preview, not yet committed)
    const isHoverPreview = selectMode === 'range' && !endDate && !!(hoverDate)

    return { isStart, isEnd, isInRange, hasSpan, isHoverPreview }
  }, [state, selectMode])

  // ── Date selection ────────────────────────────────────────────────────────

  const selectDate = useCallback((date: Date) => {
    if (isDisabled(date)) return

    if (selectMode === 'single') {
      setState(s => ({ ...s, startDate: date, endDate: null, hoverDate: null }))
      onChange?.(date, null)
      return
    }

    // Range mode — read current state synchronously via ref so we can call
    // onChange as a plain side-effect, not inside a setState updater.
    const { startDate, endDate } = stateRef.current

    if (!startDate || endDate) {
      // Begin a new range selection (no onChange yet — waiting for end date)
      setState(s => ({ ...s, startDate: date, endDate: null, hoverDate: null }))
      return
    }

    // Commit the end date (swap if user clicked before start)
    const s = startOfDay(startDate)
    const d = startOfDay(date)
    const [newStart, newEnd] = isBefore(d, s) ? [date, startDate] : [startDate, date]
    setState(st => ({ ...st, startDate: newStart, endDate: newEnd, hoverDate: null }))
    onChange?.(newStart, newEnd)
  }, [isDisabled, selectMode, onChange])

  const setHoverDate = useCallback((date: Date | null) => {
    if (selectMode !== 'range') return
    setState(s => {
      if (s.endDate) return s // range already committed, no hover needed
      return { ...s, hoverDate: date }
    })
  }, [selectMode])

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigate = useCallback((dir: 'prev' | 'next') => {
    setState(s => ({
      ...s,
      viewDate: dir === 'prev'
        ? subMonths(s.viewDate, numberOfMonths)
        : addMonths(s.viewDate, numberOfMonths),
    }))
  }, [numberOfMonths])

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(s => ({ ...s, viewMode: mode }))
  }, [])

  const selectYear = useCallback((year: number) => {
    setState(s => ({ ...s, viewDate: setYear(s.viewDate, year), viewMode: 'days' }))
  }, [])

  const shiftYearRange = useCallback((dir: 'prev' | 'next') => {
    setState(s => ({ ...s, yearRangeStart: s.yearRangeStart + (dir === 'prev' ? -12 : 12) }))
  }, [])

  // ── Grid builder ──────────────────────────────────────────────────────────

  const getDaysGrid = useCallback((monthDate: Date): Date[] =>
    eachDayOfInterval({
      start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }),
      end:   endOfWeek(endOfMonth(monthDate),     { weekStartsOn: 1 }),
    }),
  [])

  // ── Shortcut application ──────────────────────────────────────────────────

  const applyShortcut = useCallback((startDate: Date, endDate: Date) => {
    setState(s => ({ ...s, startDate, endDate, hoverDate: null }))
    onChange?.(startDate, endDate)
  }, [onChange])

  // ── Clear ─────────────────────────────────────────────────────────────────

  const clear = useCallback(() => {
    setState(s => ({ ...s, startDate: null, endDate: null, hoverDate: null }))
    onChange?.(null, null)
  }, [onChange])

  return {
    state,
    isDisabled,
    getDayInfo,
    selectDate,
    setHoverDate,
    navigate,
    setViewMode,
    selectYear,
    shiftYearRange,
    getDaysGrid,
    applyShortcut,
    clear,
  }
}

export type DatePickerReturn = ReturnType<typeof useDatePicker>
