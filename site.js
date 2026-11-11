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
        var setMenu = function (open) {
            siteNav.classList.toggle("open", open);
            menuToggle.setAttribute("aria-expanded", String(open));
            menuToggle.textContent = open ? "Close" : "Menu";
        };
        menuToggle.addEventListener("click", function () {
            setMenu(!siteNav.classList.contains("open"));
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && siteNav.classList.contains("open")) {
                setMenu(false);
                menuToggle.focus();
            }
        });
    }

    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
})();
