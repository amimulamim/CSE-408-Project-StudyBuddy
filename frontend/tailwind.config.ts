import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        study: {
          'purple': '#8B5CF6',
          'blue': '#3B82F6',
          'pink': '#EC4899',
          'dark': '#1E1A2B',
          'darker': '#0F0A1A',
          'light': '#F8FAFC'
        }
      },
      backgroundImage: {
        'dashboard-gradient': 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(139, 92, 246, 0.15), transparent), radial-gradient(ellipse 80% 80% at 80% 40%, rgba(59, 130, 246, 0.1), transparent), radial-gradient(ellipse 80% 80% at 20% 60%, rgba(236, 72, 153, 0.1), transparent), linear-gradient(135deg, hsl(260, 30%, 8%) 0%, hsl(260, 30%, 12%) 50%, hsl(260, 30%, 10%) 100%)',
        'dashboard-animated': 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(139, 92, 246, 0.15), transparent 40%), linear-gradient(135deg, hsl(260, 30%, 8%) 0%, hsl(260, 30%, 12%) 50%, hsl(260, 30%, 10%) 100%)'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-position': '0% 50%'
          },
          '50%': {
            'background-position': '100% 50%'
          }
        },
        'gradient-shift': {
          '0%, 100%': {
            'background-position': '0% 50%'
          },
          '25%': {
            'background-position': '100% 50%'
          },
          '50%': {
            'background-position': '100% 100%'
          },
          '75%': {
            'background-position': '0% 100%'
          }
        },
        'aurora': {
          '0%': {
            'background-position': '50% 50%, 50% 50%'
          },
          '25%': {
            'background-position': '0% 100%, 100% 0%'
          },
          '50%': {
            'background-position': '100% 50%, 0% 50%'
          },
          '75%': {
            'background-position': '50% 0%, 50% 100%'
          },
          '100%': {
            'background-position': '50% 50%, 50% 50%'
          }
        },
        'marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-200%)' },
        },
        'marquee2': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0%)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-shift': 'gradient-shift 20s ease infinite',
        'aurora': 'aurora 30s ease infinite',
        'marquee': 'marquee 25s linear infinite',
        'marquee2': 'marquee2 25s linear infinite',
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwind-scrollbar-hide"),
  ],
} satisfies Config;
