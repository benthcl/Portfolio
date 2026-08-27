(function () {
    var storageKey = "theme";
    var root = document.documentElement;

    function preferredTheme() {
        try {
            var stored = localStorage.getItem(storageKey);
            if (stored === "light" || stored === "dark") return stored;
        } catch (err) {
            /* private mode */
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function syncButtons(theme) {
        var next = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
        document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
            btn.setAttribute("aria-label", next);
            btn.setAttribute("title", next);
            btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
        });
    }

    function applyTheme(theme, persist) {
        root.setAttribute("data-theme", theme);
        if (persist) {
            try {
                localStorage.setItem(storageKey, theme);
            } catch (err) {
                /* private mode */
            }
        }
        syncButtons(theme);
    }

    applyTheme(preferredTheme(), false);

    document.addEventListener("click", function (event) {
        var toggle = event.target.closest("[data-theme-toggle]");
        if (!toggle) return;
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next, true);
    });

    var media = window.matchMedia("(prefers-color-scheme: dark)");
    var onChange = function (event) {
        try {
            if (localStorage.getItem(storageKey)) return;
        } catch (err) {
            return;
        }
        applyTheme(event.matches ? "dark" : "light", false);
    };

    if (typeof media.addEventListener === "function") {
        media.addEventListener("change", onChange);
    } else if (typeof media.addListener === "function") {
        media.addListener(onChange);
    }
})();
