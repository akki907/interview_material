// src/app/theme.ts — keeps the DOM theme attribute in sync with the store
import { useEffect } from "react";
import { useStore } from "../lib/store";

export function useThemeSync() {
    const theme = useStore((s) => s.theme);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    return {
        theme,
        toggle: () =>
            useStore.getState().setTheme(theme === "dark" ? "light" : "dark"),
    };
}
