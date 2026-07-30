import './globals.css';
import Header from '../components/Header';

export const metadata = {
  title: 'Tulip Town Korean Community',
  description: 'Serving Holland, Grand Rapids & West Michigan — 미시간 서부 한인 커뮤니티',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
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
