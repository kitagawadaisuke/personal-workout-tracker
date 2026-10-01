Pod::Spec.new do |s|
  s.name = 'SlowRepHealth'
  s.version = '1.0.0'
  s.summary = 'Read daily step counts for SlowRep history'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'Daisuke Kitagawa'
  s.homepage = 'https://github.com/kddsk0126'
  s.source = { :git => 'https://github.com/kitagawadaisuke/personal-workout-tracker.git' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
