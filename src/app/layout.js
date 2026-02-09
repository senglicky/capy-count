import "./globals.css";

export const metadata = {
  title: "Capy-Count",
  description: "Een leuke app om maaltafels en deeltafels te oefenen!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>
        {children}
      </body>
    </html>
  );
}
