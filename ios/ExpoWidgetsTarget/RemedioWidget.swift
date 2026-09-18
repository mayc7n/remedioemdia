import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct RemedioWidget: Widget {
  let name: String = "RemedioWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Remédio em Dia")
    .description("Veja o próximo lembrete rapidamente.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}