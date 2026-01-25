import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

// Define the shape of our context
const ThemeContext = createContext({
  theme: "dark",
  setTheme: (theme: string) => {},
});

export const ThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [theme, setTheme] = useState(() => {
    // Check local storage or system preference on initial load
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: light)")
      .matches
      ? "dark" // this should be light once implemented
      : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/*
script in index.html
<script>
      (function () {
        const saved =
          localStorage.getItem("theme") ||
          (window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light");
        document.documentElement.setAttribute("data-theme", saved);
      })();
    </script>

*/

export const useTheme = () => useContext(ThemeContext);