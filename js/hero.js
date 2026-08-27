(function () {
    var reduce = false;
    try {
        reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
        reduce = false;
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function highlightCode(src) {
        var keywords = /^(def|return|for|in|range|if|else|elif|while|import|from|as|class|True|False|None)$/;
        var fns = /^(rk4|f|groupBy|agg|avg|filter|orderBy|alias|col|read|format|load|desc|count|write|mode|saveAsTable)$/;
        var re = /(#[^\n]*|"[^"\n]*"|'[^'\n]*'|[A-Za-z_\u03c6\u03a6][\w\u03c6\u03a6]*|\d+(?:\.\d+)?|[()[\]+\-*/=,<>:.]+|\s+|.)/g;
        var out = "";
        var m;
        while ((m = re.exec(src))) {
            var tok = m[0];
            if (tok.charAt(0) === "#") out += '<span class="tok-cmt">' + escapeHtml(tok) + "</span>";
            else if (tok.charAt(0) === "\"" || tok.charAt(0) === "'") out += '<span class="tok-str">' + escapeHtml(tok) + "</span>";
            else if (keywords.test(tok)) out += '<span class="tok-kw">' + escapeHtml(tok) + "</span>";
            else if (fns.test(tok)) out += '<span class="tok-fn">' + escapeHtml(tok) + "</span>";
            else if (/^\d/.test(tok)) out += '<span class="tok-num">' + escapeHtml(tok) + "</span>";
            else if (/^[()[\]+\-*/=,<>:.]+$/.test(tok)) out += '<span class="tok-op">' + escapeHtml(tok) + "</span>";
            else out += escapeHtml(tok);
        }
        return out;
    }

    function fitCodeToBox(codeEl) {
        var pre = codeEl.closest("pre") || codeEl;
        var pane = codeEl.closest(".wb-pane, .band-term") || pre.parentElement;
        if (!pane || pane.clientHeight < 32) return;
        var fill = pane.closest(".band-widget-code-fill");
        var box = fill ? pre : pane;
        if (box.clientHeight < 32) return;
        pre.style.fontSize = "";
        var size = fill ? 22 : 15;
        var min = fill ? 11 : 9;
        for (; size >= min; size -= 0.5) {
            pre.style.fontSize = size + "px";
            if (pre.scrollHeight <= box.clientHeight + 2 && pre.scrollWidth <= box.clientWidth + 2) break;
        }
    }

    function typeCode(el, opts) {
        opts = opts || {};
        var full = opts.text != null
            ? opts.text
            : (el.getAttribute("data-type") || "").replace(/\\n/g, "\n");
        if (!full) return function () {};

        var stopped = false;
        var i = 0;
        var caret = document.createElement("span");
        caret.className = "term-caret";

        function paint(n) {
            try {
                el.innerHTML = highlightCode(full.slice(0, n));
            } catch (err) {
                el.textContent = full.slice(0, n);
            }
            el.appendChild(caret);
            fitCodeToBox(el);
        }

        if (reduce || opts.instant) {
            paint(full.length);
            if (typeof opts.onDone === "function") opts.onDone();
            return function () {};
        }

        function tick() {
            if (stopped) return;
            paint(i);
            if (i < full.length) {
                var ch = full.charAt(i);
                i += 1;
                window.setTimeout(tick, ch === "\n" ? 90 : (opts.delay || 28));
            } else if (opts.loop) {
                window.setTimeout(function () {
                    if (stopped) return;
                    i = 0;
                    tick();
                }, opts.hold || 2400);
            } else if (typeof opts.onDone === "function") {
                window.setTimeout(function () {
                    if (!stopped) opts.onDone();
                }, 900);
            }
        }

        tick();
        return function stop() {
            stopped = true;
        };
    }

    function katexLeaves(root) {
        var html = root.querySelector(".katex-html");
        if (!html) return [];
        var sel = ".mord, .mop, .mbin, .mrel, .mopen, .mclose, .mpunct, .minner, .mfrac, .msupsub, .sqrt, .vlist";
        var nodes = Array.prototype.slice.call(html.querySelectorAll(sel));
        var leaves = nodes.filter(function (node) {
            return !node.querySelector(sel);
        });
        if (leaves.length < 4) {
            leaves = Array.prototype.slice.call(html.querySelectorAll(".base > span")).filter(function (node) {
                return !/\b(strut|pstrut|vlist-s|mspace)\b/.test(String(node.className || ""));
            });
        }
        return leaves;
    }

    function writeKatex(el, tex, opts) {
        opts = opts || {};
        el.removeAttribute("data-rendered");
        el.setAttribute("data-tex", tex);
        if (opts.display === false) {
            el.removeAttribute("data-display");
        } else {
            el.setAttribute("data-display", "true");
        }
        if (typeof window.renderTexEl !== "function") return function () {};
        window.renderTexEl(el);

        if (!el.querySelector(".katex-html")) {
            var retryId = window.setTimeout(function () {
                writeKatex(el, tex, opts);
            }, 40);
            return function stop() {
                window.clearTimeout(retryId);
            };
        }

        var atoms = katexLeaves(el);
        var stopped = false;

        if (reduce || opts.instant) {
            if (typeof opts.onDone === "function") opts.onDone();
            return function () {};
        }

        if (atoms.length < 3) {
            var math = el.querySelector(".katex");
            if (math) {
                math.style.clipPath = "inset(0 100% 0 0)";
                math.style.transition = "clip-path 2.8s ease";
                window.setTimeout(function () {
                    if (!stopped) math.style.clipPath = "inset(0 0 0 0)";
                }, 20);
                window.setTimeout(function () {
                    if (!stopped && typeof opts.onDone === "function") opts.onDone();
                }, 3000);
            } else if (typeof opts.onDone === "function") {
                opts.onDone();
            }
            return function stop() {
                stopped = true;
            };
        }

        var i = 0;
        for (var a = 0; a < atoms.length; a += 1) {
            atoms[a].style.opacity = "0";
            atoms[a].style.transform = "translateY(4px)";
            atoms[a].style.transition = "opacity 0.28s ease, transform 0.28s ease";
        }

        function reveal() {
            if (stopped) return;
            if (i >= atoms.length) {
                if (typeof opts.onDone === "function") opts.onDone();
                return;
            }
            atoms[i].style.opacity = "1";
            atoms[i].style.transform = "none";
            i += 1;
            window.setTimeout(reveal, opts.delay || 72);
        }

        reveal();
        return function stop() {
            stopped = true;
        };
    }

    function fadeKatex(el, opts, done) {
        opts = opts || {};
        var atoms = katexLeaves(el);
        var stopped = false;
        if (reduce || !atoms.length) {
            if (done) done();
            return function () {};
        }
        var i = atoms.length - 1;
        function hide() {
            if (stopped) return;
            if (i < 0) {
                if (done) done();
                return;
            }
            atoms[i].style.opacity = "0";
            atoms[i].style.transform = "translateY(3px)";
            i -= 1;
            window.setTimeout(hide, opts.delay || 70);
        }
        hide();
        return function () { stopped = true; };
    }

    function runMeter(meter, opts) {
        opts = opts || {};
        var rot = meter.querySelector(".wb-pol-rot");
        var beam = meter.querySelector(".wb-beam");
        var bar = meter.querySelector("[data-wb-bar]");
        var thEl = meter.querySelector("[data-wb-theta]");
        var iEl = meter.querySelector("[data-wb-ii0]");
        var stopped = false;

        function apply(deg) {
            var rad = deg * Math.PI / 180;
            var ii0 = Math.cos(rad) * Math.cos(rad);
            if (rot) rot.setAttribute("transform", "rotate(" + deg + " 36 36)");
            if (beam) beam.setAttribute("opacity", String(0.12 + 0.88 * ii0));
            if (bar) bar.style.width = (ii0 * 100).toFixed(1) + "%";
            if (thEl) thEl.textContent = Math.round(deg) + "°";
            if (iEl) iEl.textContent = ii0.toFixed(2);
        }

        if (reduce || opts.instant) {
            apply(45);
            if (typeof opts.onDone === "function") opts.onDone();
            return function () {};
        }

        var deg = 0;
        var step = 2;

        function tick() {
            if (stopped) return;
            apply(deg);
            if (deg >= 90) {
                if (typeof opts.onDone === "function") {
                    window.setTimeout(function () {
                        if (!stopped) opts.onDone();
                    }, 700);
                }
                return;
            }
            deg += step;
            window.setTimeout(tick, 45);
        }

        tick();
        return function stop() {
            stopped = true;
        };
    }

    var bookPages = [
        {
            tex: "\\oint_{S}\\mathbf{E}\\cdot d\\mathbf{A}=\\dfrac{Q_{\\mathrm{enc}}}{\\varepsilon_0}",
            caption: "Gauss's law"
        },
        {
            tex: "(f\\circ g)'=(f'\\circ g)g'",
            caption: "chain rule"
        },
        {
            tex: "\\nabla\\times\\mathbf{E}=-\\partial_t\\mathbf{B}",
            caption: "Faraday"
        },
        {
            tex: "\\nabla\\times\\mathbf{B}=\\mu_0\\mathbf{J}+\\mu_0\\varepsilon_0\\partial_t\\mathbf{E}",
            caption: "Ampère–Maxwell"
        }
    ];

    function cycleBook(root) {
        if (reduce) return;

        var page = root.querySelector(".book-page");
        var focus = root.querySelector(".eq-focus");
        var caption = root.querySelector(".eq-caption");
        if (!page || !focus || !caption) return;

        var idx = 0;

        function next() {
            if (root.classList.contains("is-paused")) return;
            page.classList.add("is-turning");
            window.setTimeout(function () {
                idx = (idx + 1) % bookPages.length;
                focus.removeAttribute("data-rendered");
                focus.setAttribute("data-tex", bookPages[idx].tex);
                caption.textContent = bookPages[idx].caption;
                if (typeof window.renderTexEl === "function") {
                    window.renderTexEl(focus);
                }
            }, 320);
            window.setTimeout(function () {
                page.classList.remove("is-turning");
            }, 740);
        }

        window.setInterval(next, 5200);
    }

    var rk4Source = [
        "def rk4(f, y, t, h):",
        "    k1 = f(t, y)",
        "    k2 = f(t + h/2, y + h*k1/2)",
        "    k3 = f(t + h/2, y + h*k2/2)",
        "    k4 = f(t + h, y + h*k3)",
        "    return y + h*(k1 + 2*k2 + 2*k3 + k4)/6"
    ].join("\n");

    var workbenchBeats = [
        {
            kind: "write",
            tex: "S[g]=\\dfrac{c^{4}}{16\\pi G}\\displaystyle\\int R\\sqrt{-g}\\,d^{4}x",
            caption: "derivation"
        },
        {
            kind: "code",
            source: rk4Source,
            caption: "solver"
        },
        {
            kind: "meter",
            caption: "measurement"
        }
    ];

    function cycleWorkbench(root) {
        var tabs = root.querySelectorAll(".wb-tab");
        var pane = root.querySelector(".wb-pane");
        var focus = root.querySelector(".eq-focus");
        var codeWrap = root.querySelector(".term-code");
        var codeEl = root.querySelector(".term-code code");
        var meter = root.querySelector(".wb-meter");
        var caption = root.querySelector(".eq-caption");
        if (!pane || !focus || !codeWrap || !codeEl || !meter || !caption) return;

        var token = 0;
        var stopAnim = null;

        function setTabs(i) {
            tabs.forEach(function (tab, n) {
                tab.classList.toggle("is-active", n === i);
            });
            root.setAttribute("data-beat", String(i));
        }

        function hideAll() {
            focus.hidden = true;
            codeWrap.hidden = true;
            meter.hidden = true;
            pane.classList.remove("is-code", "is-math", "is-lab");
        }

        function later(mine, delay, fn) {
            window.setTimeout(function () {
                if (mine === token) fn();
            }, delay);
        }

        function show(i) {
            token += 1;
            var mine = token;
            if (stopAnim) {
                stopAnim();
                stopAnim = null;
            }

            var beat = workbenchBeats[i];
            setTabs(i);
            caption.textContent = beat.caption;
            hideAll();

            if (beat.kind === "write") {
                pane.classList.add("is-math");
                focus.hidden = false;
                stopAnim = writeKatex(focus, beat.tex, {
                    instant: reduce,
                    onDone: function () {
                        if (reduce) return;
                        later(mine, 2200, function () {
                            show((i + 1) % workbenchBeats.length);
                        });
                    }
                });
            } else if (beat.kind === "code") {
                pane.classList.add("is-code");
                codeWrap.hidden = false;
                stopAnim = typeCode(codeEl, {
                    text: beat.source,
                    loop: false,
                    instant: reduce,
                    delay: 14,
                    onDone: function () {
                        if (reduce) return;
                        later(mine, 1400, function () {
                            show((i + 1) % workbenchBeats.length);
                        });
                    }
                });
            } else {
                pane.classList.add("is-lab");
                meter.hidden = false;
                stopAnim = runMeter(meter, {
                    instant: reduce,
                    onDone: function () {
                        if (reduce) return;
                        later(mine, 400, function () {
                            show((i + 1) % workbenchBeats.length);
                        });
                    }
                });
            }
        }

        show(0);
    }

    var poissonSource = [
        "φ[i,j] = (",
        "  φ[i+1,j] + φ[i-1,j]",
        "  + φ[i,j+1] + φ[i,j-1])/4"
    ].join("\n");

    var sparkSource = [
        "from pyspark.sql.functions import avg, col, count",
        "",
        "ratings = spark.read.format(\"delta\").load(\"/ratings\")",
        "",
        "top = (ratings",
        "  .groupBy(\"movieId\")",
        "  .agg(avg(\"rating\").alias(\"mean\"),",
        "       count(\"*\").alias(\"n\"))",
        "  .filter(col(\"mean\") > 4)",
        "  .orderBy(col(\"mean\").desc()))",
        "",
        "top.write.mode(\"overwrite\").saveAsTable(\"gold.top\")"
    ].join("\n");

    function loopWriteKatex(el, tex, opts) {
        opts = opts || {};
        var running = true;
        var stopFn = null;
        var timer = null;

        function clear() {
            if (timer) { window.clearTimeout(timer); timer = null; }
            if (stopFn) { stopFn(); stopFn = null; }
        }

        function go() {
            if (!running) return;
            stopFn = writeKatex(el, tex, {
                instant: reduce,
                display: opts.display === false ? false : true,
                delay: opts.delay || 130,
                onDone: function () {
                    if (!running || reduce) return;
                    timer = window.setTimeout(function () {
                        if (!running) return;
                        stopFn = fadeKatex(el, { delay: 70 }, function () {
                            if (!running) return;
                            timer = window.setTimeout(go, 800);
                        });
                    }, opts.hold || 5500);
                }
            });
        }

        go();
        return function () {
            running = false;
            clear();
        };
    }

    function startCardWidget(el) {
        var kind = el.getAttribute("data-card-widget");
        el.classList.remove("is-paused");

        if (kind === "theory") {
            var theoryEq = el.querySelector(".card-widget-eq");
            if (theoryEq) {
                return loopWriteKatex(theoryEq, "F_{\\mu\\nu}=\\partial_{\\mu}A_{\\nu}-\\partial_{\\nu}A_{\\mu}", {
                    display: false,
                    delay: 140,
                    hold: 6000
                });
            }
        } else if (kind === "code") {
            var codeEl = el.querySelector("code");
            if (codeEl) {
                var named = el.getAttribute("data-code");
                var source = named === "spark" ? sparkSource : (named || poissonSource);
                return typeCode(codeEl, {
                    text: source,
                    loop: true,
                    hold: 6500,
                    instant: reduce,
                    delay: 28
                });
            }
        } else if (kind === "write") {
            var writeEq = el.querySelector(".card-widget-eq");
            var tex = el.getAttribute("data-tex") || "(uv)'=u'v+uv'";
            if (writeEq) {
                return loopWriteKatex(writeEq, tex, {
                    display: false,
                    delay: 140,
                    hold: 6000
                });
            }
        } else if (kind === "papers") {
            if (reduce) return function () {};
            var titleEl = el.querySelector(".paper-title");
            var titles = ["Lense–Thirring", "Hamming codes", "Projectile motion", "Sphere area"];
            var pi = 0;
            var ptimer = window.setInterval(function () {
                if (el.classList.contains("is-paused") || !titleEl) return;
                pi = (pi + 1) % titles.length;
                titleEl.textContent = titles[pi];
            }, 3200);
            return function () { window.clearInterval(ptimer); };
        } else if (kind === "agenda") {
            if (reduce) return function () {};
            var items = el.querySelectorAll(".agenda-board li");
            if (!items.length) return function () {};
            var ai = 0;
            var atimer = window.setInterval(function () {
                if (el.classList.contains("is-paused")) return;
                ai = (ai + 1) % items.length;
                for (var n = 0; n < items.length; n += 1) {
                    items[n].classList.toggle("is-live", n === ai);
                }
            }, 2800);
            return function () { window.clearInterval(atimer); };
        } else if (kind === "medallion" || kind === "pipeline") {
            if (reduce) return function () {};
            var layers = el.querySelectorAll(".med-layer, .pipe-step");
            if (!layers.length) return function () {};
            var mi = 0;
            var mtimer = window.setInterval(function () {
                if (el.classList.contains("is-paused")) return;
                mi = (mi + 1) % layers.length;
                for (var n = 0; n < layers.length; n += 1) {
                    layers[n].classList.toggle("is-live", n === mi);
                }
            }, 2200);
            return function () { window.clearInterval(mtimer); };
        } else if (kind === "langgraph") {
            var path = el.querySelector(".lg-flow");
            var token = el.querySelector(".lg-token");
            var nodes = el.querySelectorAll(".lg-node");
            if (!path || !token) return function () {};
            var len = 0;
            try { len = path.getTotalLength(); } catch (err) { len = 0; }
            function nearest(pt) {
                var best = 0;
                var bd = 1e9;
                for (var n = 0; n < nodes.length; n += 1) {
                    var dx = pt.x - (+nodes[n].getAttribute("data-x") || 0);
                    var dy = pt.y - (+nodes[n].getAttribute("data-y") || 0);
                    var d = dx * dx + dy * dy;
                    if (d < bd) { bd = d; best = n; }
                }
                return best;
            }
            function place(t) {
                if (!len) return;
                var pt = path.getPointAtLength(t * len);
                token.setAttribute("cx", pt.x);
                token.setAttribute("cy", pt.y);
                var live = nearest(pt);
                for (var n = 0; n < nodes.length; n += 1) {
                    nodes[n].classList.toggle("is-live", n === live);
                }
            }
            if (reduce || !len) {
                place(0.42);
                return function () {};
            }
            var stopped = false;
            var elapsed = 0;
            var last = performance.now();
            var duration = 7800;
            var raf = 0;
            function frame(now) {
                if (stopped) return;
                var dt = now - last;
                last = now;
                if (!el.classList.contains("is-paused")) {
                    elapsed = (elapsed + dt) % duration;
                    place(elapsed / duration);
                }
                raf = window.requestAnimationFrame(frame);
            }
            place(0);
            raf = window.requestAnimationFrame(frame);
            return function () {
                stopped = true;
                window.cancelAnimationFrame(raf);
            };
        } else if (kind === "agents") {
            if (reduce) return function () {};
            var agentNodes = el.querySelectorAll(".agent-node");
            if (!agentNodes.length) return function () {};
            var ai2 = 0;
            var atimer2 = window.setInterval(function () {
                if (el.classList.contains("is-paused")) return;
                ai2 = (ai2 + 1) % agentNodes.length;
                for (var n = 0; n < agentNodes.length; n += 1) {
                    agentNodes[n].classList.toggle("is-live", n === ai2);
                }
            }, 2000);
            return function () { window.clearInterval(atimer2); };
        }

        if (reduce) el.classList.add("is-paused");
        return function () {};
    }

    function initFieldCards() {
        var widgets = document.querySelectorAll("[data-card-widget]");
        if (!widgets.length) return;

        var stops = [];

        function paint(el) {
            var existing = stops.filter(function (s) { return s.el === el; })[0];
            if (existing) {
                el.classList.remove("is-paused");
                if (reduce) el.classList.add("is-paused");
                return;
            }
            var stop = startCardWidget(el);
            stops.push({ el: el, stop: stop });
        }

        function pause(el) {
            el.classList.add("is-paused");
        }

        if (typeof IntersectionObserver !== "function") {
            for (var i = 0; i < widgets.length; i += 1) paint(widgets[i]);
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) paint(entry.target);
                else pause(entry.target);
            });
        }, { threshold: 0.22 });

        for (var w = 0; w < widgets.length; w += 1) {
            widgets[w].classList.add("is-paused");
            io.observe(widgets[w]);
        }
    }

    function start() {
        document.querySelectorAll("code[data-type]").forEach(function (el) {
            if (el.closest("[data-workbench]")) return;
            typeCode(el, { loop: true });
        });
        document.querySelectorAll("[data-book]").forEach(cycleBook);
        document.querySelectorAll("[data-workbench]").forEach(cycleWorkbench);
        initFieldCards();
        window.addEventListener("resize", function () {
            document.querySelectorAll(".term-code code").forEach(fitCodeToBox);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
