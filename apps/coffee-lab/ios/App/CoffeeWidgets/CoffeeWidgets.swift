import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let yellow = Color(red: 1, green: 222.0/255, blue: 0)
private let brewURL = URL(string: "better-mood-coffee-lab://brew")!
private let barURL = URL(string: "better-mood-coffee-lab://bar")!
private let choiceKey = "coffeeWidget.method"

private struct MethodEntry: TimelineEntry {
    let date: Date
    let method: String
    var name: String { method == "aeropress" ? "AeroPress" : "V60" }
}
private struct MethodProvider: TimelineProvider {
    func placeholder(in context: Context) -> MethodEntry { MethodEntry(date: .now, method: "v60") }
    private func current() -> MethodEntry {
        MethodEntry(date: .now, method: UserDefaults.standard.string(forKey: choiceKey) == "aeropress" ? "aeropress" : "v60")
    }
    func getSnapshot(in context: Context, completion: @escaping (MethodEntry) -> Void) { completion(current()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<MethodEntry>) -> Void) { completion(Timeline(entries: [current()], policy: .never)) }
}

@available(iOS 17.0, *)
struct ChangeCoffeeMethod: AppIntent {
    static let title: LocalizedStringResource = "Cambiar método de Coffee Lab"
    func perform() async throws -> some IntentResult {
        let next = UserDefaults.standard.string(forKey: choiceKey) == "aeropress" ? "v60" : "aeropress"
        UserDefaults.standard.set(next, forKey: choiceKey)
        WidgetCenter.shared.reloadTimelines(ofKind: "CoffeeLabMethods")
        return .result()
    }
}

private struct MethodCard: View {
    let entry: MethodEntry
    var body: some View {
        let content = VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "cup.and.saucer").font(.title3).foregroundStyle(yellow)
            Text("Coffee Lab").font(.caption).foregroundStyle(.white.opacity(0.8))
            Text(entry.name).font(.headline).foregroundStyle(.white)
            if #available(iOS 17.0, *) {
                Button(intent: ChangeCoffeeMethod()) { Label("Cambiar", systemImage: "arrow.trianglehead.2.clockwise.rotate.90") }
                    .font(.caption2).tint(yellow)
            }
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
          .widgetURL(URL(string: "better-mood-coffee-lab://method/" + entry.method))
        if #available(iOS 17.0, *) { content.containerBackground(.black, for: .widget) }
        else { content.padding(16).background(.black) }
    }
}

struct CoffeeMethodsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CoffeeLabMethods", provider: MethodProvider()) { MethodCard(entry: $0) }
            .configurationDisplayName("Coffee Lab")
            .description("Abre V60 o AeroPress.")
            .supportedFamilies([.systemSmall])
    }
}

struct CoffeeRepeatWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CoffeeLabRepeat", provider: MethodProvider()) { _ in
            let content = VStack(alignment: .leading, spacing: 8) {
                Image(systemName: "arrow.counterclockwise.circle").font(.title2).foregroundStyle(yellow)
                Text("Coffee Lab").font(.caption).foregroundStyle(.white.opacity(0.8))
                Text("Última receta").font(.headline).foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .widgetURL(URL(string: "better-mood-coffee-lab://repeat"))
            if #available(iOS 17.0, *) { content.containerBackground(.black, for: .widget) }
            else { content.padding(16).background(.black) }
        }
        .configurationDisplayName("Última receta")
        .description("Revisa y repite la última preparación guardada.")
        .supportedFamilies([.systemSmall])
    }
}

struct CoffeeBrewActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CoffeeActivityAttributes.self) { context in
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(brewTitle(context)).font(.headline)
                    instructions(context)
                }
                Spacer()
                elapsed(context).font(.title2.monospacedDigit()).multilineTextAlignment(.trailing)
            }
            .padding(14)
            .activityBackgroundTint(.black)
            .activitySystemActionForegroundColor(yellow)
            .foregroundStyle(.white)
            .widgetURL(context.attributes.barCup == nil ? brewURL : barURL)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { badge(context) }
                DynamicIslandExpandedRegion(.trailing) { elapsed(context).monospacedDigit() }
                DynamicIslandExpandedRegion(.bottom) { instructions(context) }
            } compactLeading: {
                badge(context)
            } compactTrailing: {
                elapsed(context).monospacedDigit().frame(maxWidth: 56)
            } minimal: {
                badge(context)
            }.widgetURL(context.attributes.barCup == nil ? brewURL : barURL).keylineTint(yellow)
        }
    }
    private func brewTitle(_ context: ActivityViewContext<CoffeeActivityAttributes>) -> String {
        if let cup = context.attributes.barCup { return "Taza \(cup) · \(context.attributes.method)" }
        return context.attributes.method
    }
    @ViewBuilder private func badge(_ context: ActivityViewContext<CoffeeActivityAttributes>) -> some View {
        if let cup = context.attributes.barCup {
            Text(cup).font(.caption.bold()).foregroundStyle(yellow).accessibilityLabel(brewTitle(context))
        } else {
            Image(systemName: "cup.and.saucer").foregroundStyle(yellow)
        }
    }
    private func instructions(_ context: ActivityViewContext<CoffeeActivityAttributes>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(status(context)).font(.caption)
            if !context.isStale, !context.state.paused, let next = context.state.nextAction {
                Text("Después: \(next)").font(.caption2).foregroundStyle(.secondary).lineLimit(2)
            }
        }
    }
    private func status(_ context: ActivityViewContext<CoffeeActivityAttributes>) -> String {
        if context.state.paused { return "Guía pausada · tiempo real" }
        if context.isStale { return "Abre Coffee Lab para ver el paso" }
        return context.state.action ?? "Paso \(context.state.step) de \(context.state.total)"
    }
    private func elapsed(_ context: ActivityViewContext<CoffeeActivityAttributes>) -> some View {
        Text(timerInterval: context.attributes.startedAt...context.attributes.startedAt.addingTimeInterval(8*60*60), countsDown: false)
    }
}

@main
struct CoffeeWidgetBundle: WidgetBundle {
    var body: some Widget {
        CoffeeMethodsWidget()
        CoffeeRepeatWidget()
        CoffeeBrewActivity()
    }
}
