import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();
    // Avoid hydration mismatch
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="p-2 w-9 h-9" />;
    }

    return (
        <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-md p-2 hover:bg-brand-sea/10 dark:hover:bg-white/10 transition-colors text-brand-navy dark:text-gray-300"
            title="Przełącz motyw"
        >
            {theme === "dark" ? (
                <Sun className="h-5 w-5 hover:text-brand-orange transition-colors" />
            ) : (
                <Moon className="h-5 w-5 hover:text-brand-midnight transition-colors" />
            )}
            <span className="sr-only">Przełącz motyw</span>
        </button>
    );
}
