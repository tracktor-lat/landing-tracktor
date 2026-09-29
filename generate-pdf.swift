// Genera Tracktor-One-Pager.pdf (A4) desde one-pager.html con WebKit, sin descargar nada.
// En cualquier Mac:
//   swiftc -O generate-pdf.swift -o /tmp/exportar-pdf
//   /tmp/exportar-pdf "$PWD/one-pager.html" "$PWD/Tracktor-One-Pager.pdf"
//
// Uso: exportar <entrada.html> <salida.pdf>
import AppKit
import WebKit

let args = CommandLine.arguments
guard args.count == 3 else { print("uso: exportar <entrada.html> <salida.pdf>"); exit(64) }
let htmlURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])

// 0,75 = 72 pt / 96 px: la hoja de 210 × 297 mm sale exactamente en tamaño A4.
let zoom: CGFloat = 0.75

final class Exportador: NSObject, WKNavigationDelegate {
    let web: WKWebView
    let window: NSWindow

    init(html: URL) {
        // Ancho de sobra para que no apliquen los estilos de pantalla chica (≤ 860 px).
        let marco = NSRect(x: 0, y: 0, width: 1200, height: 1500)
        web = WKWebView(frame: marco, configuration: WKWebViewConfiguration())
        window = NSWindow(contentRect: marco, styleMask: [.borderless], backing: .buffered, defer: false)
        super.init()
        window.contentView = web
        web.pageZoom = zoom
        web.navigationDelegate = self
        web.loadFileURL(html, allowingReadAccessTo: html.deletingLastPathComponent())
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Igual que @media print: sin barra, sin sombra, sin margen alrededor de la hoja.
        // Además, dos arreglos propios del PDF de WebKit:
        //  - backdrop-filter hace que pierda la transparencia de los degradados de
        //    toda la hoja (salen negros y tapan las fotos): se desactiva y el vidrio
        //    queda como velo translúcido.
        //  - las <img> grandes salen en blanco si no están decodificadas: se fuerza.
        let preparar = """
        document.querySelector('.toolbar')?.style.setProperty('display', 'none');
        document.body.style.background = 'none';
        const hoja = document.querySelector('.sheet');
        hoja.style.margin = '0'; hoja.style.boxShadow = 'none';
        const st = document.createElement('style');
        st.textContent = '*{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}';
        document.head.appendChild(st);
        await document.fonts.ready;
        for (const img of document.images) {
          img.decoding = 'sync';
          try { await img.decode(); } catch (e) {}
        }
        return true;
        """
        webView.callAsyncJavaScript(preparar, arguments: [:], in: nil, in: .page) { _ in
            // Tiempo para que repinte con los cambios.
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { self.exportar() }
        }
    }

    func exportar() {
        let medir = """
        (() => {
          const r = document.querySelector('.sheet').getBoundingClientRect();
          return [r.x, r.y, r.width, r.height, !!document.querySelector('#qr img'), document.fonts.status,
                  [...document.images].every(i => i.complete && i.naturalWidth > 0)];
        })()
        """
        web.evaluateJavaScript(medir) { res, err in
            guard let a = res as? [Any], a.count == 7,
                  let x = a[0] as? Double, let y = a[1] as? Double,
                  let w = a[2] as? Double, let h = a[3] as? Double else {
                print("no pude medir la hoja: \(String(describing: err))"); exit(1)
            }
            print("hoja (css px): \(w) × \(h) · QR: \(a[4]) · fuentes: \(a[5]) · imágenes ok: \(a[6])")
            let conf = WKPDFConfiguration()
            conf.rect = CGRect(x: x * Double(zoom), y: y * Double(zoom), width: w * Double(zoom), height: h * Double(zoom))
            self.web.createPDF(configuration: conf) { result in
                switch result {
                case .success(let data):
                    do { try data.write(to: outURL) } catch { print("no pude guardar: \(error)"); exit(1) }
                    print("PDF: \(outURL.path) (\(data.count) bytes)")
                    exit(0)
                case .failure(let e):
                    print("error al generar el PDF: \(e)"); exit(1)
                }
            }
        }
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)
let exportador = Exportador(html: htmlURL)
DispatchQueue.main.asyncAfter(deadline: .now() + 90) { print("tiempo agotado"); exit(2) }
app.run()
