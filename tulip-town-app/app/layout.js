import './globals.css';
import Header from '../components/Header';
import { LocaleProvider } from '../components/LocaleProvider';
import VisitTracker from '../components/VisitTracker';
import { getServerLocale } from '../lib/i18n/server';
import { Caveat } from 'next/font/google';

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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }) {
  const locale = getServerLocale();

  return (
    <html lang={locale === 'en' ? 'en' : 'ko'} className={caveat.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LocaleProvider initialLocale={locale}>
          <VisitTracker />
          <Header />
          <main>{children}</main>
          <footer className="footer">
            <div className="container">
              © 2026 Tulip Town Korean Community · Serving Holland, Grand Rapids &amp; West Michigan
            </div>
          </footer>
        </LocaleProvider>
      </body>
    </html>
  );
}
