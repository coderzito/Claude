export interface ThemeShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface Theme {
  mode: "light" | "dark";
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  borderStrong: string;
  track: string;
  text: string;
  subtext: string;
  faint: string;
  accent: string;
  accentDim: string;
  accentText: string;
  good: string;
  warn: string;
  bad: string;
  radius: number;
  radiusSm: number;
  space: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  shadow: ThemeShadow;
}

const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
const radius = 16;
const radiusSm = 10;

export const darkTheme: Theme = {
  mode: "dark",
  bg: "#0d0f14",
  card: "#1a1d26",
  cardAlt: "#20242f",
  border: "#2a2e3a",
  borderStrong: "#3a3f4e",
  track: "#262a35",
  text: "#f5f6f8",
  subtext: "#9aa0ad",
  faint: "#6b7280",
  accent: "#6d8cff",
  accentDim: "#3d4a80",
  accentText: "#0a0c10",
  good: "#3ecf8e",
  warn: "#f2b84b",
  bad: "#ef5c5c",
  radius,
  radiusSm,
  space,
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const lightTheme: Theme = {
  mode: "light",
  bg: "#f4f5f7",
  card: "#ffffff",
  cardAlt: "#eef0f3",
  border: "#dfe2e8",
  borderStrong: "#c7cbd3",
  track: "#e4e7ec",
  text: "#14161b",
  subtext: "#5b6270",
  faint: "#8890a0",
  accent: "#3d5ce0",
  accentDim: "#c3cdf5",
  accentText: "#ffffff",
  good: "#1d9d6c",
  warn: "#b8790f",
  bad: "#d1443a",
  radius,
  radiusSm,
  space,
  shadow: {
    shadowColor: "#1a1d26",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
};
