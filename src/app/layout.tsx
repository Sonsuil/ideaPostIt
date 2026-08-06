import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP 기능 개선 요청사항",
  description: "ERP 기능 개선을 위한 익명 요청 게시판",
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
          <div className="brand">💡 ERP 기능 개선 요청사항</div>
          <div className="who">익명 게시판</div>
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
