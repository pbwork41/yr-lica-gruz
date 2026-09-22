/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // включаем шрифты и подпись в serverless-функцию генерации документов
    outputFileTracingIncludes: {
      "/api/document": ["./public/assets/**"],
    },
    // pdfkit требует своих встроенных .afm файлов
    serverComponentsExternalPackages: ["pdfkit"],
  },
};
module.exports = nextConfig;
