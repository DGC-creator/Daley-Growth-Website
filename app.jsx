/* global React, ReactDOM */
const { useEffect, useRef, useState } = React;

/* Booking link — the Lovable-built client intake page. Edit here to
   redirect every "Book a call" CTA across the site. */
const BOOKING_URL = "https://clientintake.daleygc.com";

/* ---------------- Hero animated node grid ---------------- */

function HeroCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    const nodes = [];
    const links = []; // active connection segments — used to spawn packets
    const packets = []; // moving "data packets" traveling between nodes

    // Density scales with viewport area so the field stays full-bleed across screens.
    function densityCount() {
      const area = w * h;
      // ~1 node per 14k px², capped sensibly.
      return Math.max(60, Math.min(150, Math.round(area / 14000)));
    }
    const LINK_DIST_BASE = 200;

    function resize() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Rebuild node count if viewport size changed dramatically.
      const target = densityCount();
      while (nodes.length < target) nodes.push(makeNode());
      while (nodes.length > target) nodes.pop();
    }

    function makeNode() {
      // Two flavors: tiny "field" dots, and brighter "hubs" (slightly larger, glow harder)
      const isHub = Math.random() < 0.18;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        r: isHub ? Math.random() * 1.3 + 1.6 : Math.random() * 1.0 + 0.5,
        pulse: Math.random() * Math.PI * 2,
        isHub,
      };
    }

    resize();
    window.addEventListener("resize", resize);

    let raf;
    let lastSpawn = 0;

    function tick(t) {
      ctx.clearRect(0, 0, w, h);

      const linkDist = LINK_DIST_BASE;
      links.length = 0;

      // Update node positions
      for (const a of nodes) {
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
      }

      // Draw connection lines + collect candidate links for packet spawning
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const k = 1 - d / linkDist;
            const alpha = k * 0.22;
            ctx.strokeStyle = `rgba(236, 189, 107, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // Track the strongest links — these are eligible for data packets.
            if (k > 0.45 && (a.isHub || b.isHub)) {
              links.push({ a, b, strength: k });
            }
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        n.pulse += 0.012;
        const glow = (Math.sin(n.pulse) + 1) / 2;
        const baseAlpha = n.isHub ? 0.55 : 0.32;
        const alpha = baseAlpha + glow * 0.4;
        ctx.fillStyle = `rgba(236, 189, 107, ${alpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        // Soft halo for hubs
        if (n.isHub) {
          const haloR = n.r * 6;
          const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
          grd.addColorStop(0, `rgba(236, 189, 107, ${0.10 + glow * 0.06})`);
          grd.addColorStop(1, "rgba(236, 189, 107, 0)");
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Spawn new packets occasionally — these are the "automation" travelers.
      if (t - lastSpawn > 240 && links.length && packets.length < 18) {
        lastSpawn = t;
        const pick = links[Math.floor(Math.random() * links.length)];
        const fwd = Math.random() < 0.5;
        packets.push({
          a: fwd ? pick.a : pick.b,
          b: fwd ? pick.b : pick.a,
          t: 0,
          speed: 0.006 + Math.random() * 0.008,
          // Brand accents: 10% rust, 10% dusty blue, rest cream.
          accent:
            Math.random() < 0.10 ? "rust" :
            Math.random() < 0.11 ? "blue" :
            "cream",
          life: 1,
        });
      }

      // Update + draw packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += p.speed;
        if (p.t >= 1) {
          // Try to "hop" the packet onto a new connected hub instead of always dying.
          const cur = p.b;
          const nextLink = links.find(l =>
            (l.a === cur || l.b === cur) && l.a !== p.a && l.b !== p.a
          );
          if (nextLink && Math.random() < 0.55) {
            p.a = cur;
            p.b = nextLink.a === cur ? nextLink.b : nextLink.a;
            p.t = 0;
          } else {
            packets.splice(i, 1);
            continue;
          }
        }
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;

        // Trail
        const trailLen = 60;
        const tx = p.a.x + (p.b.x - p.a.x) * Math.max(0, p.t - p.speed * trailLen);
        const ty = p.a.y + (p.b.y - p.a.y) * Math.max(0, p.t - p.speed * trailLen);
        const grad = ctx.createLinearGradient(tx, ty, x, y);
        // Per-accent color tables
        const ACC = {
          rust:  { trail: "160, 62, 37",  head: "236, 189, 107", glow: 9 },
          blue:  { trail: "135, 172, 186", head: "135, 172, 186", glow: 9 },
          cream: { trail: "247, 238, 228", head: "247, 238, 228", glow: 7 },
        };
        const acc = ACC[p.accent] || ACC.cream;
        grad.addColorStop(0, `rgba(${acc.trail}, 0)`);
        grad.addColorStop(1, `rgba(${acc.trail}, ${p.accent === "cream" ? 0.85 : 0.9})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Packet head
        ctx.fillStyle = `rgba(${acc.head}, 1)`;
        ctx.beginPath();
        ctx.arc(x, y, 2.0, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow
        const glowR = acc.glow;
        const gg = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        gg.addColorStop(0, `rgba(${acc.trail}, ${p.accent === "cream" ? 0.45 : 0.55})`);
        gg.addColorStop(1, `rgba(${acc.trail}, 0)`);
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="hero-canvas" />;
}

/* ---------------- Reveal-on-scroll ---------------- */

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    // Hero / first-fold reveals fire immediately so the page never
    // appears empty on load (IntersectionObserver can be slow on first paint).
    const heroEls = document.querySelectorAll(".hero .reveal");
    heroEls.forEach((el) => el.classList.add("in"));

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => {
      if (!el.classList.contains("in")) io.observe(el);
    });

    // Safety net: anything still un-revealed after 2.5s is forced visible.
    const safety = setTimeout(() => {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    }, 2500);

    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, []);
}

/* ---------------- Nav ---------------- */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [overDark, setOverDark] = useState(true);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 30);

      // Detect whether the section under the nav has dark bg (for nav text color)
      const probeY = 40;
      const el = document.elementFromPoint(window.innerWidth / 2, probeY);
      if (el) {
        const sec = el.closest("[data-bg]");
        if (sec) setOverDark(sec.dataset.bg === "dark");
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkColor = overDark && !scrolled ? "var(--cream)" : "var(--ink)";

  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`} style={{ color: linkColor }}>
      <div className="nav-inner">
        <a href="#top" className="brand" aria-label="Daley Growth Consulting — home">
          <img
            src="assets/daley-logo-cream.png"
            alt="Daley Growth Consulting"
            className={`brand-wordmark nav-wordmark ${overDark && !scrolled ? "" : "to-dark"}`}
          />
        </a>
        <ul className="nav-links">
          <li><a href="#services">Services</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#results">Results</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#resources">Resources</a></li>
        </ul>
        <div className="nav-right">
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: "11px 20px", fontSize: 14 }}>
            Book a Call
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="hero bg-dark no-texture" id="top" data-bg="dark">
      <HeroCanvas />
      <div className="hero-vignette"></div>

      <div className="wrap hero-inner">
        <span className="hero-overline reveal">Build. Teach. Scale.</span>

        <h1 className="reveal hero-primary" data-delay="1">
          Digital employees<br />
          for executives and operations teams.
        </h1>

        <div className="hero-headline reveal" data-delay="2">
          <span className="beat">Less manual.</span>
          <span className="beat">More margin.</span>
          <span className="beat accent">Way more time back.</span>
        </div>

        <div className="hero-actions reveal" data-delay="3">
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary lg">
            Book a Discovery Call
            <ArrowIcon />
          </a>
          <a href="#problem" className="btn btn-ghost">
            See how it works <span className="arrow">↓</span>
          </a>
        </div>
      </div>

      <div className="wrap hero-meta">
        <div>Daley Growth Consulting · Est. 2025</div>
        <div className="scroll-cue">
          <span>Scroll</span><span className="line"></span>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7h9M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ---------------- Problem ---------------- */

function Problem() {
  return (
    <section className="problem bg-cream section-pad" id="problem" data-bg="cream">
      <div className="wrap">
        <div className="problem-grid">
          <div className="problem-text">
            <span className="eyebrow reveal">The Reality</span>
            <h2 className="reveal" data-delay="1">
              AI is everywhere. Most businesses still have no idea where to start.
            </h2>

            <div className="problem-body reveal" data-delay="2">
              <p>
                Your team is buried in manual work. Weekly reports stitched together by hand. Customer follow-ups that live in someone's head. Onboarding documents that get out of date the moment they're written. You know there's a better way, but every tool that lands in your inbox promises to be the one, and most of them are not.
              </p>
              <p>
                The gap is not technology. The gap is implementation. Knowing which workflows actually deserve to be automated, which tools earn their keep, and how to roll any of it out without breaking the parts of your business that already work. That is the work I do.
              </p>
            </div>
          </div>

          <div className="problem-anim reveal" data-delay="2">
            <WorkflowAnimation />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Workflow animation (Problem section) ----------------
   A small looping diagram that pairs with the "AI is everywhere" copy.
   On the left: four chaotic manual inputs. In the middle: the brand's
   molecule glyph as an orchestration hub. On the right: a clean
   automated output panel where completed tasks appear in sequence. */

function WorkflowAnimation() {
  const inputs = [
    { y: 80,  label: "Lead intake",  sub: "form submission" },
    { y: 148, label: "Calendar",     sub: "meeting hold"    },
    { y: 216, label: "Spreadsheet",  sub: "CSV export"      },
    { y: 284, label: "Inbox",        sub: "new email"       },
  ];
  const outputs = [
    "Lead qualified",
    "Meeting scheduled",
    "Brief drafted",
    "CRM updated",
  ];
  const HUB_X = 280;
  const HUB_Y = 202;
  const OUT_X = 348;     // output card left edge
  const OUT_W = 142;     // output card width — wide enough for longest label
  const pathFor = (yIn) => `M 148 ${yIn} Q 220 ${yIn}, ${HUB_X - 26} ${HUB_Y}`;
  return (
    <div className="workflow-anim" aria-hidden="true">
      <svg viewBox="0 0 500 400" className="workflow-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wfGrid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(89, 44, 27, 0.07)" strokeWidth="1"/>
          </pattern>
          <radialGradient id="wfHubGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(160, 62, 37, 0.22)"/>
            <stop offset="100%" stopColor="rgba(160, 62, 37, 0)"/>
          </radialGradient>
        </defs>

        {/* faint cartographic grid */}
        <rect width="500" height="400" fill="url(#wfGrid)" />

        {/* section labels — sit in a dedicated header band above everything */}
        <text x="20" y="36" fontFamily='"Glacial Indifference", "Manrope", sans-serif'
          fontSize="9" letterSpacing="0.18em" fill="#8A3320" fontWeight="600">
          MANUAL INPUTS
        </text>
        <text x={HUB_X} y="36" textAnchor="middle"
          fontFamily='"Glacial Indifference", "Manrope", sans-serif'
          fontSize="9" letterSpacing="0.18em" fill="#8A3320" fontWeight="600">
          ORCHESTRATION
        </text>
        <text x={OUT_X + OUT_W / 2} y="36" textAnchor="middle"
          fontFamily='"Glacial Indifference", "Manrope", sans-serif'
          fontSize="9" letterSpacing="0.18em" fill="#8A3320" fontWeight="600">
          OUTPUT
        </text>
        {/* thin divider under the labels so they read as a header */}
        <line x1="20" y1="48" x2="480" y2="48"
          stroke="rgba(89, 44, 27, 0.18)" strokeWidth="1" strokeDasharray="2 4"/>

        {/* connecting paths */}
        {inputs.map((inp, i) => (
          <path
            key={`l${i}`}
            d={pathFor(inp.y)}
            fill="none"
            stroke="rgba(89, 44, 27, 0.28)"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        ))}

        {/* input cards (left) */}
        {inputs.map((inp, i) => (
          <g key={`in${i}`} transform={`translate(20 ${inp.y - 22})`} className="wf-input">
            <rect width="128" height="44" rx="6"
              fill="#F7EEE4" stroke="#592C1B" strokeWidth="1.2" />
            {/* small dot indicator on left edge */}
            <circle cx="10" cy="14" r="2.4" fill="#A03E25" />
            <text x="20" y="18" fontFamily='"Glacial Indifference", "Manrope", sans-serif'
              fontSize="11" fontWeight="600" fill="#A03E25" letterSpacing="0.01em">
              {inp.label}
            </text>
            <text x="20" y="32" fontFamily='"Glacial Indifference", "Manrope", sans-serif'
              fontSize="9" fill="#8A3320" letterSpacing="0.04em">
              {inp.sub}
            </text>
            {/* right-edge port */}
            <circle cx="128" cy="22" r="2.6" fill="#592C1B"/>
          </g>
        ))}

        {/* moving packets along each path */}
        {inputs.map((inp, i) => (
          <circle key={`p${i}`} r="3.5" fill="#A03E25" className="wf-packet"
            style={{ filter: "drop-shadow(0 0 4px rgba(160,62,37,.5))" }}>
            <animateMotion dur="3.4s" repeatCount="indefinite"
              begin={`${i * 0.7}s`} path={pathFor(inp.y)} rotate="auto"/>
            <animate attributeName="opacity"
              values="0; 1; 1; 0"
              keyTimes="0; 0.08; 0.9; 1"
              dur="3.4s" begin={`${i * 0.7}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* hub: outer glow + molecule glyph (brand mark) */}
        <g transform={`translate(${HUB_X} ${HUB_Y})`} className="wf-hub">
          <circle r="68" fill="url(#wfHubGlow)" />
          <circle r="42" fill="#F7EEE4" stroke="#592C1B" strokeWidth="1.4"/>
          {/* 5 satellites in a ring, like the logo glyph */}
          {[0, 1, 2, 3, 4].map((s) => {
            const a = (s * 72 - 90) * Math.PI / 180;
            const cx = Math.cos(a) * 24;
            const cy = Math.sin(a) * 24;
            return (
              <g key={s}>
                <line x1="0" y1="0" x2={cx} y2={cy}
                  stroke="#592C1B" strokeWidth="1.2"/>
                <circle cx={cx} cy={cy} r="4.5"
                  fill="#ECBD6B" stroke="#592C1B" strokeWidth="1.4"
                  className={`wf-sat wf-sat-${s}`}/>
              </g>
            );
          })}
          {/* center node */}
          <circle r="5.5" fill="#A03E25" stroke="#592C1B" strokeWidth="1.4"/>
          {/* tiny rotating arc to suggest motion */}
          <circle r="52" fill="none" stroke="rgba(89, 44, 27, 0.25)"
            strokeWidth="1" strokeDasharray="2 5"
            style={{ transformOrigin: "0 0", animation: "wfHubSpin 22s linear infinite" }}/>
        </g>

        {/* output spine from hub to card */}
        <path d={`M ${HUB_X + 42} ${HUB_Y} L ${OUT_X} ${HUB_Y}`}
          stroke="#A03E25" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx={OUT_X} cy={HUB_Y} r="3" fill="#A03E25"/>

        {/* output card (right) — automated stream. Centered vertically on the hub. */}
        <g transform={`translate(${OUT_X} ${HUB_Y - 96})`} className="wf-output">
          <rect width={OUT_W} height="192" rx="6"
            fill="#592C1B" stroke="#592C1B" strokeWidth="1"/>
          {/* header */}
          <line x1="0" y1="32" x2={OUT_W} y2="32" stroke="rgba(247,238,228,0.14)" strokeWidth="1"/>
          <text x="16" y="21" fontFamily='"Glacial Indifference", "Manrope", sans-serif'
            fontSize="9" letterSpacing="0.2em" fill="#ECBD6B" fontWeight="600">
            AUTOMATED
          </text>
          {/* live indicator inside the card header */}
          <circle cx={OUT_W - 16} cy="19" r="3" fill="#87ACBA">
            <animate attributeName="opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/>
          </circle>

          {/* output items — staggered fade-in */}
          {outputs.map((t, i) => (
            <g key={i} transform={`translate(16 ${58 + i * 32})`} className={`wf-out wf-out-${i}`}>
              {/* check icon */}
              <circle cx="6" cy="0" r="6.5" fill="rgba(236, 189, 107, 0.18)" stroke="#ECBD6B" strokeWidth="1"/>
              <path d="M 3 0 L 5 2 L 9 -2.4" fill="none" stroke="#ECBD6B"
                strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="20" y="3.5" fontFamily='"Glacial Indifference", "Manrope", sans-serif'
                fontSize="10" fill="#F7EEE4" fontWeight="500">{t}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ---------------- Capabilities ("What we build") ---------------- */

const CAPABILITIES = [
  {
    num: "01",
    name: "AI workflow automations and tool stack consolidation",
    art: "automations",
    tag: "Workflow automation",
    body: "Real, working automations across the tools you already use. If you don't have a stack yet, we'll set up the simplest one that works. We map your manual processes, identify where AI fits, and build the systems that take ten hours a week off someone's plate. We also clean up tool sprawl, because most teams don't need more software. They need the right software actually working together.",
  },
  {
    num: "02",
    name: "Custom AI agents, internal tools, and apps",
    art: "agents",
    tag: "Custom build",
    body: "Purpose-built systems that handle real operational work. Calendar management, document drafting, research, customer triage, lead gen, dashboards, internal apps. When the off-the-shelf solution doesn't fit, we build the thing your team actually needs, designed to work inside your existing stack.",
  },
  {
    num: "03",
    name: "Team training and AI literacy",
    art: "training",
    tag: "Team training",
    body: "Live workshops, recorded sessions, and embedded coaching that takes a team from \u2018AI-curious\u2019 to \u2018AI-fluent.\u2019 We meet teams where they are and train them on the tools and workflows that matter for their roles, not generic ChatGPT 101.",
  },
];

/* Capability illustrations — same diagrammatic vocabulary as the WorkArt
   illustrations in the proof section (animated tan packets, breathing
   glows, sequenced ripples) so the two grids read as one design family. */
function CapArt({ kind }) {
  if (kind === "automations") {
    /* Five tool tiles converging through an orchestration hub into one
       clean output stream. Animated packets travel each converging path
       on staggered timing, and a cream tick drifts along the output. */
    return (
      <svg className="cap-svg cap-svg-automations" viewBox="0 0 480 260" aria-hidden="true">
        <defs>
          <linearGradient id="capAutoStream" x1="0" x2="1">
            <stop offset="0" stopColor="#ECBD6B" stopOpacity="0"/>
            <stop offset=".25" stopColor="#ECBD6B" stopOpacity=".55"/>
            <stop offset="1" stopColor="#ECBD6B" stopOpacity=".95"/>
          </linearGradient>
          {[0,1,2,3,4].map(i => {
            const cy = 38 + i * 46;
            return (
              <path key={`cap-auto-fp-${i}`} id={`capAutoFlow-${i}`}
                d={`M 92 ${cy} C 170 ${cy}, 200 130, 240 130`}/>
            );
          })}
        </defs>

        {/* five tool tiles on the left */}
        {[0,1,2,3,4].map(i => {
          const cy = 38 + i * 46;
          return (
            <g key={i}>
              <rect x="22" y={cy - 12} width="68" height="24" rx="5"
                fill="none" stroke="rgba(236, 189, 107,.4)" strokeWidth="1"/>
              <circle cx="34" cy={cy} r="2.4" fill="rgba(236, 189, 107,.55)"/>
              <line x1="44" y1={cy} x2="82" y2={cy} stroke="rgba(236, 189, 107,.22)" strokeWidth="1"/>
            </g>
          );
        })}

        {/* converging flowlines */}
        {[0,1,2,3,4].map(i => {
          const cy = 38 + i * 46;
          return (
            <path key={`flow-${i}`}
              d={`M 92 ${cy} C 170 ${cy}, 200 130, 240 130`}
              fill="none"
              stroke="rgba(236, 189, 107,.22)"
              strokeWidth="1"/>
          );
        })}

        {/* animated tan packets along each path */}
        {[0,1,2,3,4].map(i => (
          <circle key={`pkt-${i}`} r="3" fill="#ECBD6B"
            style={{ filter: "drop-shadow(0 0 4px rgba(236, 189, 107,.55))" }}>
            <animateMotion dur="3.4s" repeatCount="indefinite"
              begin={`${i * 0.62}s`} rotate="auto">
              <mpath href={`#capAutoFlow-${i}`}/>
            </animateMotion>
            <animate attributeName="opacity"
              values="0; 1; 1; 0"
              keyTimes="0; 0.1; 0.9; 1"
              dur="3.4s" begin={`${i * 0.62}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* hub */}
        <circle cx="260" cy="130" r="22" fill="rgba(160, 62, 37,.18)" stroke="#ECBD6B" strokeWidth="1.4"/>
        <circle cx="260" cy="130" r="4" fill="#ECBD6B">
          <animate attributeName="r" values="3.4; 5; 3.4" dur="2.4s" repeatCount="indefinite"/>
        </circle>

        {/* output stream */}
        <rect x="282" y="118" width="160" height="24" rx="12" fill="url(#capAutoStream)"/>
        <rect x="282" y="118" width="160" height="24" rx="12" fill="none" stroke="rgba(236, 189, 107,.6)" strokeWidth="1"/>
        <circle cx="442" cy="130" r="10" fill="none" stroke="#ECBD6B" strokeWidth="1.5"/>
        <circle cx="442" cy="130" r="4" fill="#ECBD6B">
          <animate attributeName="opacity" values=".4; 1; .4" dur="2.2s" repeatCount="indefinite"/>
        </circle>

        {/* cream tick drifting along the output */}
        <line x1="0" y1="126" x2="0" y2="134"
          stroke="rgba(247, 238, 228,.85)" strokeWidth="1.6" strokeLinecap="round">
          <animate attributeName="x1" values="296; 426" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="296; 426" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity"
            values="0; 1; 1; 0"
            keyTimes="0; 0.15; 0.85; 1"
            dur="2.4s" repeatCount="indefinite"/>
        </line>

        {/* labels */}
        <text x="22" y="250" fill="rgba(236, 189, 107,.45)" fontFamily="Inter, sans-serif" fontSize="10" letterSpacing=".15em">YOUR TOOLS</text>
        <text x="332" y="160" fill="rgba(236, 189, 107,.85)" fontFamily="Inter, sans-serif" fontSize="10" letterSpacing=".15em">AUTOMATED</text>
      </svg>
    );
  }

  if (kind === "agents") {
    /* Hex core in center representing a custom-built agent system, with
       4 satellite "task" chips around it. Sequenced check ticks at each
       satellite imply the agent completing a continuous loop of work. */
    return (
      <svg className="cap-svg cap-svg-agents" viewBox="0 0 480 260" aria-hidden="true">
        <defs>
          <radialGradient id="capAgentGlow" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#ECBD6B" stopOpacity=".4"/>
            <stop offset="1" stopColor="#ECBD6B" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* breathing core glow */}
        <circle cx="240" cy="130" r="100" fill="url(#capAgentGlow)" className="cag-glow"/>

        {/* outer dotted hex frame */}
        <polygon points="240,52 326,90 326,170 240,208 154,170 154,90"
          fill="rgba(160, 62, 37,.06)"
          stroke="rgba(236, 189, 107,.35)" strokeWidth="1"
          strokeDasharray="2 3"/>

        {/* inner solid hex core */}
        <polygon points="240,72 308,98 308,162 240,188 172,162 172,98"
          fill="rgba(160, 62, 37,.18)" stroke="#ECBD6B" strokeWidth="1.4"/>

        {/* "{ }" glyph in the core suggesting custom build */}
        <g stroke="rgba(236, 189, 107,.85)" strokeWidth="1.4" strokeLinecap="round" fill="none">
          <path d="M 222 118 q -8 0 -8 8 v 4 q 0 4 -4 4 q 4 0 4 4 v 4 q 0 8 8 8"/>
          <path d="M 258 118 q 8 0 8 8 v 4 q 0 4 4 4 q -4 0 -4 4 v 4 q 0 8 -8 8"/>
        </g>

        {/* core pulse */}
        <circle cx="240" cy="130" r="4" fill="#ECBD6B">
          <animate attributeName="r" values="3.4; 5; 3.4" dur="2.4s" repeatCount="indefinite"/>
        </circle>

        {/* 4 satellite task chips (top/right/bottom/left), connected by
            dashed lines. Each chip has a check that ticks on in sequence
            (~9s loop) to imply the agent doing rounds of operational work. */}
        {(() => {
          const sats = [
            { x: 240, y: 26,  label: "TRIAGE",  delay: 0.3 },
            { x: 434, y: 130, label: "RESEARCH", delay: 1.5 },
            { x: 240, y: 234, label: "DRAFT",   delay: 2.7 },
            { x: 46,  y: 130, label: "FOLLOWUP", delay: 3.9 },
          ];
          return sats.map((s, i) => (
            <g key={i} className={`cag-sat cag-sat-${i}`}>
              <line x1="240" y1="130" x2={s.x} y2={s.y}
                stroke="rgba(236, 189, 107,.2)" strokeWidth="1" strokeDasharray="2 4"/>
              <rect x={s.x - 36} y={s.y - 12} width="72" height="24" rx="5"
                fill="rgba(247, 238, 228,.04)"
                stroke="rgba(236, 189, 107,.4)" strokeWidth="1"/>
              {/* check icon inside chip */}
              <circle cx={s.x - 26} cy={s.y} r="4.5"
                fill="rgba(236, 189, 107,.16)"
                stroke="rgba(236, 189, 107,.55)" strokeWidth="1"
                className="cag-check-bg"/>
              <path
                d={`M ${s.x - 28.5} ${s.y} L ${s.x - 27} ${s.y + 1.5} L ${s.x - 23.5} ${s.y - 2}`}
                fill="none" stroke="#ECBD6B" strokeWidth="1.4"
                strokeLinecap="round" strokeLinejoin="round"
                className="cag-check"
                style={{ animationDelay: `${s.delay}s` }}/>
              <text x={s.x - 16} y={s.y + 3} fill="rgba(236, 189, 107,.8)"
                fontFamily="Inter, sans-serif" fontSize="9" letterSpacing=".1em">
                {s.label}
              </text>
            </g>
          ));
        })()}

        {/* outward "task complete" ripple from the core */}
        <circle cx="240" cy="130" r="40" fill="none" stroke="#ECBD6B" strokeWidth="1.2">
          <animate attributeName="r" values="36; 110" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.5; 0" dur="3s" repeatCount="indefinite"/>
        </circle>
      </svg>
    );
  }

  /* training — central knowledge spark, expanding ripples, ring of people
     glyphs that pulse on as the ripple reaches them. */
  return (
    <svg className="cap-svg cap-svg-training" viewBox="0 0 480 260" aria-hidden="true">
      <defs>
        <radialGradient id="capTrainGlow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ECBD6B" stopOpacity=".55"/>
          <stop offset="1" stopColor="#ECBD6B" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* breathing core glow */}
      <circle cx="240" cy="130" r="100" fill="url(#capTrainGlow)" className="ctr-glow"/>

      {/* central spark / knowledge node */}
      <circle cx="240" cy="130" r="22" fill="rgba(160, 62, 37,.18)" stroke="#ECBD6B" strokeWidth="1.4"/>
      <path d="M 240 116 L 246 128 L 240 144 L 234 130 Z" fill="#ECBD6B">
        <animate attributeName="opacity" values=".7; 1; .7" dur="2.2s" repeatCount="indefinite"/>
      </path>

      {/* expanding propagation ripples */}
      <circle cx="240" cy="130" r="40" fill="none" stroke="#ECBD6B" strokeWidth="1.2">
        <animate attributeName="r" values="22; 110" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6; 0" dur="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="240" cy="130" r="60" fill="none" stroke="rgba(236, 189, 107,.4)" strokeWidth="0.8" strokeDasharray="2 4">
        <animate attributeName="r" values="22; 110" dur="3s" begin="0.7s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5; 0" dur="3s" begin="0.7s" repeatCount="indefinite"/>
      </circle>

      {/* ring of 8 people glyphs — each pulses on stagger to imply
          learners catching the signal in sequence around the ring. */}
      {(() => {
        const positions = [-160, -120, -80, -40, 20, 60, 100, 140];
        const r = 110;
        return positions.map((deg, i) => {
          const cx = 240 + r * Math.cos((deg * Math.PI) / 180);
          const cy = 130 + r * Math.sin((deg * Math.PI) / 180);
          return (
            <g key={i} className={`ctr-person ctr-person-${i}`}
              transform={`translate(${cx} ${cy})`}>
              {/* head */}
              <circle cx="0" cy="-4" r="3.4" fill="none"
                stroke="rgba(236, 189, 107,.75)" strokeWidth="1.2"/>
              {/* shoulders */}
              <path d="M -6 6 q 6 -5 12 0"
                fill="none" stroke="rgba(236, 189, 107,.75)"
                strokeWidth="1.2" strokeLinecap="round"/>
            </g>
          );
        });
      })()}

      <text x="240" y="248" textAnchor="middle"
        fill="rgba(236, 189, 107,.55)"
        fontFamily="Inter, sans-serif" fontSize="9" letterSpacing=".25em">
        AI-CURIOUS → AI-FLUENT
      </text>
    </svg>
  );
}

function Services() {
  return (
    <section className="bg-dark section-pad capabilities" id="services" data-bg="dark">
      <div className="wrap">
        <div className="cap-head">
          <span className="eyebrow reveal">Capabilities</span>
          <h2 className="reveal" data-delay="1">What we build.</h2>
          <p className="cap-intro reveal" data-delay="2">
            From a small workflow fix to a custom internal tool, we work across the full stack of operational AI. Most engagements combine two or three of the capabilities below. Every engagement starts with a free discovery call where we learn about your current bottlenecks to figure out which ones make sense for you. Here's what we can do for you:
          </p>
        </div>

        <div className="cap-grid">
          {CAPABILITIES.map((c, i) => (
            <article key={c.num} className={`cap-card cap-card-${c.art} reveal`} data-delay={i + 1}>
              <div className="cap-art">
                <span className="cap-tag">{c.tag}</span>
                <CapArt kind={c.art} />
              </div>
              <div className="cap-body">
                <h3>{c.name}</h3>
                <p>{c.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="cap-cta reveal">
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary lg">
            Book a Discovery Call
            <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */

const STEPS = [
  {
    n: "01",
    title: "Discover",
    body: "A free 45-minute discovery call. You walk us through how your business runs today and where the friction is. We workshop a little, ask questions, and use everything you share to build a proposal afterward. The call isn't where we hand you answers. It's where we get the information we need to recommend the right builds for your business.",
  },
  {
    n: "02",
    title: "Design",
    body: "After the discovery call, we send you an implementation plan with the scope and the first builds we think make the most sense for your business. Pricing is a flat monthly fee (starting at $5,000/month) that covers unlimited builds, ongoing management, and measurement.",
  },
  {
    n: "03",
    title: "Build",
    body: "Once the implementation plan is signed, we start building. Most clients get their first agent deployed within 48 hours. We build and manage every agent on our infrastructure so you don't have to add another tool to maintain or another login for your team to remember. When an agent needs to read from or write to the tools you already use, we integrate it. From there, you can submit up to one new agent request per day, and we keep building.",
  },
  {
    n: "04",
    title: "Manage and measure",
    body: "Once a system is live, we manage it. Every client gets a dedicated workspace where every build, update, and benchmark lives together. We track what each system is doing for your business, double down on what's working, and rebuild what isn't. AI tools don't stay still. The systems running your business shouldn't either.",
    closer: "Data tells the truth about your operation, and we make sure you can see it.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-cream section-pad" id="how" data-bg="cream">
      <div className="wrap">
        <div className="how-head">
          <span className="eyebrow reveal">The Process</span>
          <h2 className="reveal" data-delay="1">
            How every engagement runs.
          </h2>
          <p className="how-intro reveal" data-delay="2">
            The work itself ranges widely because we don't copy and paste solutions across organizations. Every business gets a custom build. The structure stays consistent, and so does the way we work together.
          </p>
        </div>

        <div className="how-grid">
          {STEPS.map((s, i) => (
            <div key={s.n} className="step reveal" data-delay={i + 1}>
              <div className="step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              {s.closer && (
                <p className="step-closer">{s.closer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Proof / Results ---------------- */

const WORK = [
  {
    kind: "pipeline",
    tag: "Workflow automation",
    name: "Customer onboarding pipeline",
    outcome:
      "Six manual handoffs collapsed into one automated intake flow. New customers land in the right place, with the right context, without anyone touching a form.",
    stack: ["Baserow", "Notion", "Codex"],
  },
  {
    kind: "app",
    tag: "Custom internal app",
    name: "Team accountability app",
    outcome:
      "A purpose-built tracker that replaced four overlapping spreadsheets. Owners, status, and next actions in one place, updated by the team in seconds, visible to leadership in real time.",
    stack: ["Custom database", "Automatic reminders", "Automatic reports"],
  },
  {
    kind: "agent",
    tag: "Custom AI agent",
    name: "Research agent for a developer",
    outcome:
      "A bespoke agent that runs deep technical research on demand. Pulls from docs, GitHub, and internal notes, returns a citation-backed brief in minutes instead of an afternoon.",
    stack: ["Hermes", "Orgo", "Custom API"],
  },
];

/* Inline SVG illustrations for each workflow. NDA-friendly: no real
   screenshots — these are abstract diagrams that communicate the *shape*
   of each system. Cream + orange on the dark espresso card. */
function WorkArt({ kind }) {
  if (kind === "pipeline") {
    // 6 nodes feeding into 1 flowing stream — manual handoffs → automated pipe
    return (
      <svg className="work-svg work-svg-pipeline" viewBox="0 0 480 280" aria-hidden="true">
        <defs>
          <linearGradient id="pipeStream" x1="0" x2="1">
            <stop offset="0" stopColor="#ECBD6B" stopOpacity="0"/>
            <stop offset=".25" stopColor="#ECBD6B" stopOpacity=".55"/>
            <stop offset="1" stopColor="#ECBD6B" stopOpacity=".95"/>
          </linearGradient>
          {/* Reusable per-row flow paths for animateMotion */}
          {[0,1,2,3,4,5].map(i => {
            const cy = 30 + i * 36;
            return (
              <path key={`fp-${i}`} id={`pipeFlow-${i}`}
                d={`M 82 ${cy} C 160 ${cy}, 200 122, 280 122`}/>
            );
          })}
        </defs>
        {/* six small source nodes on the left */}
        {[0,1,2,3,4,5].map(i => {
          const cy = 30 + i * 36;
          return (
            <g key={i}>
              <rect x="22" y={cy - 10} width="60" height="20" rx="4"
                fill="none" stroke="rgba(236, 189, 107,.35)" strokeWidth="1"/>
              <line x1="14" y1={cy} x2="22" y2={cy} stroke="rgba(236, 189, 107,.25)" strokeWidth="1"/>
              <circle cx="34" cy={cy} r="2" fill="rgba(236, 189, 107,.5)"/>
              <line x1="42" y1={cy} x2="74" y2={cy} stroke="rgba(236, 189, 107,.18)" strokeWidth="1"/>
            </g>
          );
        })}
        {/* converging flowlines from each node into the central pipe */}
        {[0,1,2,3,4,5].map(i => {
          const cy = 30 + i * 36;
          return (
            <path key={`flow-${i}`}
              d={`M 82 ${cy} C 160 ${cy}, 200 122, 280 122`}
              fill="none"
              stroke="rgba(236, 189, 107,.22)"
              strokeWidth="1"/>
          );
        })}
        {/* the automated stream — thick orange bar with motion ticks */}
        <rect x="280" y="110" width="180" height="24" rx="12" fill="url(#pipeStream)"/>
        <rect x="280" y="110" width="180" height="24" rx="12" fill="none" stroke="rgba(236, 189, 107,.6)" strokeWidth="1"/>
        {/* exit endpoint */}
        <circle cx="460" cy="122" r="10" fill="none" stroke="#ECBD6B" strokeWidth="1.5"/>
        <circle cx="460" cy="122" r="4" fill="#ECBD6B">
          <animate attributeName="opacity" values=".4; 1; .4" dur="2.2s" repeatCount="indefinite"/>
        </circle>

        {/* Animated packets — one per source row, staggered starts so the
            pipeline reads as a continuous trickle into the unified stream. */}
        {[0,1,2,3,4,5].map(i => (
          <circle key={`pkt-${i}`} r="3" fill="#ECBD6B"
            style={{ filter: "drop-shadow(0 0 4px rgba(236, 189, 107,.55))" }}>
            <animateMotion dur="3.6s" repeatCount="indefinite"
              begin={`${i * 0.55}s`} rotate="auto">
              <mpath href={`#pipeFlow-${i}`}/>
            </animateMotion>
            <animate attributeName="opacity"
              values="0; 1; 1; 0"
              keyTimes="0; 0.1; 0.9; 1"
              dur="3.6s" begin={`${i * 0.55}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* Animated cream tick drifting along the unified output stream */}
        <line x1="0" y1="118" x2="0" y2="126"
          stroke="rgba(247, 238, 228,.85)" strokeWidth="1.6" strokeLinecap="round">
          <animate attributeName="x1" values="296; 444" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="296; 444" dur="2.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity"
            values="0; 1; 1; 0"
            keyTimes="0; 0.15; 0.85; 1"
            dur="2.4s" repeatCount="indefinite"/>
        </line>
        {/* labels */}
        <text x="22" y="270" fill="rgba(236, 189, 107,.45)" fontFamily="Inter, sans-serif" fontSize="10" letterSpacing=".15em">SIX MANUAL HANDOFFS</text>
        <text x="358" y="164" fill="rgba(236, 189, 107,.85)" fontFamily="Inter, sans-serif" fontSize="10" letterSpacing=".15em">AUTOMATED INTAKE</text>
      </svg>
    );
  }
  if (kind === "app") {
    // Stacked dashboard rows with status pills — accountability board
    const rows = [
      { name: "Owner · Sprint goal", w: 70, status: "on" },
      { name: "Owner · Quarterly OKR", w: 92, status: "on" },
      { name: "Owner · Vendor migration", w: 38, status: "risk" },
      { name: "Owner · Hiring loop", w: 60, status: "on" },
      { name: "Owner · Compliance review", w: 22, status: "blocked" },
    ];
    const colorFor = (s) =>
      s === "on" ? "#ECBD6B"
      : s === "risk" ? "#87ACBA"
      : "rgba(236, 189, 107,.35)";
    return (
      <svg className="work-svg work-svg-app" viewBox="0 0 480 260" aria-hidden="true">
        <rect x="20" y="20" width="440" height="220" rx="10"
          fill="rgba(247, 238, 228,.03)" stroke="rgba(236, 189, 107,.18)" strokeWidth="1"/>
        <line x1="20" y1="48" x2="460" y2="48" stroke="rgba(236, 189, 107,.14)" strokeWidth="1"/>
        <circle cx="36" cy="34" r="3.5" fill="rgba(236, 189, 107,.3)"/>
        <circle cx="48" cy="34" r="3.5" fill="rgba(236, 189, 107,.3)"/>
        <circle cx="60" cy="34" r="3.5" fill="rgba(236, 189, 107,.3)"/>
        {/* title row */}
        <text x="80" y="38" fill="rgba(236, 189, 107,.6)" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="500">Team accountability</text>
        <rect x="380" y="28" width="60" height="14" rx="3" fill="none" stroke="rgba(236, 189, 107,.5)" strokeWidth="1"/>
        <text x="385" y="38" fill="#ECBD6B" fontFamily="Inter, sans-serif" fontSize="9" letterSpacing=".1em">THIS WEEK</text>
        {/* column headers */}
        <text x="36" y="68" fill="rgba(236, 189, 107,.4)" fontFamily="Inter, sans-serif" fontSize="9" letterSpacing=".15em">OWNER · ITEM</text>
        <text x="240" y="68" fill="rgba(236, 189, 107,.4)" fontFamily="Inter, sans-serif" fontSize="9" letterSpacing=".15em">PROGRESS</text>
        <text x="400" y="68" fill="rgba(236, 189, 107,.4)" fontFamily="Inter, sans-serif" fontSize="9" letterSpacing=".15em">STATUS</text>
        {/* rows — each tick + progress bar animates in on a stagger,
            then the cycle loops every 9s so the dashboard reads as living */}
        {rows.map((r, i) => {
          const y = 88 + i * 28;
          return (
            <g key={i} className={`wapp-row wapp-row-${i}`}>
              <rect x="32" y={y - 14} width="14" height="14" rx="3"
                fill="none" stroke="rgba(236, 189, 107,.25)" strokeWidth="1"/>
              {r.status !== "blocked" && (
                <path className="wapp-check"
                  d={`M ${36} ${y - 7} l 3 3 l 6 -6`}
                  fill="none" stroke={colorFor(r.status)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              )}
              <text x="54" y={y - 3} fill="rgba(236, 189, 107,.78)" fontFamily="Inter, sans-serif" fontSize="11">{r.name}</text>
              {/* progress track */}
              <rect x="240" y={y - 8} width="140" height="4" rx="2" fill="rgba(236, 189, 107,.1)"/>
              <rect className="wapp-bar"
                x="240" y={y - 8} width={1.4 * r.w} height="4" rx="2" fill={colorFor(r.status)}/>
              {/* status dot */}
              <circle cx="408" cy={y - 6} r="3" fill={colorFor(r.status)}/>
              <text x="416" y={y - 3} fill="rgba(236, 189, 107,.55)" fontFamily="Inter, sans-serif" fontSize="10">
                {r.status === "on" ? "On track" : r.status === "risk" ? "At risk" : "Blocked"}
              </text>
            </g>
          );
        })}
        {/* live cursor — a small tan dot sweeping down the rows */}
        <circle className="wapp-cursor" cx="22" cy="82" r="2.5" fill="#ECBD6B"
          style={{ filter: "drop-shadow(0 0 5px rgba(236,189,107,.6))" }}/>
      </svg>
    );
  }
  // agent — central node with rays out to source orbs, citation pulse
  return (
    <svg className="work-svg work-svg-agent" viewBox="0 0 480 260" aria-hidden="true">
      <defs>
        <radialGradient id="agentGlow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ECBD6B" stopOpacity=".55"/>
          <stop offset="1" stopColor="#ECBD6B" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* breathing core glow */}
      <circle cx="240" cy="130" r="110" fill="url(#agentGlow)" className="wagent-glow"/>
      {/* outer source ring */}
      {(() => {
        const sources = [
          { a: -150, label: "DOCS" },
          { a: -110, label: "GITHUB" },
          { a:  -65, label: "NOTION" },
          { a:  -10, label: "API" },
          { a:   45, label: "RFCS" },
          { a:   95, label: "ISSUES" },
          { a:  150, label: "WIKI" },
          { a: -200, label: "STACK" },
        ];
        return sources.map((s, i) => {
          const r = 105;
          const cx = 240 + r * Math.cos((s.a * Math.PI) / 180);
          const cy = 130 + r * Math.sin((s.a * Math.PI) / 180);
          return (
            <g key={i}>
              <line x1="240" y1="130" x2={cx} y2={cy}
                stroke="rgba(236, 189, 107,.18)" strokeWidth="1"
                strokeDasharray="2 4"/>
              <circle cx={cx} cy={cy} r="14"
                fill="rgba(247, 238, 228,.04)"
                stroke="rgba(236, 189, 107,.4)" strokeWidth="1"/>
              <text x={cx} y={cy + 3} textAnchor="middle"
                fill="rgba(236, 189, 107,.65)"
                fontFamily="Inter, sans-serif" fontSize="7" letterSpacing=".1em">
                {s.label}
              </text>
              {/* citation packet traveling source → core */}
              <circle r="2" fill="#ECBD6B" opacity="0">
                <animate attributeName="opacity"
                  values="0; 1; 1; 0"
                  keyTimes="0; 0.15; 0.85; 1"
                  dur="4s" begin={`${i * 0.45}s`} repeatCount="indefinite"/>
                <animate attributeName="cx"
                  values={`${cx}; 240`}
                  dur="4s" begin={`${i * 0.45}s`} repeatCount="indefinite"/>
                <animate attributeName="cy"
                  values={`${cy}; 130`}
                  dur="4s" begin={`${i * 0.45}s`} repeatCount="indefinite"/>
              </circle>
            </g>
          );
        });
      })()}
      {/* core node */}
      <circle cx="240" cy="130" r="34" fill="rgba(236, 189, 107,.18)" stroke="#ECBD6B" strokeWidth="1.5"/>
      <circle cx="240" cy="130" r="22" fill="none" stroke="rgba(236, 189, 107,.45)" strokeWidth="1"/>
      <circle cx="240" cy="130" r="4" fill="#ECBD6B">
        <animate attributeName="r" values="3.4; 5; 3.4" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      {/* outward citation ripple from the core */}
      <circle cx="240" cy="130" r="22" fill="none" stroke="#ECBD6B" strokeWidth="1.2">
        <animate attributeName="r" values="20; 70" dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6; 0" dur="3s" repeatCount="indefinite"/>
      </circle>
      <text x="240" y="178" textAnchor="middle"
        fill="rgba(236, 189, 107,.9)"
        fontFamily="Inter, sans-serif" fontSize="9" letterSpacing=".25em" fontWeight="500">
        AGENT
      </text>
      {/* citation marks */}
      <g opacity=".75">
        <text x="240" y="116" textAnchor="middle"
          fill="#F7EEE4" fontFamily="Cormorant Garamond, serif"
          fontSize="14" fontStyle="italic">cite</text>
        <line x1="222" y1="122" x2="258" y2="122" stroke="rgba(236, 189, 107,.4)" strokeWidth=".5"/>
      </g>
    </svg>
  );
}

/* Tool brand marks. Rendered as inline SVG so they always work — no CDN
   dependency, no slug guessing, no CORS surprises. Each is normalized to a
   24×24 viewBox and uses currentColor so they pick up the chip color. */
const toolMarks = {
  claude: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Anthropic "A\" letterform mark */}
      <path d="M4.5 19 L10 5 L15.5 19"/>
      <path d="M6.7 14.5 L13.3 14.5"/>
      <path d="M17.5 5 L20 19"/>
    </svg>
  ),
  openai: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.28 9.82a5.94 5.94 0 0 0-.51-4.91 6 6 0 0 0-6.46-2.87A5.94 5.94 0 0 0 11 0a6 6 0 0 0-5.72 4.16 5.94 5.94 0 0 0-3.97 2.88 6 6 0 0 0 .74 7.06 5.94 5.94 0 0 0 .51 4.91 6 6 0 0 0 6.46 2.87A5.94 5.94 0 0 0 13.5 24a6 6 0 0 0 5.72-4.16 5.94 5.94 0 0 0 3.97-2.88 6 6 0 0 0-.91-7.14zM13.5 22.43a4.45 4.45 0 0 1-2.85-1.04l.14-.08 4.78-2.76a.78.78 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.59a4.5 4.5 0 0 1-4.52 4.49zM3.83 18.3a4.45 4.45 0 0 1-.53-3.01l.14.08 4.78 2.76a.78.78 0 0 0 .79 0l5.83-3.37v2.33a.08.08 0 0 1-.03.06l-4.83 2.79a4.5 4.5 0 0 1-6.15-1.65zm-1.26-10.5a4.5 4.5 0 0 1 2.34-1.97v5.7a.78.78 0 0 0 .39.68L11.13 15.5l-2.02 1.17a.07.07 0 0 1-.07 0l-4.83-2.79a4.5 4.5 0 0 1-1.64-6.16zm16.59 3.86l-5.84-3.37 2.02-1.17a.07.07 0 0 1 .07 0l4.83 2.79a4.5 4.5 0 0 1-.69 8.13v-5.7a.77.77 0 0 0-.4-.68zm2.01-3.02l-.14-.08-4.78-2.76a.78.78 0 0 0-.79 0L9.63 9.18V6.85a.08.08 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.15L6.51 11.62a.07.07 0 0 1-.04-.05V5.97A4.5 4.5 0 0 1 13.85 2.5l-.14.08-4.78 2.76a.78.78 0 0 0-.39.68v6.77zm1.1-2.36L12.25 8.9 14.85 10.4v3l-2.6 1.5-2.6-1.5z"/>
    </svg>
  ),
  gemini: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c0 6 6 12 12 12-6 0-12 6-12 12 0-6-6-12-12-12 6 0 12-6 12-12z"/>
    </svg>
  ),
  notion: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.46 1.83 14.4.91c1.22-.1 1.53-.03 2.3.53l3.18 2.24c.52.38.7.49.7.9v15.4c0 .76-.28 1.21-1.24 1.28l-11.55.7c-.73.04-1.07-.07-1.45-.55L4 19.13c-.4-.55-.58-.96-.58-1.44V3.4c0-.62.28-1.13 1.04-1.57zM14.7 3.27 5.5 3.97c-.46.04-.55.27-.36.43l1.55 1.13c.34.21.79.27 1.18.24l10.7-.64c.45-.04.7-.3.55-.65l-.55-1.42c-.2-.51-.49-.9-1.03-.86l-2.84.07zM4.7 7v13.05c0 .69.34.94 1.13.9l11.83-.69c.79-.04.88-.52.88-1.07V6.21c0-.55-.21-.84-.69-.8L5.5 6.13c-.51.04-.8.31-.8.86zm12.05.97c.07.31 0 .61-.31.65l-.55.11v8c0 1.39-.5 2.13-2.07 2.21-2.43.14-3.06-.74-4.08-2.13l-2.43-3.83v3.69l1.07.24s0 .61-.86.61l-2.36.14c-.07-.14 0-.5.24-.55l.62-.17V8.95l-.86-.07c-.07-.31.1-.76.59-.8l2.53-.17 3.49 5.34V8.69l-.9-.1c-.07-.38.21-.66.55-.69z"/>
    </svg>
  ),
  zapier: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm9.5 0c0 .77-.07 1.52-.2 2.25l-6.32-.01c.04-.18.07-.35.07-.54-.4-.39-.93-.6-1.5-.62l4.46-4.47A11.95 11.95 0 0 0 16.13.7l-4.45 4.46c.05.18.1.36.13.54a2.27 2.27 0 0 0-.59-.07c-.21 0-.4.03-.59.07L6.18.7a11.96 11.96 0 0 0-3.88 7.91l4.46 4.47c-.18.05-.36.1-.54.13.04.19.07.38.07.59 0 .2-.03.39-.07.58l-4.46.01c-.13.73-.2 1.48-.2 2.25 0 1.93.46 3.74 1.27 5.36L7.2 17.5c-.05-.18-.1-.36-.13-.54a2.4 2.4 0 0 0 1.18.32c.41 0 .8-.11 1.13-.3l-4.46 4.45A11.95 11.95 0 0 0 12 23.92c2.06 0 3.99-.52 5.69-1.43l-4.46-4.46c.18-.05.36-.1.54-.13a2.4 2.4 0 0 0 1.18.32 2.4 2.4 0 0 0 1.18-.32l4.46 4.46A11.95 11.95 0 0 0 23.5 12z"/>
    </svg>
  ),
  n8n: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="4.5" cy="12" r="2"/>
      <circle cx="12" cy="6" r="2"/>
      <circle cx="12" cy="18" r="2"/>
      <circle cx="19.5" cy="12" r="2"/>
      <path d="M6.5 12h3.5M14 12h3.5M12 8v8" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  replit: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5V10H4.5A1.5 1.5 0 0 1 3 8.5v-4zM13 10h7a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 20 17h-7v-7zM3 17h7a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 10 24H4.5A1.5 1.5 0 0 1 3 22.5v-5.5z"/>
    </svg>
  ),
  loom: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 13H13l3.2 3.2-1.4 1.4L11.6 14.4 11.6 19h-2v-4.6L6.4 17.6 5 16.2 8.2 13H3.6v-2h4.6L5 7.8l1.4-1.4 3.2 3.2V5h2v4.6l3.2-3.2L16.2 7.8 13 11h4.5z"/>
    </svg>
  ),
  slack: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.4 15.2A2.1 2.1 0 0 1 3.3 17.3 2.1 2.1 0 0 1 1.2 15.2 2.1 2.1 0 0 1 3.3 13h2.1v2.2zm1.1 0A2.1 2.1 0 0 1 8.6 13a2.1 2.1 0 0 1 2.1 2.1v5.3a2.1 2.1 0 0 1-2.1 2.1 2.1 2.1 0 0 1-2.1-2.1v-5.3z"/>
      <path d="M8.6 5.4A2.1 2.1 0 0 1 6.5 3.3 2.1 2.1 0 0 1 8.6 1.2a2.1 2.1 0 0 1 2.1 2.1v2.1H8.6zm0 1.1A2.1 2.1 0 0 1 10.7 8.6a2.1 2.1 0 0 1-2.1 2.1H3.3A2.1 2.1 0 0 1 1.2 8.6a2.1 2.1 0 0 1 2.1-2.1h5.3z"/>
      <path d="M18.4 8.6A2.1 2.1 0 0 1 20.5 6.5a2.1 2.1 0 0 1 2.1 2.1 2.1 2.1 0 0 1-2.1 2.1h-2.1V8.6zm-1.1 0A2.1 2.1 0 0 1 15.2 10.7a2.1 2.1 0 0 1-2.1-2.1V3.3a2.1 2.1 0 0 1 2.1-2.1 2.1 2.1 0 0 1 2.1 2.1v5.3z"/>
      <path d="M15.2 18.4A2.1 2.1 0 0 1 17.3 20.5a2.1 2.1 0 0 1-2.1 2.1 2.1 2.1 0 0 1-2.1-2.1v-2.1h2.1zm0-1.1A2.1 2.1 0 0 1 13.1 15.2 2.1 2.1 0 0 1 15.2 13.1h5.3a2.1 2.1 0 0 1 2.1 2.1 2.1 2.1 0 0 1-2.1 2.1h-5.3z"/>
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.55a10.7 10.7 0 0 0 3.23-8.11zM12 22.5c2.97 0 5.46-.98 7.28-2.65L15.72 17.1a6.46 6.46 0 0 1-9.62-3.4H2.43v2.85A10.7 10.7 0 0 0 12 22.5zM6.1 13.7a6.45 6.45 0 0 1 0-3.4V7.43H2.43a10.7 10.7 0 0 0 0 9.13L6.1 13.7zM12 6.5c1.62 0 3.07.56 4.21 1.65l3.16-3.16A10.7 10.7 0 0 0 12 1.5a10.7 10.7 0 0 0-9.57 5.93L6.1 10.3A6.46 6.46 0 0 1 12 6.5z"/>
    </svg>
  ),
  microsoft: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2 2h9.5v9.5H2V2zm10.5 0H22v9.5h-9.5V2zM2 12.5h9.5V22H2v-9.5zm10.5 0H22V22h-9.5v-9.5z"/>
    </svg>
  ),
  granola: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Spiral glyph */}
      <path d="M 12 12
               Q 12.8 12 12.8 12.8
               Q 12.8 14 11.4 14
               Q 9.6 14 9.6 12
               Q 9.6 9.6 12 9.6
               Q 15 9.6 15 12.4
               Q 15 16 11.2 16
               Q 7 16 7 12
               Q 7 7 12 7
               Q 17.6 7 17.6 12.6"/>
    </svg>
  ),
  wisprflow: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {/* Audio equalizer bars */}
      <rect x="5"   y="9"   width="2"   height="6"  rx="1"/>
      <rect x="8.3" y="7"   width="2"   height="10" rx="1"/>
      <rect x="11"  y="4.5" width="2"   height="15" rx="1"/>
      <rect x="13.7" y="7"  width="2"   height="10" rx="1"/>
      <rect x="17"  y="9"   width="2"   height="6"  rx="1"/>
    </svg>
  ),
  scribe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5L8 18l11-11-3-3L5 15l-1 4.5z"/>
      <path d="M14.5 6.5l3 3"/>
    </svg>
  ),
  lovable: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.4l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.58L12 21.4z"/>
    </svg>
  ),
};

const TOOLS = [
  { name: "Anthropic", icon: "claude" },
  { name: "OpenAI", icon: "openai" },
  { name: "Gemini", icon: "gemini" },
  { name: "Notion", icon: "notion" },
  { name: "Zapier", icon: "zapier" },
  { name: "n8n", icon: "n8n" },
  { name: "Replit", icon: "replit" },
  { name: "Lovable", icon: "lovable" },
  { name: "Wispr Flow", icon: "wisprflow" },
  { name: "Granola", icon: "granola" },
  { name: "Loom", icon: "loom" },
  { name: "Scribe", icon: "scribe" },
  { name: "Slack", icon: "slack" },
  { name: "Google Workspace", icon: "google" },
  { name: "Microsoft Office", icon: "microsoft" },
  { name: "& more!" },
];

function ToolChip({ tool }) {
  const isMore = tool.name === "& more!";
  const mark = tool.icon ? toolMarks[tool.icon] : null;
  return (
    <span className={`tool ${isMore ? "tool-more" : ""}`}>
      {mark ? <span className="tool-logo">{mark}</span> : null}
      <span className="tool-name">{tool.name}</span>
    </span>
  );
}

/* ---------------- Measured outcomes (sits under the case-study grid) ----
   Three metrics that map 1:1 to the three WORK cards above. Each metric
   has a tiny SVG motif borrowed from its parent card to reinforce the
   alignment. */

const METRICS = [
  {
    kind: "pipeline",
    number: "10 hrs/wk",
    label: "saved in admin bottlenecks",
    context: "One automated intake flow replacing six manual handoffs.",
  },
  {
    kind: "app",
    number: "$80,000/yr",
    label: "in ops costs eliminated",
    context: "A purpose-built tracker replacing four overlapping spreadsheets.",
  },
  {
    kind: "agent",
    number: "12% YOY",
    label: "revenue lift in the quarter the agent went live",
    context: "Faster research means faster shipping. More product out the door, more revenue in the same window.",
  },
];

/* Tiny motif glyphs — each fragment echoes a piece of the parent WorkArt. */
function MetricMotif({ kind }) {
  if (kind === "pipeline") {
    // Six small dots converging into one bar — mini intake flow
    return (
      <svg className="metric-motif" viewBox="0 0 96 28" aria-hidden="true">
        {[0,1,2,3,4,5].map(i => (
          <g key={i}>
            <circle cx={8} cy={4 + i * 4} r="1.6" fill="rgba(236, 189, 107, 0.65)"/>
            <path d={`M 11 ${4 + i * 4} C 30 ${4 + i * 4}, 40 14, 60 14`}
              fill="none" stroke="rgba(236, 189, 107, 0.32)" strokeWidth="0.8"/>
          </g>
        ))}
        <rect x="60" y="11" width="30" height="6" rx="3" fill="rgba(236, 189, 107, 0.85)"/>
        <circle cx="92" cy="14" r="2" fill="#ECBD6B"/>
      </svg>
    );
  }
  if (kind === "app") {
    // Three checklist ticks — mini accountability tracker
    return (
      <svg className="metric-motif" viewBox="0 0 96 28" aria-hidden="true">
        {[0,1,2].map(i => {
          const y = 6 + i * 8;
          return (
            <g key={i}>
              <rect x="6" y={y - 4} width="8" height="8" rx="1.5"
                fill="none" stroke="rgba(236, 189, 107, 0.5)" strokeWidth="1"/>
              <path d={`M 8 ${y} L 9.6 ${y + 1.6} L 12.4 ${y - 1.6}`}
                fill="none" stroke="#ECBD6B" strokeWidth="1.2"
                strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="20" y={y - 2} width={40 + i * 10} height="3" rx="1.5"
                fill="rgba(236, 189, 107, 0.32)"/>
            </g>
          );
        })}
      </svg>
    );
  }
  // agent — node burst (central dot + rays)
  return (
    <svg className="metric-motif" viewBox="0 0 96 28" aria-hidden="true">
      <g transform="translate(48 14)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const a = (deg * Math.PI) / 180;
          return (
            <line key={deg}
              x1={Math.cos(a) * 6} y1={Math.sin(a) * 6}
              x2={Math.cos(a) * 12} y2={Math.sin(a) * 12}
              stroke="rgba(236, 189, 107, 0.55)" strokeWidth="0.9"
              strokeLinecap="round"/>
          );
        })}
        <circle r="5" fill="rgba(236, 189, 107, 0.18)" stroke="#ECBD6B" strokeWidth="1"/>
        <circle r="1.6" fill="#ECBD6B"/>
      </g>
    </svg>
  );
}

function MeasuredOutcomes() {
  return (
    <div className="metrics-block">
      <p className="metrics-intro reveal">
        These aren't case-study numbers from a deck. They are what the systems above are actually doing for the businesses running them.
      </p>
      <div className="metrics-grid">
        {METRICS.map((m, i) => (
          <div key={m.kind} className="metric-card reveal" data-delay={i + 1}>
            <div className="metric-number">{m.number}</div>
            <div className="metric-rule" aria-hidden="true"></div>
            <div className="metric-label">{m.label}</div>
            <p className="metric-context">{m.context}</p>
            <MetricMotif kind={m.kind} />
          </div>
        ))}
      </div>
      <p className="metrics-foot">
        Outcomes reported by Daley Growth clients. Numbers are real; names withheld for client confidentiality.
      </p>
    </div>
  );
}

function Proof() {
  return (
    <section className="bg-dark section-pad" id="results" data-bg="dark">
      <div className="wrap">
        <div className="proof-head">
          <span className="eyebrow reveal">What We've Built</span>
          <h2 className="reveal" data-delay="1">Real workflows. Real outcomes.</h2>
        </div>

        <div className="proof-grid">
          {WORK.map((w, i) => (
            <article key={w.name} className={`proof-card proof-card-${w.kind} reveal`} data-delay={i + 1}>
              <div className="proof-art">
                <span className="proof-tag">{w.tag}</span>
                <WorkArt kind={w.kind} />
              </div>
              <div className="proof-body">
                <h3>{w.name}</h3>
                <p>{w.outcome}</p>
                {w.stack && (
                  <ul className="proof-stack" aria-label="Built with">
                    {w.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>

        <MeasuredOutcomes />

        <div className="tools-bar reveal">
          <div className="tools-label">Tools we work with</div>
          <div className="tools-marquee" aria-label="Tools we work with">
            <div className="tools-track">
              {TOOLS.concat(TOOLS).map((t, i) => (
                <ToolChip key={t.name + "-" + i} tool={t} />
              ))}
            </div>
            <div className="tools-fade tools-fade-l" aria-hidden="true"></div>
            <div className="tools-fade tools-fade-r" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- About ---------------- */

function About() {
  return (
    <section className="about bg-cream section-pad" id="about" data-bg="cream">
      <div className="wrap">
        <div className="about-wrap">
          <div className="about-head reveal">
            <span className="eyebrow">About</span>
            <h2>I've been where you are. And I've built what you're trying to build.</h2>
          </div>

          <div className="about-body reveal" data-delay="1">
            <figure className="about-photo" aria-label="Ann-Marie Berdar - Daley, Founder">
              <img
                src="assets/founder-portrait.png"
                alt="Ann-Marie Berdar - Daley, founder of Daley Growth Consulting"
                className="about-photo-img"
              />
              <figcaption className="about-photo-cap">Ann-Marie Berdar - Daley, Founder</figcaption>
            </figure>

            <p>
              For the last decade I've been building, scaling, and franchising a real brick and mortar business through every phrase of growth. Every fire, every spreadsheet that everyone updates and no one trusts, every lease negotiation, every site selection, every franchise training. I know what it feels like to be the founder who can't take a weekend off because nothing runs without you, and I know what it takes to fix that. When AI started getting genuinely useful, I did what I've always done. I rolled up my sleeves and figured out how to make it work for a real 8-figure business with real margins. Not the hypothetical version of a business in a vendor pitch deck. Mine. AI didn't replace my team. It made my team three times more effective, and it freed me up to do the work only I could do.
            </p>
            <p>
              Then I got obsessed with the tech itself. I learned how to code. I learned how things actually worked under the hood. I started building agents and internal apps for founder friends. What started as a passion project grew into this. Building a franchised company taught me how to think in systems. Learning to code taught me how to solve them. Daley Growth Consulting is the career I was meant to do. I bring that same instinct to other founders and leadership teams. I am ruthless about ROI, allergic to vapor, and fluent in the trade-offs you actually make when you are running a company.
            </p>

            <blockquote className="about-pullquote">
              <span className="about-pullquote-mark" aria-hidden="true">"</span>
              <p>Most AI consultants can talk about systems. I have spent a decade building them.</p>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

/* Each FAQ has a plain-text answer (used to inject FAQPage JSON-LD for
   AI-search + Google rich results) plus a JSX answer (with anchored
   internal links). The list is always-open so LLMs and crawlers index
   everything without needing to render an accordion. */

const FAQS = [
  {
    n: "01",
    q: "How quickly can I get started with an AI consultant?",
    aText: "Most Daley Growth Consulting clients get their first AI agent deployed within 48 hours of signing the implementation plan. From there, you can submit up to one new agent request per day, and we keep building. Engagements don't have an end date because the value compounds. The longer we work together, the more your operation becomes a system that runs itself.",
    a: (
      <p>
        Most <a href="#about">Daley Growth Consulting</a> clients get their first <a href="#services">AI agent</a> deployed within 48 hours of signing the implementation plan. From there, you can submit up to one new agent request per day, and we keep building. Engagements don't have an end date because the value compounds. The longer we work together, the more your operation becomes a system that runs itself.
      </p>
    ),
  },
  {
    n: "02",
    q: "Do I need to know what AI solution I need before the discovery call?",
    aText: "No. Most Daley Growth Consulting clients book the discovery call knowing they have manual work eating their team's time, but not knowing what to do about it. That's exactly when the conversation is most useful. We workshop your operation together on the 45-minute call, then send you an implementation plan afterward with the specific AI builds we think make the most sense for your business.",
    a: (
      <p>
        No. Most Daley Growth Consulting clients book the <a href="#contact">discovery call</a> knowing they have manual work eating their team's time, but not knowing what to do about it. That's exactly when the conversation is most useful. We workshop your operation together on the 45-minute call, then send you an implementation plan afterward with the specific AI builds we think make the most sense for your business.
      </p>
    ),
  },
  {
    n: "03",
    q: "Will an AI consultant work inside my existing tools?",
    aText: "You don't need to buy any new tools to work with Daley Growth Consulting. We build and manage every AI agent on DGC infrastructure, so you're not adding another tool to maintain or another login for your team to remember. When an agent needs to read from or write to the tools you already use (Notion, Slack, Google Workspace, your CRM, whatever your stack is), we integrate it. The flat monthly fee covers the build and the infrastructure.",
    a: (
      <p>
        You don't need to buy any new tools to work with Daley Growth Consulting. We build and manage every <a href="#services">AI agent</a> on DGC infrastructure, so you're not adding another tool to maintain or another login for your team to remember. When an agent needs to read from or write to the tools you already use (Notion, Slack, Google Workspace, your CRM, whatever your stack is), we integrate it. The flat monthly fee covers the build and the infrastructure.
      </p>
    ),
  },
  {
    n: "04",
    q: "How do you handle data privacy and security when building AI agents?",
    aText: "Daley Growth Consulting signs an NDA before any work begins. We default to enterprise tiers of every AI tool we use (Claude, ChatGPT, and others), and we never train models on your data. You get a written data-handling summary as part of every engagement. You own every output, document, and dataset the AI agents produce for your business, and that ownership does not change if we ever stop working together.",
    a: (
      <p>
        <a href="#about">Daley Growth Consulting</a> signs an NDA before any work begins. We default to enterprise tiers of every AI tool we use (Claude, ChatGPT, and others), and we never train models on your data. You get a written data-handling summary as part of every engagement. You own every output, document, and dataset the AI agents produce for your business, and that ownership does not change if we ever stop working together.
      </p>
    ),
  },
  {
    n: "05",
    q: "What happens during the AI consulting discovery call?",
    aText: "The Daley Growth Consulting discovery call is 45 minutes, structured for depth. Once you book, we send you a short set of questions to think through beforehand so the call skips the surface-level discovery and gets straight to what matters. On the call, you walk us through how your business runs today and where the friction is. We workshop together, ask questions, and use everything you share to build a proposal afterward. The call is not where we hand you answers. It's where we gather what we need to recommend the right AI builds for your business.",
    a: (
      <p>
        The Daley Growth Consulting <a href="#contact">discovery call</a> is 45 minutes, structured for depth. Once you book, we send you a short set of questions to think through beforehand so the call skips the surface-level discovery and gets straight to what matters. On the call, you walk us through how your business runs today and where the friction is. We workshop together, ask questions, and use everything you share to build a proposal afterward. The call is not where we hand you answers. It's where we gather what we need to recommend the right AI builds for your business.
      </p>
    ),
  },
  {
    n: "06",
    q: "What does ongoing AI agent management include?",
    aText: "Ongoing management is the core of the Daley Growth Consulting model. Every client gets a dedicated workspace where every build, update, and benchmark lives together. You can submit up to one new AI agent request per day. We track what each system is doing for your business, double down on what's working, and rebuild what isn't. AI tools change fast, and the systems running your business shouldn't stay still either.",
    a: (
      <p>
        Ongoing management is the core of the <a href="#about">Daley Growth Consulting</a> model. Every client gets a dedicated workspace where every build, update, and benchmark lives together. You can submit up to one new AI agent request per day. We track what each system is doing for your business, double down on what's working, and rebuild what isn't. AI tools change fast, and the systems running your business shouldn't stay still either.
      </p>
    ),
  },
  {
    n: "07",
    q: "How much does AI consulting cost per month?",
    aText: "Daley Growth Consulting charges a flat monthly fee starting at $5,000 per month. The fee covers unlimited AI builds (up to one new agent request per day), ongoing management of every agent we build for you, integrations into your existing tools, a dedicated client workspace, weekly check-ins, and the benchmarks that prove what's working. There are no per-project invoices, no per-agent charges, and no surprise scope conversations. Larger or more complex engagements may scale upward from the starting fee based on the design phase.",
    a: (
      <p>
        Daley Growth Consulting charges a flat monthly fee starting at $5,000 per month. The fee covers unlimited AI builds (up to one new agent request per day), ongoing management of every agent we build for you, integrations into your existing tools, a dedicated client workspace, weekly check-ins, and the benchmarks that prove what's working. There are no per-project invoices, no per-agent charges, and no surprise scope conversations. Larger or more complex engagements may scale upward from the starting fee based on the design phase.
      </p>
    ),
  },
  {
    n: "08",
    q: "What happens to my AI agents and custom builds if I cancel?",
    aText: "You can cancel anytime. There is no annual contract with Daley Growth Consulting. If we built you custom apps or internal tools (for example, a purpose-built tracker, a dashboard, or an internal workflow app), those are yours. We hand them over with documentation so your team can run them independently. If we built you AI agents that do ongoing operational work, those live on DGC infrastructure and stop running on cancellation. You keep all of your data, all of your outputs, and full ownership of anything the agents produced while we were working together. You do not keep the agents themselves. This is intentional. AI agents need constant maintenance because models change weekly, APIs update, and best practices evolve. The flat monthly fee buys you the outcome (digital employees doing real operational work) without the burden of maintaining the infrastructure underneath them. Most clients stay because ongoing management is worth more than a one-time delivery.",
    a: (
      <>
        <p>You can cancel anytime. There is no annual contract with Daley Growth Consulting. What happens at cancellation depends on what we built for you.</p>
        <p>If we built you custom apps or internal tools (for example, a purpose-built tracker, a dashboard, or an internal workflow app), those are yours. We hand them over with documentation so your team can run them independently going forward.</p>
        <p>If we built you <a href="#services">AI agents</a> (the digital employees doing ongoing operational work for your business), those live on DGC infrastructure and stop running on cancellation. You keep all of your data, all of your outputs, and full ownership of anything the agents produced while we were working together. You do not keep the agents themselves.</p>
        <p>This is intentional for the agent side of the work. AI agents need constant maintenance because models change weekly, APIs update, and best practices evolve. The flat monthly fee buys you the outcome — digital employees doing real operational work — without the burden of maintaining the infrastructure underneath them. Most clients stay because ongoing management is worth more than a one-time delivery.</p>
      </>
    ),
  },
  {
    n: "09",
    q: "What industries does Daley Growth Consulting work with?",
    aText: "Daley Growth Consulting works with founder-led and leadership-team-led companies starting at $5M in revenue, with small to medium teams. We have the most depth in food and beverage, hospitality, franchise systems, QSR (quick service restaurants), multi-location service businesses, real estate, manufacturing, logistics, and insurance agencies. The workflows generalize across most operations-heavy industries. We do not currently take on clients in healthcare or finance because both are heavily regulated and require specialized compliance work outside our wheelhouse.",
    a: (
      <p>
        <a href="#about">Daley Growth Consulting</a> works with founder-led and leadership-team-led companies starting at $5M in revenue, with small to medium teams. We have the most depth in food and beverage, hospitality, franchise systems, QSR (quick service restaurants), multi-location service businesses, real estate, manufacturing, logistics, and insurance agencies. The workflows generalize across most operations-heavy industries. We do not currently take on clients in healthcare or finance because both are heavily regulated and require specialized compliance work outside our wheelhouse.
      </p>
    ),
  },
];

function FAQ() {
  /* Single-open accordion model. Only one FAQ is expanded at a time;
     clicking another closes the previous one and opens the new one.
     Tracks the current phase: null = closed, "typing" = brief beat,
     "open" = answer shown. */
  const [activeN, setActiveN] = useState(null);
  const [phase, setPhase] = useState(null);   // "typing" | "open" | null
  const typingTimer = useRef(null);

  const toggle = (n) => {
    /* Cancel any pending typing→open promotion before changing state */
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
    /* Clicking the currently-active question = close it */
    if (activeN === n) {
      setActiveN(null);
      setPhase(null);
      return;
    }
    /* Otherwise: switch to the new one — start in "typing", then "open" */
    setActiveN(n);
    setPhase("typing");
    typingTimer.current = setTimeout(() => {
      setPhase("open");
      typingTimer.current = null;
    }, 850);
  };

  /* Inject FAQPage structured data so Google + LLM crawlers can parse the
     full Q&A as an entity. Runs once on mount; safe-removes on unmount. */
  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.aText },
      })),
    };
    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.id = "faq-jsonld";
    tag.textContent = JSON.stringify(ld);
    document.head.appendChild(tag);
    return () => {
      const existing = document.getElementById("faq-jsonld");
      if (existing) existing.remove();
    };
  }, []);

  return (
    <section className="bg-dark section-pad faq" id="resources" data-bg="dark">
      <div className="wrap">
        <div className="faq-head">
          <span className="eyebrow reveal">Ask Ann-Marie</span>
          <h2 className="reveal" data-delay="1">Common questions, answered.</h2>
          <p className="faq-intro reveal" data-delay="2">
            Frequently Asked Questions about working with <a href="#about">Daley Growth Consulting</a>, an AI consulting firm for founder-led businesses. Tap any question to read Ann-Marie's answer. If you don't see your question here, the <a href="#contact">45-minute discovery call</a> is the right next step.
          </p>
        </div>

        <div className="faq-thread">
          {FAQS.map((f) => {
            const rowPhase = activeN === f.n ? phase : null;     // null | "typing" | "open"
            const isExpanded = rowPhase === "typing" || rowPhase === "open";
            const answerId = `faq-answer-${f.n}`;
            return (
              <article
                key={f.n}
                className={`faq-row reveal ${rowPhase === "typing" ? "typing" : ""} ${rowPhase === "open" ? "open" : ""}`}
              >
                {/* Question — clickable. h3 wraps the button so heading
                    semantics + interactive role are both preserved. */}
                <div className="faq-msg faq-msg-question">
                  <div className="faq-sender">
                    <span className="faq-sender-name">Founder asked</span>
                  </div>
                  <h3 className="faq-q-wrap">
                    <button
                      type="button"
                      className="faq-q-btn faq-bubble faq-bubble-question"
                      onClick={() => toggle(f.n)}
                      aria-expanded={isExpanded}
                      aria-controls={answerId}
                    >
                      <span className="faq-num" aria-hidden="true">{f.n}</span>
                      <span className="faq-q">{f.q}</span>
                      <span className="faq-q-caret" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                          <path d="M3 5 L7 9 L11 5" fill="none"
                            stroke="currentColor" strokeWidth="1.6"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </button>
                  </h3>
                </div>

                {/* Typing indicator — animates on open, collapses on close */}
                <div className="faq-typing" aria-hidden="true">
                  <span></span><span></span><span></span>
                </div>

                {/* Answer — collapsed by default. Kept in the DOM (max-height:0)
                    rather than display:none so crawlers and the JSON-LD
                    schema both see the full content. */}
                <div
                  id={answerId}
                  className="faq-msg faq-msg-answer"
                  role="region"
                  aria-labelledby={`faq-q-${f.n}`}
                  aria-hidden={rowPhase !== "open"}
                >
                  <div className="faq-sender">
                    <img
                      src="assets/founder-portrait.png"
                      alt="Ann-Marie's headshot"
                      className="faq-avatar"
                    />
                    <span className="faq-sender-name">Ann-Marie · Daley Growth Consulting</span>
                  </div>
                  <div className="faq-bubble faq-bubble-answer">{f.a}</div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */

function FinalCTA() {
  return (
    <section className="bg-dark final-cta" id="contact" data-bg="dark">
      <div className="wrap">
        <h2 className="reveal">
          Ready to stop guessing<br/>and <span className="accent">start building?</span>
        </h2>
        <p className="reveal" data-delay="1">
          Forty-five minutes, no pitch, no pressure. We will figure out together whether AI infrastructure is your next best investment, or whether it is not. Either way you walk away with a clearer picture of what to do next.
        </p>
        <div className="reveal" data-delay="2">
          <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary lg">
            Book Your Discovery Call
            <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="site-footer bg-darkest" data-bg="dark">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <div className="footer-brand" style={{ display: "flex", alignItems: "center" }}>
              <img
                src="assets/daley-logo-cream.png"
                alt="Daley Growth Consulting"
                className="brand-wordmark"
              />
            </div>
            <p className="footer-tag">Digital employees for executives and operations teams.</p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#services">Services</a></li>
              <li><a href="#how">How It Works</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="media.html">Media</a></li>
              <li><a href={BOOKING_URL} target="_blank" rel="noopener noreferrer">Book a Call</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Connect</h4>
            <ul>
              <li><a href="#">LinkedIn</a></li>
              <li><a href="#">Substack · AI Blog</a></li>
              <li><a href="#">hello@daleygc.com</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Daley Growth Consulting</span>
          <span className="footer-stamp">Build. Teach. Scale.</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- App ---------------- */

function App() {
  useReveal();
  return (
    <>
      <Nav />
      <Hero />
      <Problem />
      <Services />
      <HowItWorks />
      <Proof />
      <About />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
