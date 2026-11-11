// Shared bits for every page: theme toggle, mobile menu, footer year.
(function () {
    var root = document.documentElement;

    var themeBtn = document.getElementById("themeToggle");
    function updateThemeButton() {
        if (!themeBtn) return;
        // The moon/sun icons are swapped in CSS; this keeps the label right.
        var label = root.dataset.theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
        themeBtn.setAttribute("aria-label", label);
        themeBtn.title = label;
    }
    if (themeBtn) {
        themeBtn.addEventListener("click", function () {
            var next = root.dataset.theme === "dark" ? "light" : "dark";
            root.dataset.theme = next;
            try { localStorage.setItem("theme", next); } catch (e) {}
            updateThemeButton();
        });
        updateThemeButton();
    }

    var menuToggle = document.getElementById("menuToggle");
    var siteNav = document.getElementById("siteNav");
    if (menuToggle && siteNav) {
        menuToggle.addEventListener("click", function () {
            var open = siteNav.classList.toggle("open");
            menuToggle.setAttribute("aria-expanded", String(open));
            menuToggle.textContent = open ? "Close" : "Menu";
        });
    }

    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
})();
