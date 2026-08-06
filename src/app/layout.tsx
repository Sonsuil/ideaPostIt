import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IdeaGather",
  description: "익명 기능 개선 요청 게시판",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <main style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
