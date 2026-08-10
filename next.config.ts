import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit reads its bundled AFM font metrics via fs.readFileSync relative
  // to its own __dirname; letting Next.js bundle it into the Server
  // Components graph rewrites that path and breaks the lookup. Opting it
  // out keeps it as a native `require`, which also traces correctly for
  // `output: standalone`.
  serverExternalPackages: ["pdfkit"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  output: "standalone",
};

export default withNextIntl(nextConfig);