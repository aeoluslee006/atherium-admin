import './globals.css';
import Header from '../components/Header';
import VisitTracker from '../components/VisitTracker';
import { Caveat, Noto_Sans_KR, Plus_Jakarta_Sans } from 'next/font/google';

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata = {
  title: 'Tulip Town Korean Community',
  description: 'Serving Holland, Grand Rapids & West Michigan — 미시간 서부 한인 커뮤니티',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${plusJakarta.variable} ${caveat.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={notoSansKr.className}>
        <VisitTracker />
        <Header />
        <main>{children}</main>
        <footer className="footer">
          <div className="container">
            © 2026 Tulip Town Korean Community · Serving Holland, Grand Rapids &amp; West Michigan
          </div>
        </footer>
      </body>
    </html>
  );
}
