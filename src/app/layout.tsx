import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anonymous Post-it Board",
  description: "A simple board to share ideas anonymously",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <header className="topbar">
          <div className="brand">💡 IdeaGather</div>
          <div className="who">익명 포스트잇 보드</div>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
