import Foundation

struct StepMonthRange {
  let start: Date
  let end: Date
  let days: [Date]
  let calendar: Calendar

  static func make(month: String, now: Date, timeZone: TimeZone) -> StepMonthRange? {
    guard let first = StepDayRange.make(day: month + "-01", now: now, timeZone: timeZone) else { return nil }
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    guard let next = calendar.date(byAdding: .month, value: 1, to: first.start),
          let count = calendar.range(of: .day, in: .month, for: first.start) else { return nil }
    let days = count.compactMap { calendar.date(byAdding: .day, value: $0 - 1, to: first.start) }
    return StepMonthRange(start: first.start, end: min(next, now), days: days, calendar: calendar)
  }
}
