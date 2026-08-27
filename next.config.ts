import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit reads its bundled AFM font metrics via fs.readFileSync relative
  // to its own __dirname; letting Next.js bundle it into the Server
  // Components graph rewrites that path and breaks the lookup. Opting it
  // out keeps it as a native `require`, which traces correctly under
  // Vercel's own build output tracing.
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
      {
        protocol: "https",
        hostname: "etiohbxjwzclursixjze.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/quiz/categoria/football",
        destination: "/quiz/categoria/sports",
        permanent: true,
      },
      {
        source: "/games",
        has: [{ type: "query", key: "game", value: "personality-test" }],
        destination: "/quel-animal-es-tu",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);