import ExpoModulesCore
import HealthKit

public final class SlowRepHealthModule: Module {
  private let healthStore = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("SlowRepHealth")

    Function("isAvailable") {
      HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestStepAccess") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject("HEALTH_UNAVAILABLE", "Health data is unavailable on this device.")
        return
      }
      let steps = HKQuantityType.quantityType(forIdentifier: .stepCount)!
      // Completion means the permission sheet finished, not that read access was granted.
      self.healthStore.requestAuthorization(toShare: [], read: [steps]) { completed, error in
        if let error {
          promise.reject("HEALTH_AUTH_FAILED", error.localizedDescription)
        } else if completed {
          promise.resolve(nil)
        } else {
          promise.reject("HEALTH_AUTH_CANCELLED", "Health authorization did not complete.")
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("getMonthlySteps") { (month: String, promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject("HEALTH_UNAVAILABLE", "Health data is unavailable on this device.")
        return
      }
      guard let range = StepMonthRange.make(month: month, now: Date(), timeZone: .current) else {
        promise.reject("INVALID_MONTH", "Expected a valid month in YYYY-MM format.")
        return
      }
      let empty: [[String: Any]] = range.days.enumerated().map { index, _ in
        ["day": String(format: "%@-%02d", month, index + 1), "steps": NSNull()]
      }
      guard range.start < range.end else { promise.resolve(empty); return }
      let steps = HKQuantityType.quantityType(forIdentifier: .stepCount)!
      let predicate = HKQuery.predicateForSamples(withStart: range.start, end: range.end, options: .strictStartDate)
      var interval = DateComponents()
      interval.calendar = range.calendar
      interval.timeZone = range.calendar.timeZone
      interval.day = 1
      let query = HKStatisticsCollectionQuery(quantityType: steps, quantitySamplePredicate: predicate,
        options: .cumulativeSum, anchorDate: range.start, intervalComponents: interval)
      query.initialResultsHandler = { _, collection, error in
        if let error {
          let healthError = error as NSError
          if healthError.domain == HKErrorDomain && healthError.code == HKError.Code.errorNoData.rawValue {
            promise.resolve(empty)
          } else {
            promise.reject("HEALTH_QUERY_FAILED", "Monthly steps could not be read.")
          }
          return
        }
        let values: [[String: Any]] = range.days.enumerated().map { index, date in
          let quantity = date < range.end ? collection?.statistics(for: date)?.sumQuantity() : nil
          let count: Any = quantity.map { Int($0.doubleValue(for: .count()).rounded()) } as Any? ?? NSNull()
          return ["day": String(format: "%@-%02d", month, index + 1), "steps": count]
        }
        promise.resolve(values)
      }
      self.healthStore.execute(query)
    }

    AsyncFunction("getDailySteps") { (day: String, promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject("HEALTH_UNAVAILABLE", "Health data is unavailable on this device.")
        return
      }
      guard let range = StepDayRange.make(day: day, now: Date(), timeZone: .current) else {
        promise.reject("INVALID_DATE", "Expected a valid date in YYYY-MM-DD format.")
        return
      }
      guard range.start < range.end else {
        promise.resolve(nil)
        return
      }
      let steps = HKQuantityType.quantityType(forIdentifier: .stepCount)!
      let predicate = HKQuery.predicateForSamples(withStart: range.start, end: range.end, options: .strictStartDate)
      // HealthKit combines sources, including overlapping iPhone / Apple Watch records.
      // Summing raw samples would double count those records.
      let query = HKStatisticsQuery(quantityType: steps, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
        if let error {
          if (error as NSError).code == HKError.Code.errorNoData.rawValue {
            promise.resolve(nil)
          } else {
            promise.reject("HEALTH_QUERY_FAILED", error.localizedDescription)
          }
          return
        }
        // HealthKit deliberately does not distinguish denied read access from missing data.
        guard let quantity = result?.sumQuantity() else {
          promise.resolve(nil)
          return
        }
        promise.resolve(Int(quantity.doubleValue(for: .count()).rounded()))
      }
      self.healthStore.execute(query)
    }
  }
}
