import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata = {
  title: "Capy-Count",
  description: "Een leuke app om maaltafels en deeltafels te oefenen!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body style={{ margin: 0 }}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
