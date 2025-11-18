import { useState, useMemo } from 'react'

interface DateRangePickerProps {
  startDate: string | null
  endDate: string | null
  onDateChange: (start: string | null, end: string | null) => void
  minDate?: string // Ngày tối thiểu có thể chọn (thường là ngày cấp)
  disabledDates?: string[] // Danh sách ngày không khả dụng
}

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
]

const MONTHS_SHORT = [
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
  'T7', 'T8', 'T9', 'T10', 'T11', 'T12'
]

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export default function DateRangePicker({
  startDate,
  endDate,
  onDateChange,
  minDate,
  disabledDates = []
}: DateRangePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = startDate ? new Date(startDate) : new Date()
    return { year: date.getFullYear(), month: date.getMonth() }
  })

  // Tính toán tháng thứ hai (tháng tiếp theo)
  const secondMonth = useMemo(() => {
    const nextMonth = new Date(currentMonth.year, currentMonth.month + 1, 1)
    return { year: nextMonth.getFullYear(), month: nextMonth.getMonth() }
  }, [currentMonth])

  // Tạo lịch cho một tháng
  const getCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7 // Chuyển Chủ nhật từ 0 thành 6

    const days: (Date | null)[] = []
    
    // Thêm các ngày trống ở đầu tháng
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Thêm các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const firstMonthDays = getCalendarDays(currentMonth.year, currentMonth.month)
  const secondMonthDays = getCalendarDays(secondMonth.year, secondMonth.month)

  const isDateDisabled = (date: Date): boolean => {
    if (minDate) {
      const min = new Date(minDate)
      min.setHours(0, 0, 0, 0)
      if (date < min) return true
    }
    
    const dateStr = date.toISOString().split('T')[0]
    return disabledDates.includes(dateStr)
  }

  const isDateInRange = (date: Date): boolean => {
    if (!startDate || !endDate) return false
    const dateStr = date.toISOString().split('T')[0]
    return dateStr > startDate && dateStr < endDate
  }

  const isStartDate = (date: Date): boolean => {
    if (!startDate) return false
    const dateStr = date.toISOString().split('T')[0]
    return dateStr === startDate
  }

  const isEndDate = (date: Date): boolean => {
    if (!endDate) return false
    const dateStr = date.toISOString().split('T')[0]
    return dateStr === endDate
  }

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return

    const dateStr = date.toISOString().split('T')[0]

    // Logic chọn ngày linh hoạt:
    // 1. Nếu chưa có startDate: đặt làm startDate
    // 2. Nếu đã có startDate nhưng chưa có endDate: 
    //    - Nếu ngày chọn > startDate: đặt làm endDate
    //    - Nếu ngày chọn <= startDate: đặt làm startDate mới (reset endDate)
    // 3. Nếu đã có cả startDate và endDate:
    //    - Click vào ngày mới sẽ reset và đặt làm startDate mới
    if (!startDate) {
      // Chưa có startDate, đặt làm startDate
      onDateChange(dateStr, endDate)
    } else if (!endDate) {
      // Đã có startDate nhưng chưa có endDate
      if (dateStr > startDate) {
        // Ngày chọn sau startDate → đặt làm endDate
        onDateChange(startDate, dateStr)
      } else {
        // Ngày chọn <= startDate → đặt làm startDate mới (reset endDate)
        onDateChange(dateStr, null)
      }
    } else {
      // Đã có cả startDate và endDate → reset và đặt làm startDate mới
      onDateChange(dateStr, null)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev.year, prev.month + (direction === 'next' ? 1 : -1), 1)
      return { year: newDate.getFullYear(), month: newDate.getMonth() }
    })
  }

  const handleMonthChange = (year: number, month: number) => {
    setCurrentMonth({ year, month })
  }

  const renderCalendar = (year: number, month: number, days: (Date | null)[]) => {
    return (
      <div className="date-range-calendar">
        <div className="calendar-header">
          <div className="calendar-month-year">
            {MONTHS[month]} {year}
          </div>
        </div>
        <div className="calendar-weekdays">
          {WEEKDAYS.map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
        </div>
        <div className="calendar-days">
          {days.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="calendar-day empty" />
            }

            const disabled = isDateDisabled(date)
            const inRange = isDateInRange(date)
            const isStart = isStartDate(date)
            const isEnd = isEndDate(date)
            const dateStr = date.toISOString().split('T')[0]

            return (
              <button
                key={dateStr}
                type="button"
                className={`calendar-day ${disabled ? 'disabled' : ''} ${inRange ? 'in-range' : ''} ${isStart ? 'start-date' : ''} ${isEnd ? 'end-date' : ''}`}
                onClick={() => handleDateClick(date)}
                disabled={disabled}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Tạo danh sách năm (từ năm hiện tại - 10 đến + 20)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 31 }, (_, i) => currentYear - 10 + i)

  return (
    <div className="date-range-picker">
      <div className="date-range-picker-header">
        <button
          type="button"
          className="date-range-nav-btn"
          onClick={() => navigateMonth('prev')}
          aria-label="Tháng trước"
        >
          &lt;
        </button>
        
        <div className="date-range-month-year-selectors">
          <select
            className="date-range-month-select"
            value={currentMonth.month}
            onChange={(e) => handleMonthChange(currentMonth.year, parseInt(e.target.value))}
          >
            {MONTHS_SHORT.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
          <select
            className="date-range-year-select"
            value={currentMonth.year}
            onChange={(e) => handleMonthChange(parseInt(e.target.value), currentMonth.month)}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="date-range-nav-btn"
          onClick={() => navigateMonth('next')}
          aria-label="Tháng sau"
        >
          &gt;
        </button>
      </div>

      <div className="date-range-calendars">
        {renderCalendar(currentMonth.year, currentMonth.month, firstMonthDays)}
        {renderCalendar(secondMonth.year, secondMonth.month, secondMonthDays)}
      </div>
    </div>
  )
}

