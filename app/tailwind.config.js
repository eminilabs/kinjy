/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Channel triples, not hex, so `<alpha-value>` keeps working for the
        // hundreds of `bg-gold/15`-style utilities *and* the whole palette
        // follows :root[data-theme] instead of being frozen at build time.
        ink: {
          DEFAULT: "rgb(var(--ink-rgb) / <alpha-value>)",
          2: "rgb(var(--ink-2-rgb) / <alpha-value>)",
          3: "rgb(var(--ink-3-rgb) / <alpha-value>)",
        },
        indigo: {
          DEFAULT: "rgb(var(--indigo-rgb) / <alpha-value>)",
          deep: "rgb(var(--indigo-deep-rgb) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(var(--gold-rgb) / <alpha-value>)",
          soft: "rgb(var(--gold-soft-rgb) / <alpha-value>)",
        },
        sky: "rgb(var(--sky-rgb) / <alpha-value>)",
        coral: "rgb(var(--coral-rgb) / <alpha-value>)",
        paper: {
          DEFAULT: "rgb(var(--paper-rgb) / <alpha-value>)",
          2: "rgb(var(--paper-2-rgb) / <alpha-value>)",
          ink: "rgb(var(--paper-ink-rgb) / <alpha-value>)",
        },
        "text-hi": "rgb(var(--text-hi-rgb) / <alpha-value>)",
        "text-mid": "rgb(var(--text-mid-rgb) / <alpha-value>)",
        "text-low": "rgb(var(--text-low-rgb) / <alpha-value>)",
        success: "rgb(var(--success-rgb) / <alpha-value>)",
        warning: "rgb(var(--warning-rgb) / <alpha-value>)",
        danger: "rgb(var(--danger-rgb) / <alpha-value>)",
        info: "rgb(var(--info-rgb) / <alpha-value>)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        // Tightened one step across the board (was 10/16/24/32). Changing the
        // scale rather than individual components keeps card, input, dialog and
        // rail corners in the same family instead of drifting apart.
        // Named "card-*", not "r-*": `rounded-r-lg` collided with Tailwind's
        // built-in right-side utility, so both rules were emitted and cards
        // ended up with 16px left corners and 12px right ones.
        "card-sm": "6px",
        "card-md": "9px",
        "card-lg": "12px",
        "card-xl": "16px",
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        cloud: "var(--shadow-cloud)",
        "cloud-hover": "var(--shadow-cloud-hover)",
        "gold-ring": "0 0 0 1px rgba(217,166,72,0.25)",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      transitionTimingFunction: {
        "cloud-ease": "cubic-bezier(0.22, 1, 0.36, 1)",
        "snap-ease": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "line-ease": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      maxWidth: {
        container: "1240px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "orb-breathe": {
          "0%,100%": { transform: "scale(1)", filter: "drop-shadow(0 0 10px rgba(74,82,224,0.55))" },
          "50%": { transform: "scale(1.06)", filter: "drop-shadow(0 0 22px rgba(240,200,120,0.6))" },
        },
        flicker: {
          "0%,100%": { transform: "scaleY(1) scaleX(1)", opacity: "1" },
          "18%": { transform: "scaleY(1.08) scaleX(0.94)", opacity: "0.92" },
          "36%": { transform: "scaleY(0.94) scaleX(1.05)", opacity: "1" },
          "55%": { transform: "scaleY(1.12) scaleX(0.9)", opacity: "0.88" },
          "74%": { transform: "scaleY(0.97) scaleX(1.02)", opacity: "0.97" },
          "90%": { transform: "scaleY(1.05) scaleX(0.96)", opacity: "0.93" },
        },
        "wave-bar": {
          "0%,100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        marquee: "marquee 28s linear infinite",
        "orb-breathe": "orb-breathe 4.2s ease-in-out infinite",
        flicker: "flicker 1.6s ease-in-out infinite",
        "wave-bar": "wave-bar 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}