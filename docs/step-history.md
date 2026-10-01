# 月間歩数サマリー（1.0.5）

履歴の上部で、選んだ月の合計歩数・1日平均・日別の棒グラフを確認できます。サマリーとカレンダーの月送りは連動します。日付をタップした下部には従来どおり筋トレ記録を表示します。

初回は「ヘルスケアと連携」から歩数の読み取りだけを許可します。日々の確認はApple Watchに任せ、アプリでは1ヶ月の活動を把握する構成です。

## 集計とデータの扱い

- 1日平均は**歩数の記録を取得できた日**で割ります。対象日数も画面に表示します。未取得や許可拒否を0歩として扱いません。取得できた0歩は平均の対象です。
- 当月は現在時刻まで。未来日は集計しません。過去月は月末まで取得します。
- HealthKitの `HKStatisticsCollectionQuery` を1日間隔で実行します。iPhone／Apple Watchの生サンプルを単純合算しません。
- 現在の端末のタイムゾーンとGregorian Calendarを使い、月境界・夏時間に対応します。
- 月変更・画面移動・アプリ復帰・再読み込みで取得します。月変更前の非同期結果は画面へ反映しません。
- 歩数は表示中のメモリのみ。筋トレ保存データ、JSONエクスポート、外部サーバーには含めません。AsyncStorageに保存するのは表示設定だけです。
- 読み取り拒否と記録なしはHealthKitで区別できないため「—」で案内します。
- Androidではカードを表示しません。Expo Goでは独自ネイティブモジュールがないため未対応の案内になります。

## 変更ファイル

- `components/MonthlyStepsCard.tsx`: 月間サマリー、グラフ、連携、表示停止。旧日別カードを置き換え。
- `app/(tabs)/history.tsx`: サマリーをカレンダー上へ配置し、表示月を同期。
- `modules/slowrep-health/`: HealthKitの読み取り専用ローカルExpoモジュール。新規外部ライブラリなし。
- `utils/stepSummary.ts`: 月間合計・記録日の平均・月送り。
- `app.json`: HealthKit権限と利用目的。Appleの利用目的キーは読み書き両方を設定しますが、書き込み権限は要求しません。
- `docs/privacy-policy.html` / `docs/privacy-policy-en.html`: 歩数の用途と保存・送信しない方針。

## 検証方法

```sh
npx tsc --noEmit
swiftc modules/slowrep-health/ios/StepDayRange.swift tests/step-day-range.swift -o /tmp/slowrep-step-day-tests
/tmp/slowrep-step-day-tests
swiftc modules/slowrep-health/ios/StepDayRange.swift modules/slowrep-health/ios/StepMonthRange.swift tests/step-month-range.swift -o /tmp/slowrep-step-month-tests
/tmp/slowrep-step-month-tests
npx tsc utils/stepSummary.ts --outDir /tmp/slowrep-summary-tests --module commonjs --target es2020 --skipLibCheck
node tests/step-summary.cjs
git diff --check
```

集計テストは合計・平均の分母・未取得と0の区別・年越しの月送りを確認。Swiftテストは月末・うるう年・夏時間・当月の上限・未来月・不正な入力を確認します。

### 2026-09-11の実施結果

- 日別表示の初期実装では専用iPhone 14 Plus / iOS 26.3シミュレータで、初回許可画面・拒否時の「—」・表示停止・再連携・テスト用1,234歩の表示・日付変更・再起動後の設定保持を確認。
- 月間表示への変更後、型チェック・月境界テスト・合計／平均テスト・差分チェックに成功。
- 月間版シミュレータビルド `0fb67d28-7983-40d5-844e-8fb866e2cae5` が成功。9月10日4,000歩・11日1,234歩を登録し、合計5,234歩・平均2,617歩・2本の棒グラフが一致することを確認。
- サマリーから8月へ移動すると、8月31日の9,000歩だけを集計し、31日の棒グラフを表示。カレンダーから9月へ戻すと5,234歩へ戻り、どちらの月送りも同期することを確認。
- 画面: `docs/screenshots/monthly-steps-simulator.png`（人工的なテストデータ）。
- ユーザーの実際の健康データは読み取っていません。実際のiPhone／Apple Watchデータとの照合は実機確認を残します。

## 下部ボタンの幅調整

`app/(tabs)/index.tsx` の「保存メニュー」「種目を追加」をともに `flex: 1` / `minWidth: 0` に揃え、等幅にしました。高さ52の共通指定は保持しています。型チェックとiOSエクスポートが成功。月間版のネイティブシミュレータアプリへ最新の埋め込みJSをビルドし、等幅表示と両ダイアログの起動を確認しました。

画面: `docs/screenshots/balanced-actions-simulator.png`。

## 配布状況

1.0.4は審査提出済みで、その審査を取り消しません。この機能は次の1.0.5向けです。

旧署名プロファイルにHealthKitがなく配布ビルド24が失敗したため、Apple側の機能と署名プロファイルを更新済み。日別版の配布ビルド26 `95d70129-551b-474f-98ea-5d5810e8f332` は、月間表示へ変更したためアップロード対象外とします。

月間版の配布用1.0.5（27）、EASビルド `1f87ce20-6173-471c-8874-e658d29a784d` が成功。IPAのバージョン・ビルド番号・署名プロファイルのHealthKit権限・月間表示の利用目的文を検証済み。App Store Connectへのアップロードに成功（altool終了コード0）。Appleの配信状態照会でも `build-status: VALID` / `import-status: VALID` / `is-on-app-store-connect: true` を確認済み。TestFlightで実機確認してから次の審査へ進めます。プライバシーポリシーの変更は現時点でローカルのみです。

参考: [Appleの統計コレクションクエリ](https://developer.apple.com/documentation/healthkit/executing-statistics-collection-queries)、[Apple HealthKitのアクセス許可](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data)、[Expoのローカルモジュール](https://docs.expo.dev/modules/get-started/)

ボタン幅の修正を含む最終候補は1.0.5（28）、EASビルド `20e1d5a5-9e5b-4229-b47b-b62cb5cf2f10`。ビルド27の後に追加された修正なので、配布には28を使用します。EASビルドは成功し、最終IPAのバージョン・HealthKit署名権限・月間表示の利用目的を検証済み。App Store Connectへのアップロードに成功（altool終了コード0、UPLOAD SUCCEEDED）。Appleの配信状態照会でビルド28も `build-status: VALID` / `import-status: VALID` / `is-on-app-store-connect: true` を確認済み。1.0.5のApp Store審査提出・公開はまだです。
