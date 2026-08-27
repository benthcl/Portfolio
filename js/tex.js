(function () {
    function renderEl(el) {
        if (typeof katex === "undefined" || !el) return false;
        katex.render(el.getAttribute("data-tex") || "", el, {
            throwOnError: false,
            displayMode: el.getAttribute("data-display") === "true",
            output: "html"
        });
        el.setAttribute("data-rendered", "1");
        return true;
    }

    function renderAll() {
        if (typeof katex === "undefined") {
            window.setTimeout(renderAll, 40);
            return;
        }

        document.querySelectorAll("[data-tex]").forEach(function (el) {
            if (el.getAttribute("data-rendered") === "1") return;
            renderEl(el);
        });
    }

    window.renderTexEl = renderEl;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderAll);
    } else {
        renderAll();
    }
})();
