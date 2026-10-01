import Foundation

struct StepDayRange {
  let start: Date
  let end: Date

  static func make(day: String, now: Date, timeZone: TimeZone) -> StepDayRange? {
    guard day.range(of: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", options: .regularExpression) != nil else { return nil }
    let parts = day.split(separator: "-").compactMap { Int($0) }
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = timeZone
    let components = DateComponents(year: parts[0], month: parts[1], day: parts[2])
    guard let date = calendar.date(from: components) else { return nil }
    let actual = calendar.dateComponents([.year, .month, .day], from: date)
    guard actual.year == parts[0], actual.month == parts[1], actual.day == parts[2] else { return nil }
    let start = calendar.startOfDay(for: date)
    guard let nextDay = calendar.date(byAdding: .day, value: 1, to: start) else { return nil }
    return StepDayRange(start: start, end: min(nextDay, now))
  }
}
