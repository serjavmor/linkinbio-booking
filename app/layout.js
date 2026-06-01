// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Link in Bio & Reservas Premium",
  description: "Crea tu página de enlaces personales, define tu disponibilidad y permite a tus clientes reservar citas directamente sincronizadas con tu Google Calendar.",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="app-container">
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
