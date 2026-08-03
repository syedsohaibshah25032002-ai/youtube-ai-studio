import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
