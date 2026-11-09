// Fichier généré par packages/design-tokens/scripts/build.mjs à partir de tokens.json. Ne pas modifier à la main.

export const tokens = {
  "color": {
    "brand": {
      "gold": "#F2B544",
      "gold-700": "#8F5C00",
      "terracotta": "#E8714A",
      "terracotta-700": "#B4441F",
      "on-gold": "#1A1206"
    },
    "discipline": {
      "musique": "#F2B544",
      "humour": "#FF7A59",
      "danse": "#EC5FA8",
      "peinture": "#2EC4B6",
      "autre": "#8B7CF6"
    },
    "dark": {
      "bg": "#0B0B0D",
      "surface-1": "#141417",
      "surface-2": "#1C1C21",
      "surface-3": "#26262D",
      "border-subtle": "#2E2E36",
      "border-strong": "#3D3D47",
      "text-primary": "#F6F3EC",
      "text-secondary": "#B4B0A7",
      "text-tertiary": "#8C887F",
      "accent": "#F2B544",
      "success": "#3DD68C",
      "warning": "#F5A524",
      "danger": "#FF6B6B",
      "info": "#5AA9FF",
      "overlay": "rgba(11, 11, 13, 0.72)"
    },
    "light": {
      "bg": "#FBF9F5",
      "surface-1": "#FFFFFF",
      "surface-2": "#F3F0EA",
      "surface-3": "#E9E4DA",
      "border-subtle": "#E4DFD5",
      "border-strong": "#CFC8BB",
      "text-primary": "#15130F",
      "text-secondary": "#57534B",
      "text-tertiary": "#6F6A61",
      "accent": "#8F5C00",
      "success": "#16794A",
      "warning": "#9A5B00",
      "danger": "#C62828",
      "info": "#1F63C6",
      "overlay": "rgba(21, 19, 15, 0.48)"
    }
  },
  "font": {
    "family": {
      "display": "Unbounded",
      "text": "Inter"
    },
    "size": {
      "xs": {
        "size": 12,
        "lineHeight": 16
      },
      "sm": {
        "size": 14,
        "lineHeight": 20
      },
      "md": {
        "size": 16,
        "lineHeight": 24
      },
      "lg": {
        "size": 18,
        "lineHeight": 26
      },
      "xl": {
        "size": 20,
        "lineHeight": 28
      },
      "2xl": {
        "size": 24,
        "lineHeight": 30
      },
      "3xl": {
        "size": 30,
        "lineHeight": 36
      },
      "4xl": {
        "size": 36,
        "lineHeight": 42
      },
      "5xl": {
        "size": 48,
        "lineHeight": 54
      },
      "6xl": {
        "size": 60,
        "lineHeight": 64
      }
    }
  },
  "space": {
    "0": 0,
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 20,
    "6": 24,
    "8": 32,
    "10": 40,
    "12": 48,
    "16": 64,
    "20": 80
  },
  "radius": {
    "sm": 6,
    "md": 10,
    "lg": 14,
    "xl": 20,
    "full": 999
  },
  "duration": {
    "instant": 80,
    "fast": 150,
    "base": 220,
    "slow": 320,
    "slower": 480,
    "celebration": 900
  },
  "easing": {
    "standard": [
      0.2,
      0,
      0,
      1
    ],
    "enter": [
      0,
      0,
      0,
      1
    ],
    "exit": [
      0.3,
      0,
      1,
      1
    ],
    "emphasized": [
      0.3,
      0,
      0,
      1
    ]
  },
  "breakpoint": {
    "sm": 360,
    "md": 768,
    "lg": 1024,
    "xl": 1280,
    "2xl": 1536
  }
} as const;

export type DisciplineColor = keyof typeof tokens.color.discipline;
