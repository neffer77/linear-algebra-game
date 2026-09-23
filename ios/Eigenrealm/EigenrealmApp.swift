//  EigenrealmApp.swift — the whole iOS app.
//
//  A window with the game in it. index.html is not stored in this folder: the
//  "Copy the game in" build phase takes it from the repository root at build
//  time (see ../copy-web.sh), so rebuilding is all it takes to put the current
//  game on the phone, and there is never a second copy to drift.
//
//  What the app adds is only what a web page cannot do for itself in here:
//
//    - A stable origin. The game is served from eigenrealm://localhost rather
//      than from a file URL, because the knights live in localStorage and
//      IndexedDB, and a file URL is not somewhere WebKit reliably keeps either.
//    - Haptics and the clipboard, bridged from Bridge.js.
//    - Dialogs. A bare web view answers every confirm() with "no" and every
//      prompt() with nothing, and the game names, renames and erases knights
//      with exactly those two. Without the handlers below you could not even
//      name a knight, and nothing on screen would say why.

import SwiftUI
import UIKit
import WebKit
import UniformTypeIdentifiers

@main
struct EigenrealmApp: App {
    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()                 // the game's CSS handles the notch itself
                .background(Color.gameNight.ignoresSafeArea())
                .preferredColorScheme(.dark)       // light status-bar text over the dark game
        }
    }
}

extension Color {
    static let gameNight = Color(red: 0x12 / 255.0, green: 0x0c / 255.0, blue: 0x1f / 255.0)
}

extension UIColor {
    static let gameNight = UIColor(red: 0x12 / 255.0, green: 0x0c / 255.0, blue: 0x1f / 255.0, alpha: 1)
}

// MARK: - The web view

struct GameView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()       // persistent: this is where the knights live
        config.setURLSchemeHandler(GameSchemeHandler(), forURLScheme: GameSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let content = config.userContentController
        if let url = Bundle.main.url(forResource: "Bridge", withExtension: "js"),
           let source = try? String(contentsOf: url, encoding: .utf8) {
            content.addUserScript(WKUserScript(source: source,
                                               injectionTime: .atDocumentStart,
                                               forMainFrameOnly: true))
        }
        for name in Coordinator.channels {
            content.add(context.coordinator, name: name)
        }

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        // No white flash before the first paint: the view is the game's colour.
        web.isOpaque = false
        web.backgroundColor = .gameNight
        web.scrollView.backgroundColor = .gameNight
        // Let env(safe-area-inset-*) reach the page instead of UIKit padding it.
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsBackForwardNavigationGestures = false
        #if DEBUG
        // Safari on the Mac → Develop → your iPhone, to inspect the game live.
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        web.load(URLRequest(url: GameSchemeHandler.start))
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {}

    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) {
        for name in Coordinator.channels {
            web.configuration.userContentController.removeScriptMessageHandler(forName: name)
        }
    }
}

// MARK: - Serving the game

/// Serves the bundled game from eigenrealm://localhost/…, which gives it a
/// real, stable origin for its saves — the same arrangement Capacitor uses for
/// the same reason.
@MainActor
final class GameSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "eigenrealm"
    static let start = URL(string: "eigenrealm://localhost/index.html")!

    private let root: URL? =
        Bundle.main.resourceURL?.appendingPathComponent("web", isDirectory: true).standardizedFileURL

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else {
            task.didFailWithError(URLError(.badURL))
            return
        }
        guard let root = root, let file = resolve(url, under: root),
              let data = try? Data(contentsOf: file) else {
            respond(task, url: url, status: 404, type: "text/plain; charset=utf-8",
                    data: Data("Not part of the game.".utf8))
            return
        }
        respond(task, url: url, status: 200, type: mimeType(for: file), data: data)
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        // Every response is written synchronously in start, so there is never
        // anything in flight to cancel.
    }

    private func resolve(_ url: URL, under root: URL) -> URL? {
        var path = url.path
        if path.isEmpty || path.hasSuffix("/") { path += "index.html" }
        let relative = String(path.drop(while: { $0 == "/" }))
        let file = root.appendingPathComponent(relative).standardizedFileURL
        // Never serve anything outside web/, whatever a URL says.
        guard file.path.hasPrefix(root.path + "/") else { return nil }
        return file
    }

    private func mimeType(for file: URL) -> String {
        let ext = file.pathExtension.lowercased()
        let known = ["html": "text/html", "js": "text/javascript", "css": "text/css",
                     "json": "application/json", "webmanifest": "application/manifest+json",
                     "png": "image/png", "svg": "image/svg+xml"]
        let base = known[ext] ?? UTType(filenameExtension: ext)?.preferredMIMEType
            ?? "application/octet-stream"
        return base.hasPrefix("text/") || base.hasSuffix("json") ? base + "; charset=utf-8" : base
    }

    private func respond(_ task: WKURLSchemeTask, url: URL, status: Int, type: String, data: Data) {
        let headers = ["Content-Type": type,
                       "Content-Length": String(data.count),
                       "Cache-Control": "no-cache"]
        guard let response = HTTPURLResponse(url: url, statusCode: status,
                                             httpVersion: "HTTP/1.1", headerFields: headers) else {
            task.didFailWithError(URLError(.cannotParseResponse))
            return
        }
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }
}

// MARK: - What the page asks of the app

@MainActor
final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    static let channels = ["haptic", "clipboard"]

    // Counted for the CI probe only; see Probe below.
    var hapticsReceived = 0
    var lastCopied: String?

    func userContentController(_ controller: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        switch message.name {
        case "haptic":
            hapticsReceived += 1
            Haptics.play(message.body)
        case "clipboard":
            if let text = message.body as? String {
                UIPasteboard.general.string = text
                lastCopied = text
            }
        default:
            break
        }
    }

    // MARK: navigation — the game stays in, everything else goes to Safari

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, let scheme = url.scheme?.lowercased() else {
            decisionHandler(.cancel)
            return
        }
        if scheme == GameSchemeHandler.scheme || scheme == "about" || scheme == "blob" || scheme == "data" {
            decisionHandler(.allow)
            return
        }
        if ["http", "https", "mailto", "tel"].contains(scheme) {
            UIApplication.shared.open(url)
        }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if Probe.enabled { Probe.run(on: webView, coordinator: self) }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        // target="_blank" and window.open: never a second web view.
        if let url = navigationAction.request.url, url.scheme != GameSchemeHandler.scheme {
            UIApplication.shared.open(url)
        }
        return nil
    }

    /// If the web content process dies (memory pressure while backgrounded),
    /// reload rather than leave a blank screen. The saves are on disk.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.load(URLRequest(url: GameSchemeHandler.start))
    }

    // MARK: dialogs — the game names, renames and erases knights with these

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        if Probe.enabled { completionHandler(); return }
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        show(alert, over: webView, orElse: completionHandler)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        if Probe.enabled { completionHandler(true); return }
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        show(alert, over: webView) { completionHandler(false) }
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        if Probe.enabled { completionHandler(Probe.answer); return }
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { field in
            field.text = defaultText
            field.autocapitalizationType = .words
            field.clearButtonMode = .whileEditing
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak alert] _ in
            completionHandler(alert?.textFields?.first?.text ?? "")
        })
        show(alert, over: webView) { completionHandler(nil) }
    }

    /// WebKit raises if a panel's completion handler is never called, so a
    /// dialog that cannot be shown must still answer — with the refusal.
    private func show(_ alert: UIAlertController, over webView: WKWebView,
                      orElse refuse: @escaping () -> Void) {
        guard var top = webView.window?.rootViewController else { refuse(); return }
        while let next = top.presentedViewController { top = next }
        top.present(alert, animated: true)
    }
}

// MARK: - Haptics

/// Plays a navigator.vibrate pattern — alternating on/off durations in
/// milliseconds — as impacts. A phone cannot buzz for a length of time the way
/// an Android motor can, so each "on" pulse becomes one tap, weighted by how
/// long the game asked for it to last.
enum Haptics {
    static func play(_ body: Any) {
        let pattern: [Double]
        if let list = body as? [NSNumber] {
            pattern = list.map { $0.doubleValue }
        } else if let one = body as? NSNumber {
            pattern = [one.doubleValue]
        } else {
            return
        }
        var at = 0.0
        for (index, raw) in pattern.prefix(32).enumerated() {
            let ms = max(0, min(raw, 5000))
            if index % 2 == 0 && ms > 0 {
                let style = weight(ms)
                DispatchQueue.main.asyncAfter(deadline: .now() + at / 1000) {
                    UIImpactFeedbackGenerator(style: style).impactOccurred()
                }
            }
            at += ms
        }
    }

    static func weight(_ ms: Double) -> UIImpactFeedbackGenerator.FeedbackStyle {
        ms < 18 ? .light : (ms < 35 ? .medium : .heavy)
    }
}

// MARK: - CI probe

/// Continuous integration launches the app in the iOS Simulator with
/// EIGENREALM_PROBE=1 and reads what this writes to stderr. It is the proof
/// that the things this file exists for actually work on a real WebKit: the
/// game loaded over the custom scheme, storage persists across launches, the
/// bridge reaches Swift, and the dialogs are wired. On a phone the variable
/// is never set, and none of this runs.
@MainActor
enum Probe {
    static let enabled = ProcessInfo.processInfo.environment["EIGENREALM_PROBE"] == "1"
    static let answer = "Probe"

    static let script = """
    const out = { game: typeof Game, battle: typeof Battle, working: typeof Working,
                  protocol: location.protocol, title: document.title };
    out.standalone = navigator.standalone === true;
    out.vibrate = typeof navigator.vibrate === 'function' && navigator.vibrate([12, 40, 30]) === true;
    out.clipboard = !!(navigator.clipboard && navigator.clipboard.writeText);
    if (out.clipboard) await navigator.clipboard.writeText('probe-clip');
    try {
      out.persisted = localStorage.getItem('eigenrealm.probe') === 'yes';
      localStorage.setItem('eigenrealm.probe', 'yes');
      out.localStorage = localStorage.getItem('eigenrealm.probe') === 'yes';
    } catch (e) { out.localStorage = false; out.storageError = String(e); }
    out.indexedDB = await new Promise(done => {
      try {
        const r = indexedDB.open('eigenrealm-probe', 1);
        r.onsuccess = () => { r.result.close(); done(true); };
        r.onerror = () => done(false);
        r.onblocked = () => done(false);
      } catch (e) { done(false); }
    });
    out.confirm = confirm('probe') === true;
    out.prompt = prompt('probe', '') === 'Probe';
    return JSON.stringify(out);
    """

    static func run(on web: WKWebView, coordinator: Coordinator) {
        web.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
            switch result {
            case .success(let value): say("EIGENREALM-PROBE \(value)")
            case .failure(let error): say("EIGENREALM-PROBE-FAILED \(error)")
            }
            // Messages from the page are delivered asynchronously; give them
            // a moment to land before reporting what the Swift side received.
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                let copied = coordinator.lastCopied == "probe-clip"
                    && UIPasteboard.general.string == "probe-clip"
                say("EIGENREALM-NATIVE {\"haptics\":\(coordinator.hapticsReceived),\"copied\":\(copied)}")
            }
        }
    }

    /// stderr, not print(): print is buffered, and CI reads this from a
    /// process it is about to terminate.
    static func say(_ line: String) {
        FileHandle.standardError.write(Data((line + "\n").utf8))
    }
}
