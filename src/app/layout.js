import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata = {
  title: "Capy-Count",
  description: "Een leuke app om maaltafels en deeltafels te oefenen!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body style={{
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        height: '100dvh',
        overflow: 'hidden'
      }}>
        <Navbar />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </main>
      </body>
    </html>
  );
}
