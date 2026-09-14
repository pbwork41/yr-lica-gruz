import "./globals.css";

export const metadata = {
  title: "\u042E\u0440\u043B\u0438\u0446\u0430 \u00B7 \u0413\u0440\u0443\u0437\u043E\u043F\u0435\u0440\u0435\u0432\u043E\u0437\u043A\u0438",
  description: "\u0423\u0447\u0451\u0442 \u0437\u0430\u044F\u0432\u043E\u043A, \u0440\u0430\u0441\u0447\u0451\u0442 \u043F\u0440\u0438\u0431\u044B\u043B\u0438 \u0438 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
