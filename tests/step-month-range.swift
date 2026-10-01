import Foundation

@main
struct StepMonthRangeTests {
  static func main() {
    let iso = ISO8601DateFormatter()
    let tokyo = TimeZone(identifier: "Asia/Tokyo")!
    let after = iso.date(from: "2027-01-01T00:00:00Z")!
    let september = StepMonthRange.make(month: "2026-09", now: after, timeZone: tokyo)!
    precondition(september.days.count == 30)
    precondition(september.start == iso.date(from: "2026-08-31T15:00:00Z"))
    precondition(september.end == iso.date(from: "2026-09-30T15:00:00Z"))
    precondition(StepMonthRange.make(month: "2024-02", now: after, timeZone: tokyo)!.days.count == 29)
    precondition(StepMonthRange.make(month: "2026-02", now: after, timeZone: tokyo)!.days.count == 28)
    precondition(StepMonthRange.make(month: "2026-12", now: after, timeZone: tokyo)!.days.count == 31)
    let now = iso.date(from: "2026-09-11T03:00:00Z")!
    precondition(StepMonthRange.make(month: "2026-09", now: now, timeZone: tokyo)!.end == now)
    let future = StepMonthRange.make(month: "2026-10", now: now, timeZone: tokyo)!
    precondition(future.start > future.end)
    let march = StepMonthRange.make(month: "2026-03", now: after, timeZone: TimeZone(identifier: "America/New_York")!)!
    precondition(march.end.timeIntervalSince(march.start) == (31 * 24 - 1) * 3600)
    precondition(march.days.allSatisfy { march.calendar.component(.hour, from: $0) == 0 })
    for invalid in ["2026-13", "2026-00", "2026-9", "2026-09-11", "junk"] {
      precondition(StepMonthRange.make(month: invalid, now: after, timeZone: tokyo) == nil)
    }
    print("PASS: month boundaries, leap years, today cap, future, DST and invalid months")
  }
}
