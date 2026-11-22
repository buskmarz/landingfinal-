import UIKit
import Capacitor
import UniformTypeIdentifiers
import CoreSpotlight
import AppIntents
import ActivityKit
import AVFoundation

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CoffeeViewController()
        window?.makeKeyAndVisible()
        CoffeeRoute.indexMethods()
        connectionOptions.urlContexts.forEach { CoffeeRoute.open($0.url) }
        connectionOptions.userActivities.forEach { CoffeeRoute.open($0) }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        URLContexts.forEach { CoffeeRoute.open($0.url) }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        CoffeeRoute.open(userActivity)
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

final class CoffeeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(CoffeeSpeechPlugin())
        bridge?.registerPluginInstance(CoffeeFilesPlugin())
        bridge?.registerPluginInstance(CoffeeLinksPlugin())
        bridge?.registerPluginInstance(CoffeeAccountPlugin())
        if #available(iOS 16.2, *) { bridge?.registerPluginInstance(CoffeeActivityPlugin()) }
    }
}

@objc(CoffeeSpeechPlugin)
final class CoffeeSpeechPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    let identifier = "CoffeeSpeechPlugin"
    let jsName = "CoffeeSpeech"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]
    private let synthesizer = AVSpeechSynthesizer()
    private var currentUtterance: AVSpeechUtterance?

    private func releaseAudio() {
        guard currentUtterance != nil else { return }
        currentUtterance = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        if currentUtterance === utterance { releaseAudio() }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        if currentUtterance === utterance { releaseAudio() }
    }

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else {
            call.reject("Falta la indicación.")
            return
        }
        DispatchQueue.main.async {
            guard let voice = AVSpeechSynthesisVoice(language: "es-MX") ?? AVSpeechSynthesisVoice(language: "es-ES") else {
                call.reject("Voz en español no disponible.")
                return
            }
            self.synthesizer.stopSpeaking(at: .immediate)
            let session = AVAudioSession.sharedInstance()
            do {
                try session.setCategory(.playback, mode: .voicePrompt, options: .duckOthers)
                try session.setActive(true)
            } catch {
                self.releaseAudio()
                call.reject("El iPhone no pudo activar la salida de voz.")
                return
            }
            self.synthesizer.delegate = self
            self.synthesizer.usesApplicationAudioSession = true
            let phrase = AVSpeechUtterance(string: text)
            self.currentUtterance = phrase
            phrase.voice = voice
            self.synthesizer.speak(phrase)
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.synthesizer.stopSpeaking(at: .immediate)
            self.releaseAudio()
            call.resolve()
        }
    }
}

@objc(CoffeeFilesPlugin)
final class CoffeeFilesPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    let identifier = "CoffeeFilesPlugin"
    let jsName = "CoffeeFiles"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareJson", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickJson", returnType: CAPPluginReturnPromise)
    ]
    private var pickerCall: CAPPluginCall?
    private let maxBytes = 25 * 1024 * 1024

    @objc func shareJson(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), let name = call.getString("name"),
              name.range(of: #"^[a-zA-Z0-9_-]{1,90}\.json$"#, options: .regularExpression) != nil,
              let data = text.data(using: .utf8), data.count <= maxBytes else {
            call.reject("Usa una copia JSON de hasta 25 MB.")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let presenter = self?.bridge?.viewController, presenter.presentedViewController == nil else {
                call.reject("Cierra el panel abierto e inténtalo otra vez.")
                return
            }
            let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
            let file = folder.appendingPathComponent(name)
            do {
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: false)
                try data.write(to: file, options: [.atomic, .completeFileProtection])
                let sheet = UIActivityViewController(activityItems: [file], applicationActivities: nil)
                if let popover = sheet.popoverPresentationController {
                    popover.sourceView = presenter.view
                    popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
                }
                sheet.completionWithItemsHandler = { _, completed, _, error in
                    try? FileManager.default.removeItem(at: folder)
                    if error != nil { call.reject("No se pudo compartir la copia.") }
                    else { call.resolve(["shared": completed]) }
                }
                presenter.present(sheet, animated: true)
            } catch {
                try? FileManager.default.removeItem(at: folder)
                call.reject("No se pudo preparar la copia.")
            }
        }
    }

    @objc func pickJson(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.pickerCall == nil, let presenter = self.bridge?.viewController,
                  presenter.presentedViewController == nil else {
                call.reject("Cierra el panel abierto e inténtalo otra vez.")
                return
            }
            self.pickerCall = call
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json], asCopy: true)
            picker.delegate = self
            presenter.present(picker, animated: true)
        }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pickerCall?.resolve(["cancelled": true])
        pickerCall = nil
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = pickerCall else { return }
        pickerCall = nil
        guard let url = urls.first else { call.resolve(["cancelled": true]); return }
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        do {
            let values = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
            guard values.isRegularFile == true, let size = values.fileSize, size <= maxBytes else {
                call.reject("Usa un archivo JSON de hasta 25 MB."); return
            }
            let data = try Data(contentsOf: url)
            guard data.count <= maxBytes, let text = String(data: data, encoding: .utf8) else {
                call.reject("No se pudo leer el JSON."); return
            }
            call.resolve(["text": text])
        } catch { call.reject("No se pudo abrir el archivo.") }
    }
}

enum CoffeeRoute {
    static let event = Notification.Name("CoffeeLabOpenMethod")
    static let key = "coffeeLab.pendingMethod"
    static let domain = "coffee-lab.methods"
    static let methods = ["v60": "V60", "aeropress": "AeroPress", "french": "Prensa francesa",
                          "chemex": "Chemex", "kalita": "Kalita Wave", "moka": "Moka",
                          "espresso": "Espresso", "cold": "Cold brew"]

    static func supports(_ route: String) -> Bool {
        methods[route] != nil || route == "brew" || route == "repeat" || route == "bar"
    }

    static func set(_ method: String) {
        guard supports(method) else { return }
        UserDefaults.standard.set(method, forKey: key)
        NotificationCenter.default.post(name: event, object: nil)
    }

    static func open(_ url: URL) {
        guard url.scheme == "better-mood-coffee-lab" else { return }
        if let host = url.host, ["brew", "repeat", "bar"].contains(host), url.path.isEmpty {
            set(host)
            return
        }
        guard url.host == "method", url.pathComponents.count == 2 else { return }
        set(url.lastPathComponent)
    }

    static func open(_ activity: NSUserActivity) {
        guard activity.activityType == CSSearchableItemActionType,
              let id = activity.userInfo?[CSSearchableItemActivityIdentifier] as? String,
              id.hasPrefix(domain + ".") else { return }
        set(String(id.dropFirst(domain.count + 1)))
    }

    static func indexMethods() {
        guard CSSearchableIndex.isIndexingAvailable() else { return }
        let items = methods.map { method, title in
            let metadata = CSSearchableItemAttributeSet(contentType: .text)
            metadata.title = title + " · Coffee Lab"
            metadata.contentDescription = "Abrir la guía de preparación de Better Mood."
            metadata.keywords = ["café", "coffee lab", title]
            return CSSearchableItem(uniqueIdentifier: domain + "." + method, domainIdentifier: domain, attributeSet: metadata)
        }
        CSSearchableIndex.default().indexSearchableItems(items)
    }
}

@objc(CoffeeLinksPlugin)
final class CoffeeLinksPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "CoffeeLinksPlugin"
    let jsName = "CoffeeLinks"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "takeMethod", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openCafeDirections", returnType: CAPPluginReturnPromise)
    ]

    @objc func openCafeDirections(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            var directions = URLComponents()
            directions.scheme = "https"
            directions.host = "maps.apple.com"
            directions.queryItems = [URLQueryItem(name: "daddr",
                value: "Better Mood Coffee, Av. 13 Poniente 2302, Puebla, México")]
            guard let url = directions.url else {
                call.reject("No se pudo abrir Mapas.")
                return
            }
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened { call.resolve() } else { call.reject("No se pudo abrir Mapas.") }
            }
        }
    }

    override func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(onOpen), name: CoffeeRoute.event, object: nil)
    }
    deinit { NotificationCenter.default.removeObserver(self) }

    @objc private func onOpen() {
        DispatchQueue.main.async { [weak self] in self?.notifyListeners("openMethod", data: [:]) }
    }

    @objc func takeMethod(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let method = UserDefaults.standard.string(forKey: CoffeeRoute.key), CoffeeRoute.supports(method) else {
                call.resolve()
                return
            }
            UserDefaults.standard.removeObject(forKey: CoffeeRoute.key)
            call.resolve(["method": method])
        }
    }
}

@available(iOS 16.0, *)
struct OpenCoffeeV60: AppIntent {
    static let title: LocalizedStringResource = "Abrir guía V60"
    static let description = IntentDescription("Abre V60 para revisar la receta antes de preparar.")
    static let openAppWhenRun = true

    @MainActor func perform() async throws -> some IntentResult {
        CoffeeRoute.set("v60")
        return .result()
    }
}

@available(iOS 16.0, *)
struct RepeatLastCoffee: AppIntent {
    static let title: LocalizedStringResource = "Repetir última receta"
    static let description = IntentDescription("Abre las cantidades de tu última preparación guardada para que las revises.")
    static let openAppWhenRun = true

    @MainActor func perform() async throws -> some IntentResult {
        CoffeeRoute.set("repeat")
        return .result()
    }
}

@available(iOS 16.0, *)
struct CoffeeShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: OpenCoffeeV60(), phrases: ["Open V60 in \(.applicationName)", "Show the V60 guide in \(.applicationName)"],
                    shortTitle: "Guía V60", systemImageName: "cup.and.saucer")
        AppShortcut(intent: RepeatLastCoffee(), phrases: ["Repeat my last recipe in \(.applicationName)"],
                    shortTitle: "Última receta", systemImageName: "arrow.counterclockwise.circle")
    }
}

@available(iOS 16.2, *)
@objc(CoffeeActivityPlugin)
final class CoffeeActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "CoffeeActivityPlugin"
    let jsName = "CoffeeActivity"
    let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)]
    @MainActor private var queue: Task<Void, Never>?
    @MainActor private var startedIDs = Set<String>()

    @objc func update(_ call: CAPPluginCall) {
        let sessions = call.getArray("sessions", JSObject.self) ?? call.getObject("session").map { [$0] } ?? []
        DispatchQueue.main.async {
            let prior = self.queue
            self.queue = Task { @MainActor in
                await prior?.value
                await self.apply(sessions)
                call.resolve()
            }
        }
    }

    private struct BrewUpdate {
        let attributes: CoffeeActivityAttributes
        let content: ActivityContent<CoffeeActivityAttributes.ContentState>
    }

    private func brewUpdate(_ session: JSObject) -> BrewUpdate? {
        guard let id = session["id"] as? String, !id.isEmpty, id.count <= 200,
              let method = session["method"] as? String, let name = CoffeeRoute.methods[method],
              let start = session["startedAt"] as? Double, start.isFinite,
              let step = session["step"] as? Int, let total = session["total"] as? Int,
              (1...20).contains(total), (1...total).contains(step) else { return nil }
        let began = Date(timeIntervalSince1970: start/1000)
        guard began.timeIntervalSinceNow < 60, began.timeIntervalSinceNow > -8*60*60 else { return nil }
        let staleAt = (session["staleAt"] as? Double).flatMap { $0.isFinite ? Date(timeIntervalSince1970: $0/1000) : nil }
        let barCup = (session["barCup"] as? String).flatMap { ["A", "B"].contains($0) ? $0 : nil }
        let content = ActivityContent(state: CoffeeActivityAttributes.ContentState(
            step: step,
            total: total,
            paused: session["paused"] as? Bool ?? false,
            action: (session["action"] as? String).map { String($0.prefix(65)) },
            nextAction: (session["nextAction"] as? String).map { String($0.prefix(55)) }
        ), staleDate: staleAt)
        return BrewUpdate(attributes: CoffeeActivityAttributes(sessionID: id, method: name, startedAt: began, barCup: barCup), content: content)
    }

    @MainActor private func apply(_ sessions: [JSObject]) async {
        var desiredIDs = Set<String>()
        let updates = sessions.prefix(3).compactMap(brewUpdate).filter { desiredIDs.insert($0.attributes.sessionID).inserted }
        startedIDs.formIntersection(desiredIDs)
        var existing: [String: Activity<CoffeeActivityAttributes>] = [:]
        for activity in Activity<CoffeeActivityAttributes>.activities {
            let id = activity.attributes.sessionID
            if desiredIDs.contains(id) && existing[id] == nil {
                existing[id] = activity
            } else {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
        for update in updates {
            let id = update.attributes.sessionID
            if let activity = existing[id] {
                startedIDs.insert(id)
                await activity.update(update.content)
            } else if !startedIDs.contains(id) && ActivityAuthorizationInfo().areActivitiesEnabled && UIApplication.shared.applicationState == .active {
                do {
                    _ = try Activity.request(attributes: update.attributes, content: update.content)
                    startedIDs.insert(id)
                } catch { /* Brewing remains available when Live Activities are unavailable. */ }
            }
        }
    }
}
