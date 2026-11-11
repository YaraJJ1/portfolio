(function () {
    var root = document.documentElement;

    var themeBtn = document.getElementById("themeToggle");
    function updateThemeButton() {
        if (!themeBtn) return;
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

    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(forced-colors: active)").matches) return;
    var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cursor = document.createElement("div");
    cursor.className = "custom-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<span class="custom-cursor-dot"></span>';
    document.body.appendChild(cursor);
    root.classList.add("has-custom-cursor");

    var CLICKABLE = 'a, button, select, summary, label[for], [role="button"], [role="tab"], .card, .tab, .work-media, .donut-seg, .dd-item, .dd-option, .swiper-button-prev, .swiper-button-next, .swiper-pagination-bullet';
    var TEXT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]';
    var x = -100, y = -100, cx = -100, cy = -100, moving = false;

    function updateState(t) {
        t = t instanceof Element ? t : null;
        var onText = !!(t && t.closest(TEXT));
        var clickable = t && t.closest(CLICKABLE);
        var disabled = clickable && (clickable.disabled || clickable.getAttribute("aria-disabled") === "true");
        cursor.classList.toggle("is-text", onText);
        cursor.classList.toggle("is-link", !onText && !!clickable && !disabled);
    }

    function frame() {
        cx += (x - cx) * 0.35;
        cy += (y - cy) * 0.35;
        cursor.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
        if (Math.abs(x - cx) > 0.1 || Math.abs(y - cy) > 0.1) requestAnimationFrame(frame);
        else moving = false;
    }

    document.addEventListener("mousemove", function (e) {
        x = e.clientX;
        y = e.clientY;
        if (!cursor.classList.contains("is-visible")) { cx = x; cy = y; }
        cursor.classList.add("is-visible");
        if (still) {
            cx = x; cy = y;
            cursor.style.transform = "translate3d(" + x + "px," + y + "px,0)";
        } else if (!moving) {
            moving = true;
            requestAnimationFrame(frame);
        }
        updateState(e.target);
    }, { passive: true });

    window.addEventListener("scroll", function () {
        if (cursor.classList.contains("is-visible")) updateState(document.elementFromPoint(x, y));
    }, { passive: true });

    document.addEventListener("mousedown", function () { cursor.classList.add("is-down"); });
    document.addEventListener("mouseup", function () { cursor.classList.remove("is-down"); });
    document.documentElement.addEventListener("mouseleave", function () { cursor.classList.remove("is-visible"); });
    window.addEventListener("blur", function () { cursor.classList.remove("is-visible"); });
})();
