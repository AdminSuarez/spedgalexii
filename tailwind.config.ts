import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gx: {
          bg0: "var(--bg0)",
          bg1: "var(--bg1)",
          bg2: "var(--bg2)",
          fg: "var(--foreground)",
          glass: "var(--glass)",
          glass2: "var(--glass2)",
          stroke: "var(--stroke)",
          stroke2: "var(--stroke2)",
          pink: "var(--pink)",
          violet: "var(--violet)",
          cyan: "var(--cyan)",
          mint: "var(--mint)",
        },
      },
      borderRadius: {
        gx: "20px",
      },
    },
  },
  plugins: [],
} satisfies Config;
