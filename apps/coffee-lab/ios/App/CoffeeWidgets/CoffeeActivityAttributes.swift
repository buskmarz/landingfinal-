import ActivityKit
import Foundation

@available(iOS 16.2, *)
struct CoffeeActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let step: Int
        let total: Int
        let paused: Bool
        let action: String?
        let nextAction: String?
    }
    let sessionID: String
    let method: String
    let startedAt: Date
    let barCup: String?
}
