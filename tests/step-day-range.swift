import Foundation

@main
struct StepDayRangeTests {
  static func main() {
    let iso = ISO8601DateFormatter()
    let tokyo = TimeZone(identifier: "Asia/Tokyo")!
    let newYork = TimeZone(identifier: "America/New_York")!
    let after = iso.date(from: "2027-01-01T00:00:00Z")!
    let japanDay = StepDayRange.make(day: "2026-09-11", now: after, timeZone: tokyo)!
    precondition(japanDay.start == iso.date(from: "2026-09-10T15:00:00Z"))
    precondition(japanDay.end == iso.date(from: "2026-09-11T15:00:00Z"))
    let spring = StepDayRange.make(day: "2026-03-08", now: after, timeZone: newYork)!
    precondition(spring.end.timeIntervalSince(spring.start) == 23 * 3600)
    let autumn = StepDayRange.make(day: "2026-11-01", now: after, timeZone: newYork)!
    precondition(autumn.end.timeIntervalSince(autumn.start) == 25 * 3600)
    let now = iso.date(from: "2026-09-11T03:00:00Z")!
    precondition(StepDayRange.make(day: "2026-09-11", now: now, timeZone: tokyo)!.end == now)
    let future = StepDayRange.make(day: "2026-09-12", now: now, timeZone: tokyo)!
    precondition(future.end < future.start)
    for invalid in ["2026-02-29", "2026-13-01", "2026-04-31", "2026-9-11", "junk", "2026-09-00"] {
      precondition(StepDayRange.make(day: invalid, now: after, timeZone: tokyo) == nil, invalid)
    }
    precondition(StepDayRange.make(day: "2024-02-29", now: after, timeZone: tokyo) != nil)
    print("PASS: Japan midnight, DST boundaries, today, future dates, leap years and invalid dates")
  }
}
