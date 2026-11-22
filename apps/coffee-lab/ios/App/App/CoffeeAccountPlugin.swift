import AuthenticationServices
import Capacitor
import CryptoKit
import SafariServices
import Security

private struct AccountFailure: LocalizedError {
    let errorDescription: String?
    let code: String?
    init(_ message: String, code: String? = nil) {
        errorDescription = message
        self.code = code
    }
}

private struct LocalAccountTLS {
    let origin: URL
    let fingerprint: String

    static func configure(origin: URL?, fingerprint: String) -> LocalAccountTLS? {
        #if DEBUG
        guard let origin, origin.scheme == "https", let host = origin.host,
              let port = origin.port, (1024...65535).contains(port),
              fingerprint.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil else { return nil }
        let parts = host.split(separator: ".")
        let octets = parts.compactMap { UInt8($0) }
        guard parts.count == 4, octets.count == 4 else { return nil }
        let privateAddress = octets[0] == 10 || (octets[0] == 192 && octets[1] == 168) ||
            (octets[0] == 172 && (16...31).contains(octets[1]))
        if privateAddress { return LocalAccountTLS(origin: origin, fingerprint: fingerprint) }
        #endif
        return nil
    }
}

private final class AccountHTTPDelegate: NSObject, URLSessionTaskDelegate {
    private let localTLS: LocalAccountTLS?

    init(localTLS: LocalAccountTLS?) { self.localTLS = localTLS }

    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        guard let localTLS else { completionHandler(.performDefaultHandling, nil); return }
        let space = challenge.protectionSpace
        guard space.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              space.host == localTLS.origin.host, space.port == localTLS.origin.port,
              let trust = space.serverTrust,
              let certificates = SecTrustCopyCertificateChain(trust) as? [SecCertificate],
              let leaf = certificates.first else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        let fingerprint = SHA256.hash(data: SecCertificateCopyData(leaf) as Data)
            .map { String(format: "%02x", $0) }.joined()
        guard fingerprint == localTLS.fingerprint,
              SecTrustSetAnchorCertificates(trust, [leaf] as CFArray) == errSecSuccess,
              SecTrustSetAnchorCertificatesOnly(trust, true) == errSecSuccess,
              SecTrustEvaluateWithError(trust, nil) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        completionHandler(.useCredential, URLCredential(trust: trust))
    }

    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

@MainActor
private final class CoffeeAppleAuthorization: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private let anchor: ASPresentationAnchor
    private var controller: ASAuthorizationController?
    private var continuation: CheckedContinuation<ASAuthorizationAppleIDCredential, Error>?

    init(anchor: ASPresentationAnchor) { self.anchor = anchor }

    func authorize(nonce: String) async throws -> ASAuthorizationAppleIDCredential {
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.email]
        request.nonce = nonce
        let controller = ASAuthorizationController(authorizationRequests: [request])
        self.controller = controller
        controller.delegate = self
        controller.presentationContextProvider = self
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            controller.performRequests()
        }
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor { anchor }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            finish(.failure(AccountFailure("Apple no entregó los datos para conectar tu cuenta.")))
            return
        }
        finish(.success(credential))
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let cancelled = (error as? ASAuthorizationError)?.code == .canceled
        let message = cancelled ? "Conexión cancelada." : "Apple no pudo conectar la cuenta. Intenta de nuevo."
        finish(.failure(AccountFailure(message)))
    }

    private func finish(_ result: Result<ASAuthorizationAppleIDCredential, Error>) {
        let pending = continuation
        continuation = nil
        controller = nil
        pending?.resume(with: result)
    }
}

@MainActor
@objc(CoffeeAccountPlugin)
final class CoffeeAccountPlugin: CAPPlugin, CAPBridgedPlugin, SFSafariViewControllerDelegate, ASWebAuthenticationPresentationContextProviding {
    nonisolated let identifier = "CoffeeAccountPlugin"
    nonisolated let jsName = "CoffeeAccount"
    nonisolated let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "cloudStorage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cloudSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelConnection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise),
    ]

    private var cloudBrowser: ASWebAuthenticationSession?

    private func cloudHost(_ value: String?) -> String? {
        guard let value, let url = URLComponents(string: value),
              url.scheme == "https", let host = url.host,
              host.range(of: #"^[a-z0-9]+\.supabase\.co$"#, options: .regularExpression) != nil,
              url.port == nil, url.user == nil, url.password == nil,
              url.query == nil, url.fragment == nil, url.path.isEmpty else { return nil }
        return host
    }

    private func isCloudStorageKey(_ key: String) -> Bool {
        switch key {
        case "coffee-lab-supabase", "coffee-lab-supabase-user", "coffee-lab-supabase-code-verifier",
             "coffee-lab-supabase-flows-code-verifier":
            return true
        default:
            // Supabase PKCE stores one verifier per pending sign-in flow.
            return key.range(of: #"\Acoffee-lab-supabase-flow-[a-zA-Z0-9_-]{8,64}-code-verifier\z"#,
                             options: .regularExpression) != nil
        }
    }

    @objc nonisolated func cloudStorage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let host = cloudHost(call.getString("projectUrl")), let key = call.getString("key"),
                  isCloudStorageKey(key) else {
                call.reject("Almacenamiento de sesión inválido.")
                return
            }
            var query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: (Bundle.main.bundleIdentifier ?? "CoffeeLab") + ".supabase." + host,
                kSecAttrAccount as String: key,
            ]
            var result: OSStatus
            switch call.getString("action") {
            case "read":
                query[kSecReturnData as String] = true
                query[kSecMatchLimit as String] = kSecMatchLimitOne
                var raw: CFTypeRef?
                result = SecItemCopyMatching(query as CFDictionary, &raw)
                if result == errSecSuccess, let data = raw as? Data, let value = String(data: data, encoding: .utf8) {
                    call.resolve(["value": value])
                    return
                }
                if result == errSecItemNotFound {
                    call.resolve(["value": NSNull()])
                    return
                }
                call.reject("No se pudo leer la sesión en el iPhone.")
                return
            case "write":
                guard let value = call.getString("value"), value.utf8.count <= 131072 else {
                    call.reject("Sesión inválida.")
                    return
                }
                let data = Data(value.utf8)
                result = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
                if result == errSecItemNotFound {
                    query[kSecValueData as String] = data
                    query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
                    result = SecItemAdd(query as CFDictionary, nil)
                }
            case "remove": result = SecItemDelete(query as CFDictionary)
            default: call.reject("Operación de sesión inválida."); return
            }
            if result == errSecSuccess || result == errSecItemNotFound { call.resolve() }
            else { call.reject("No se pudo acceder a la sesión en el iPhone.") }
        }
    }

    @objc nonisolated func cloudSignIn(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard cloudBrowser == nil, let host = cloudHost(call.getString("projectUrl")),
                  let raw = call.getString("url"), let url = URLComponents(string: raw),
                  url.scheme == "https", url.host == host, url.port == nil,
                  url.user == nil, url.password == nil, url.path == "/auth/v1/authorize",
                  let request = url.url else {
                call.reject("No se pudo abrir el acceso seguro.")
                return
            }
            let session = ASWebAuthenticationSession(url: request, callbackURLScheme: "better-mood-coffee-lab") { [weak self] callback, _ in
                Task { @MainActor in
                    self?.cloudBrowser = nil
                    guard let callback, let parts = URLComponents(url: callback, resolvingAgainstBaseURL: false),
                          parts.scheme == "better-mood-coffee-lab", parts.host == "auth", parts.path == "/callback",
                          let code = parts.queryItems?.first(where: { $0.name == "code" })?.value, !code.isEmpty else {
                        call.reject("Se canceló el acceso o no se recibió el código.")
                        return
                    }
                    call.resolve(["code": code])
                }
            }
            session.presentationContextProvider = self
            cloudBrowser = session
            if !session.start() {
                cloudBrowser = nil
                call.reject("No se pudo abrir el acceso seguro.")
            }
        }
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated { bridge?.viewController?.view.window ?? ASPresentationAnchor() }
    }

    private struct Grant {
        let code: String
        let secret: String
        let interval: Int
        let deadline: TimeInterval
    }
    private let clientID = "coffee-lab-ios-preview"
    private var grant: Grant?
    private var connection: Task<Void, Never>?
    private var preparing = false
    private var signingInWithApple = false
    private lazy var http: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpShouldSetCookies = false
        configuration.httpCookieStorage = nil
        configuration.urlCache = nil
        configuration.timeoutIntervalForRequest = 15
        return URLSession(configuration: configuration, delegate: AccountHTTPDelegate(localTLS: localTLS), delegateQueue: nil)
    }()

    private var configuredOrigin: URL? {
        guard let configured = Bundle.main.object(forInfoDictionaryKey: "CoffeeAccountsOrigin") as? String,
              let value = URLComponents(string: configured), let host = value.host,
              value.user == nil, value.password == nil, value.query == nil, value.fragment == nil,
              value.path.isEmpty || value.path == "/" else { return nil }
        #if DEBUG && targetEnvironment(simulator)
        if value.scheme == "http", host == "127.0.0.1" { return value.url }
        #endif
        return value.scheme == "https" && host.contains(".") ? value.url : nil
    }

    private var configuredPin: String {
        Bundle.main.object(forInfoDictionaryKey: "CoffeeAccountsTLSPin") as? String ?? ""
    }

    private var localTLS: LocalAccountTLS? {
        LocalAccountTLS.configure(origin: configuredOrigin, fingerprint: configuredPin)
    }

    private var origin: URL? {
        configuredPin.isEmpty ? configuredOrigin : localTLS?.origin
    }

    private func canSignInWithApple(clientId: String?) -> Bool {
        guard let clientId, clientId == Bundle.main.bundleIdentifier,
              Bundle.main.object(forInfoDictionaryKey: "CoffeeNativeAppleEnabled") as? String == "YES" else { return false }
        return origin?.scheme == "https"
    }

    private func endpoint(_ path: String) throws -> URL {
        guard let origin, let url = URL(string: "/coffee-lab/api/" + path, relativeTo: origin)?.absoluteURL else {
            throw AccountFailure("La conexión de cuentas aún no está configurada.")
        }
        return url
    }

    private var keychainQuery: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: (Bundle.main.bundleIdentifier ?? "CoffeeLab") + ".accounts",
         kSecAttrAccount as String: origin?.absoluteString ?? ""]
    }

    private func token() throws -> String? {
        var query = keychainQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data, let token = String(data: data, encoding: .utf8) else {
            throw AccountFailure("Desbloquea el iPhone para acceder a tu sesión.")
        }
        return token
    }

    private func saveToken(_ token: String) throws {
        let data = Data(token.utf8)
        let attributes = [kSecValueData as String: data]
        var result = SecItemUpdate(keychainQuery as CFDictionary, attributes as CFDictionary)
        if result == errSecItemNotFound {
            var query = keychainQuery
            query[kSecValueData as String] = data
            query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            result = SecItemAdd(query as CFDictionary, nil)
        }
        guard result == errSecSuccess else { throw AccountFailure("No se pudo guardar la sesión en el iPhone.") }
    }

    private func clearToken() throws {
        let result = SecItemDelete(keychainQuery as CFDictionary)
        guard result == errSecSuccess || result == errSecItemNotFound else {
            throw AccountFailure("Desbloquea el iPhone y vuelve a cerrar sesión.")
        }
    }

    private func send(_ path: String, body: [String: Any]? = nil, token: String? = nil,
                      owner: String? = nil) async throws -> (Int, [String: Any]) {
        var request = URLRequest(url: try endpoint(path), cachePolicy: .reloadIgnoringLocalCacheData)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        if let owner { request.setValue(owner, forHTTPHeaderField: "X-Coffee-Account") }
        if let body {
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await http.data(for: request)
        guard let response = response as? HTTPURLResponse,
              response.mimeType == "application/json" else {
            throw AccountFailure("El servidor de cuentas no respondió.")
        }
        let json = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
        return (response.statusCode, json as? [String: Any] ?? [:])
    }

    private func user(_ value: [String: Any]) -> [String: String]? {
        guard let user = value["user"] as? [String: Any], let id = user["id"] as? String,
              let email = user["email"] as? String else { return nil }
        return ["id": id, "email": email, "name": user["name"] as? String ?? ""]
    }

    private func perform(_ call: CAPPluginCall, _ operation: @escaping () async throws -> [String: Any]) {
        Task {
            do { call.resolve(try await operation()) }
            catch let error as AccountFailure { call.reject(error.localizedDescription, error.code) }
            catch { call.reject("Se perdió la conexión. Intenta de nuevo.", "CONNECTION") }
        }
    }

    @objc nonisolated func status(_ call: CAPPluginCall) {
        Task { @MainActor in
            perform(call) {
                guard self.origin != nil else { return ["providers": [], "configured": false] }
                let (status, caps) = try await self.send("capabilities")
                guard status == 200, let providers = caps["providers"] as? [String] else {
                    throw AccountFailure("El servidor de cuentas no respondió.")
                }
                var result: [String: Any] = ["providers": providers, "configured": true,
                    "nativeApple": self.canSignInWithApple(clientId: caps["nativeAppleClientId"] as? String),
                    "local": caps["local"] as? Bool == true]
                if let token = try self.token() {
                    let (code, session) = try await self.send("auth/get-session", token: token)
                    if let user = self.user(session), code == 200 { result["user"] = user }
                    else if code == 200 || code == 401 { try self.clearToken() }
                    else { throw AccountFailure("No se pudo revisar la sesión.") }
                }
                return result
            }
        }
    }

    @objc nonisolated func signInWithApple(_ call: CAPPluginCall) {
        Task { @MainActor in
            perform(call) {
                guard !self.signingInWithApple, !self.preparing, self.connection == nil,
                      self.canSignInWithApple(clientId: Bundle.main.bundleIdentifier),
                      let presenter = self.bridge?.viewController, presenter.presentedViewController == nil,
                      let anchor = presenter.view.window else {
                    throw AccountFailure("El acceso con Apple aún no está disponible.")
                }
                self.signingInWithApple = true
                defer { self.signingInWithApple = false }
                let (challengeStatus, challenge) = try await self.send("auth/apple-native/challenge", body: [:])
                guard challengeStatus == 200, self.canSignInWithApple(clientId: challenge["clientId"] as? String),
                      let nonce = challenge["nonce"] as? String,
                      nonce.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil else {
                    throw AccountFailure("Apple no pudo iniciar la conexión. Intenta de nuevo.")
                }
                let authorization = CoffeeAppleAuthorization(anchor: anchor)
                let credential = try await authorization.authorize(nonce: nonce)
                guard let codeData = credential.authorizationCode, let code = String(data: codeData, encoding: .utf8),
                      let identityData = credential.identityToken, let identityToken = String(data: identityData, encoding: .utf8) else {
                    throw AccountFailure("Apple no entregó los datos para conectar tu cuenta.")
                }
                let (status, result) = try await self.send("auth/apple-native/sign-in", body: [
                    "nonce": nonce, "code": code, "identityToken": identityToken,
                ])
                guard status == 200, let token = result["token"] as? String, !token.isEmpty else {
                    throw AccountFailure(result["message"] as? String ?? "Apple no pudo confirmar el acceso. Intenta de nuevo.")
                }
                return ["user": try await self.verifyAndSaveSession(token)]
            }
        }
    }

    @objc nonisolated func prepare(_ call: CAPPluginCall) {
        Task { @MainActor in
            perform(call) {
                guard self.connection == nil, !self.preparing, !self.signingInWithApple else { throw AccountFailure("Ya hay una conexión en curso.") }
                self.preparing = true
                defer { self.preparing = false }
                let (status, value) = try await self.send("auth/device/code", body: ["client_id": self.clientID])
                guard status == 200, let code = value["user_code"] as? String,
                      code.range(of: "^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$", options: .regularExpression) != nil,
                      let secret = value["device_code"] as? String, !secret.isEmpty,
                      let interval = value["interval"] as? Int, (5...60).contains(interval),
                      let lifetime = value["expires_in"] as? Int, (1...300).contains(lifetime) else {
                    throw AccountFailure("No se pudo generar un código. Intenta de nuevo.")
                }
                self.grant = Grant(code: code, secret: secret, interval: interval,
                                   deadline: ProcessInfo.processInfo.systemUptime + Double(lifetime))
                return ["code": code, "approveOnMac": self.localTLS != nil]
            }
        }
    }

    @objc nonisolated func connect(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let grant, !preparing, !signingInWithApple, connection == nil,
                  grant.deadline > ProcessInfo.processInfo.systemUptime, let origin else {
                call.reject("Genera otro código e intenta de nuevo.")
                return
            }
            let safari: SFSafariViewController?
            if localTLS == nil {
                guard let presenter = bridge?.viewController, presenter.presentedViewController == nil,
                      let url = URL(string: "/coffee-lab/?connect_device=1&user_code=" + grant.code,
                                    relativeTo: origin)?.absoluteURL else {
                    call.reject("Genera otro código e intenta de nuevo.")
                    return
                }
                let browser = SFSafariViewController(url: url)
                browser.delegate = self
                browser.dismissButtonStyle = .close
                presenter.present(browser, animated: true)
                safari = browser
            } else {
                safari = nil
            }
            self.grant = nil
            connection = Task {
                defer { connection = nil }
                do {
                    let user = try await finish(grant)
                    safari?.dismiss(animated: true)
                    call.resolve(["user": user])
                } catch is CancellationError {
                    call.reject("Conexión cancelada.")
                } catch let error as AccountFailure {
                    safari?.dismiss(animated: true)
                    call.reject(error.localizedDescription)
                } catch {
                    safari?.dismiss(animated: true)
                    if Task.isCancelled { call.reject("Conexión cancelada.") }
                    else { call.reject("Se perdió la conexión. Genera otro código.", "CONNECTION") }
                }
            }
        }
    }

    @objc nonisolated func cancelConnection(_ call: CAPPluginCall) {
        Task { @MainActor in
            grant = nil
            connection?.cancel()
            call.resolve()
        }
    }

    private func finish(_ grant: Grant) async throws -> [String: String] {
        var delay = grant.interval
        while ProcessInfo.processInfo.systemUptime + Double(delay) < grant.deadline {
            try await Task.sleep(nanoseconds: UInt64(delay) * 1_000_000_000)
            try Task.checkCancellation()
            let (status, value) = try await send("auth/device/token", body: [
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "device_code": grant.secret, "client_id": clientID,
            ])
            if status == 200, value["token_type"] as? String == "Bearer",
               let token = value["access_token"] as? String, !token.isEmpty {
                return try await verifyAndSaveSession(token)
            }
            switch value["error"] as? String {
            case "authorization_pending": continue
            case "slow_down": delay += 5
            case "access_denied": throw AccountFailure("Conexión rechazada.")
            case "expired_token": throw AccountFailure("El código venció. Genera otro.")
            default: throw AccountFailure("No se pudo confirmar la conexión.")
            }
        }
        throw AccountFailure("El código venció. Genera otro.")
    }

    private func verifyAndSaveSession(_ token: String) async throws -> [String: String] {
        let (status, session) = try await send("auth/get-session", token: token)
        try Task.checkCancellation()
        guard status == 200, let user = user(session) else {
            throw AccountFailure("La sesión no se pudo confirmar.")
        }
        try saveToken(token)
        return user
    }

    nonisolated func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        Task { @MainActor in connection?.cancel() }
    }

    @objc nonisolated func request(_ call: CAPPluginCall) {
        Task { @MainActor in
            perform(call) {
                guard let path = call.getString("path"),
                      ["recipes", "recipe-library", "auth/sign-out", "auth/delete-user"].contains(path),
                      let token = try self.token() else { throw AccountFailure("Inicia sesión para continuar.") }
                let recipeRequest = path == "recipes" || path == "recipe-library"
                let body = recipeRequest ? call.getObject("body") : [:]
                let (status, value) = try await self.send(path, body: body, token: token, owner: call.getString("owner"))
                if path == "auth/sign-out", status == 200 || status == 401 {
                    try self.clearToken()
                    return [:]
                }
                guard status == 200 else {
                    if recipeRequest, status >= 500 { throw URLError(.badServerResponse) }
                    if path == "auth/delete-user", value["code"] as? String == "SESSION_EXPIRED" {
                        throw AccountFailure("Vuelve a iniciar sesión y confirma otra vez.")
                    }
                    let message = (value["error"] as? String) ?? (value["message"] as? String) ?? "No se pudo completar."
                    throw AccountFailure(message, code: value["code"] as? String)
                }
                if path == "auth/delete-user", value["success"] as? Bool == true { try self.clearToken() }
                return value
            }
        }
    }
}
