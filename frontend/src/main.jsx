import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { motion, MotionConfig } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import {
  Hexagon,
  Building2,
  LayoutDashboard,
  Users,
  DoorOpen,
  Wrench,
  Wallet,
  CalendarDays,
  Megaphone,
  FileText,
  Bell,
  Settings,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Check,
  Leaf,
  Download,
  ScanLine,
  Ticket,
  MessageCircle,
  CheckCircle2,
  Clock,
  Activity,
  Home,
  Heart,
  Mail,
  Phone,
  MapPin,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Upload,
  Copy,
  RefreshCw,
} from "lucide-react";
import {
  request,
  initAuth,
  sb,
  selectSociety,
  currentSociety,
  download,
} from "./api";
import { specs, menus, createRoles, label, fieldLabel, money } from "./config";
import "./styles.css";
import "./reference.css";
import { CommandCenter, WorkspaceLaunchpad } from "./command-center";
const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10000, refetchOnWindowFocus: false },
  },
});
const Context = createContext();
const useApp = () => useContext(Context);
const iconMap = {
  overview: LayoutDashboard,
  buildings: Building2,
  floors: Building2,
  units: Home,
  members: Users,
  unit_occupancies: Users,
  visitor_passes: Ticket,
  visitor_entries: DoorOpen,
  complaints: Wrench,
  invoices: Wallet,
  payments: Wallet,
  facilities: Leaf,
  facility_bookings: CalendarDays,
  announcements: Megaphone,
  community_events: CalendarDays,
  polls: MessageCircle,
  documents: FileText,
  notifications: Bell,
  settings: Settings,
  scanner: ScanLine,
  audit_logs: ShieldCheck,
  security_incidents: ShieldCheck,
};
function Icon({ name, ...p }) {
  const I = iconMap[name] || MessageCircle;
  return <I size={19} {...p} />;
}
function Brand() {
  return (
    <Link className="brand" to="/">
      <Hexagon size={24} />
      <span>
        Society<span className="os">OS</span>
      </span>
    </Link>
  );
}
function App() {
  const [config, setConfig] = useState(),
    [me, setMe] = useState(null),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState("");
  async function refresh() {
    try {
      const u = await request("/auth/me");
      setMe(u);
      if (
        !u.memberships.some((m) => m.society_id === currentSociety) &&
        u.memberships[0]
      )
        selectSociety(u.memberships[0].society_id);
      return u;
    } catch {
      setMe(null);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    initAuth()
      .then((c) => {
        setConfig(c);
        refresh();
      })
      .catch((e) => {
        setToast(e.message);
        setReady(true);
      });
  }, []);
  useEffect(() => {
    const expire = () => {
      setMe(null);
      qc.clear();
    };
    window.addEventListener("societyos:session-expired", expire);
    return () =>
      window.removeEventListener("societyos:session-expired", expire);
  }, []);
  function say(t) {
    setToast(t);
    setTimeout(() => setToast(""), 5500);
  }
  return (
    <Context.Provider value={{ me, config, refresh, say, ready }}>
      <MotionConfig reducedMotion="user">
        <Routes>
          <Route
            path="/"
            element={
              <Protected>
                <Landing />
              </Protected>
            }
          />
          <Route path="/visitor/verify/:token" element={<VisitorPassPreview />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth signup />} />
          <Route path="/forgot-password" element={<Auth reset />} />
          <Route path="/reset-password" element={<Auth update />} />
          <Route
            path="/app/:section?"
            element={
              !ready ? <Loading /> : me ? <Shell /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/:page"
            element={
              <Protected>
                <PublicPage />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        {toast && (
          <div className="toast" role="status">
            <CheckCircle2 size={20} />
            {toast}
            <button aria-label="Dismiss" onClick={() => setToast("")}>
              <X size={16} />
            </button>
          </div>
        )}
      </MotionConfig>
    </Context.Provider>
  );
}
function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Getting things ready…
    </div>
  );
}
function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="publicnav">
      <Brand />
      <nav className={open ? "open" : ""}>
        <Link to="/features">Features</Link>
        <Link to="/solutions">Solutions</Link>
        <Link to="/how-it-works">How it works</Link>
        <Link to="/pricing">Pricing</Link>
      </nav>
      <div className="navright">
        <Link to="/login">Sign in</Link>
        <Link className="button small" to="/signup">
          Get started <ArrowUpRight size={16} />
        </Link>
        <button
          className="mobileonly"
          aria-label="Open navigation"
          onClick={() => setOpen(!open)}
        >
          <Menu />
        </button>
      </div>
    </header>
  );
}
function CityArt() {
  return (
    <div className="cityart" aria-hidden="true">
      <div className="sun" />
      <div className="art-cloud c1" />
      <div className="art-cloud c2" />
      <div className="tower t1">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="tower t2">
        {Array.from({ length: 20 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="tower t3">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="trees">
        <span />
        <span />
        <span />
      </div>
      <div className="ground" />
    </div>
  );
}
const features = [
  [
    "visitor_passes",
    "A warm welcome. A secure entrance.",
    "Create time-limited visitor passes and keep every arrival accounted for.",
  ],
  [
    "complaints",
    "Small issues, swiftly resolved.",
    "Report a problem, follow its progress, and confirm a job well done.",
  ],
  [
    "invoices",
    "Clear bills. No guesswork.",
    "View invoices, submit payment records, and track verified balances.",
  ],
  [
    "facility_bookings",
    "More room for good moments.",
    "Reserve shared spaces without the back-and-forth.",
  ],
];
function Landing() {
  return (
    <>
      <PublicNav />
      <main>
        <section className="hero">
          <div className="orb one" />
          <div className="orb two" />
          <div className="hero-copy">
            <div className="eyebrow light">
              <span /> A LITTLE SMARTER. A LOT MORE CONNECTED.
            </div>
            <h1>
              A better place
              <br />
              to <em>belong.</em>
            </h1>
            <p>
              From the front gate to your front door.
              <br />
              One thoughtful space for your entire community.
            </p>
            <div className="hero-actions">
              <Link className="button sky" to="/signup">
                Bring your community together <ArrowUpRight size={18} />
              </Link>
              <Link className="textlink" to="/login">
                Explore the local demo <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-note">
              <ShieldCheck size={16} /> Built around people. Designed for
              everyday life.
            </div>
          </div>
          <div className="hero-art">
            <CityArt />
            <motion.div
              className="floating-note note1"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
            >
              <span className="iconcircle mint">
                <CheckCircle2 />
              </span>
              <div>
                <b>Welcome home.</b>
                <small>Your community, connected.</small>
              </div>
            </motion.div>
            <motion.div
              className="floating-note note2"
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              <span className="iconcircle pink">
                <Heart />
              </span>
              <div>
                <b>Little things. Better living.</b>
                <small>Less admin. More community.</small>
              </div>
            </motion.div>
          </div>
        </section>
        <div className="trustbar">
          <span>ONE COMMUNITY. EVERY PERSPECTIVE.</span>
          {[
            "Society admins",
            "Residents & owners",
            "Security teams",
            "Maintenance staff",
          ].map((x) => (
            <span key={x}>
              <Check size={15} />
              {x}
            </span>
          ))}
        </div>
        <section className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">EVERYDAY, SIMPLIFIED</div>
              <h2>
                Everything your community needs.
                <br />
                <span>Nothing standing in its way.</span>
              </h2>
            </div>
            <Link to="/features" className="textlink green">
              Explore all features <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="feature-grid">
            {features.map(([k, title, desc], i) => (
              <motion.article
                key={k}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={"feature-card f" + i}
              >
                <span className="iconcircle">
                  <Icon name={k} />
                </span>
                <span className="index">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
                <Link to="/signup" aria-label={"Get started with " + label(k)}>
                  <ArrowUpRight />
                </Link>
              </motion.article>
            ))}
          </div>
        </section>
        <section className="split-section">
          <div className="mini-preview">
            <div className="preview-top">
              <Brand />
              <span className="badge">A calmer day</span>
            </div>
            <h3>A place for every little detail.</h3>
            {[
              ["Visitor expected", "A secure pass, ready at the gate.", "sky"],
              ["Repair requested", "The right team, kept in the loop.", "pink"],
              ["Lounge reserved", "Your plans, without the overlap.", "mint"],
            ].map(([a, b, c]) => (
              <div className="preview-row" key={a}>
                <span className={"iconcircle " + c}>
                  <Check size={19} />
                </span>
                <div>
                  <b>{a}</b>
                  <small>{b}</small>
                </div>
                <ChevronRight size={18} />
              </div>
            ))}
            <small className="muted">
              Illustration of the SocietyOS workflow
            </small>
          </div>
          <div>
            <div className="eyebrow">LESS ADMIN. MORE LIVING.</div>
            <h2>
              Your neighbourhood,
              <br />
              <em>working in harmony.</em>
            </h2>
            <p>
              Give everyone a clear place to start. Residents make requests.
              Teams get the details. Administrators see the whole picture.
            </p>
            <ul className="checklist">
              <li>
                <CheckCircle2 /> Separate workspaces for every role
              </li>
              <li>
                <CheckCircle2 /> Clear updates at every step
              </li>
              <li>
                <CheckCircle2 /> Private records for each society
              </li>
            </ul>
            <Link className="button" to="/how-it-works">
              See how it works <ArrowRight size={18} />
            </Link>
          </div>
        </section>
        <section className="section how">
          <div className="eyebrow">A FRESH START, IN THREE STEPS</div>
          <h2>From setup to settled in.</h2>
          <div className="steps">
            {[
              [
                "01",
                "Make it your community",
                "Create your society and add your buildings and units.",
              ],
              [
                "02",
                "Bring your people in",
                "Invite residents and staff to their own workspaces.",
              ],
              [
                "03",
                "Let everyday life flow",
                "Manage visitors, requests, bills, and bookings in one place.",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="cta">
          <Leaf size={40} />
          <h2>A happier community starts here.</h2>
          <p>
            Make room for the things that make a neighbourhood feel like home.
          </p>
          <Link className="button sky" to="/signup">
            Create your community <ArrowUpRight size={18} />
          </Link>
        </section>
        <section className="section faq">
          <h2>A few things you might be wondering.</h2>
          {[
            [
              "Do residents need a separate app?",
              "No. SocietyOS runs in the browser on a phone, tablet, or computer.",
            ],
            [
              "Does SocietyOS process real payments?",
              "No. Residents submit a payment reference and optional proof. Administrators verify it before the outstanding balance changes.",
            ],
            [
              "Can I try it on my computer?",
              "Yes. The supplied local project includes fictional societies and role-based demo access.",
            ],
            [
              "Is cloud deployment included?",
              "Deployment configuration and instructions are included. You supply your own hosting and Supabase account credentials.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={17} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
function Footer() {
  return (
    <footer>
      <Brand />
      <p>Thoughtfully connected. Naturally better.</p>
      <div>
        {["about", "contact", "privacy", "terms"].map((p) => (
          <Link key={p} to={"/" + p}>
            {p[0].toUpperCase() + p.slice(1)}
          </Link>
        ))}
      </div>
      <small>
        © {new Date().getFullYear()} SocietyOS · Community management, made
        human.
      </small>
    </footer>
  );
}
function PublicPage() {
  const { page } = useParams();
  const content = {
    features: [
      "Everyday essentials, beautifully connected.",
      "One home for visitors, maintenance, billing, bookings, announcements, documents, polls, and community events.",
    ],
    solutions: [
      "A workspace for every neighbour.",
      "Administrators coordinate the community. Residents manage their own home. Guards verify arrivals. Maintenance staff track assigned repairs. Platform administrators manage society access.",
    ],
    "how-it-works": [
      "A simple start. A smoother everyday.",
      "Create an account and your society. Add a building, floor, and unit. Invite a resident and assign their unit. They can then create visitor passes, request maintenance, pay invoices manually, and reserve facilities.",
    ],
    about: [
      "Better places begin with better connections.",
      "SocietyOS is a Web Technology project built to make residential administration clearer and more accessible. It uses React, Express, and PostgreSQL, with separate society workspaces and role-based access.",
    ],
    contact: [
      "Let’s get your community connected.",
      "Already signed in? Use Support in your workspace to submit a request to your administrator. For deployment help, see the installation and troubleshooting guide included with the project.",
    ],
    privacy: [
      "Your community, your information.",
      "SocietyOS stores account details, memberships, visitors, requests, billing records, bookings, and uploaded files. Access is restricted by society and role. Your hosting administrator controls retention, deletion, backups, and deployment. This project policy is a starting template; the operator must adapt it before a real launch.",
    ],
    terms: [
      "A clear foundation for your community.",
      "Use SocietyOS only for societies you are authorized to manage. Do not upload unlawful material or share visitor tokens publicly. Payment records are manual and require administrator verification. Plan limits are application settings, not paid subscriptions. Operators must finalize terms and support arrangements before launch.",
    ],
  };
  if (page === "pricing")
    return (
      <>
        <PublicNav />
        <section className="section page-intro">
          <div className="eyebrow">ROOM TO GROW</div>
          <h1>A plan for your community.</h1>
          <p>
            All project features included. These are configurable unit limits,
            with no automatic charges.
          </p>
          <div className="plans">
            {[
              ["Starter", "50"],
              ["Community", "250"],
              ["Estate", "1,000"],
            ].map(([n, count], i) => (
              <article
                className={"panel " + (i === 1 ? "featured" : "")}
                key={n}
              >
                <span className="eyebrow">{n}</span>
                <h2>
                  {count}
                  <small> units</small>
                </h2>
                <p>
                  Visitors, maintenance, billing, reservations, and community
                  tools.
                </p>
                <Link className="button" to="/signup">
                  Get started <ArrowUpRight size={16} />
                </Link>
              </article>
            ))}
          </div>
          <p className="muted">
            Hosting costs and limits depend on your provider. No payment gateway
            or paid AI service is required.
          </p>
        </section>
        <Footer />
      </>
    );
  const c = content[page];
  if (!c) return <Navigate to="/" />;
  return (
    <>
      <PublicNav />
      <section className="section page-intro">
        <div className="eyebrow">SOCIETYOS · {page.replaceAll("-", " ")}</div>
        <h1>{c[0]}</h1>
        <p>{c[1]}</p>
        {["features", "solutions", "how-it-works"].includes(page) && (
          <div className="feature-grid">
            {features.map(([k, t, d]) => (
              <article className="feature-card" key={k}>
                <Icon name={k} />
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        )}
        <Link className="button" to="/signup">
          Get started <ArrowRight size={18} />
        </Link>
      </section>
      <Footer />
    </>
  );
}
function Auth({ signup, reset, update }) {
  const { config, refresh, say } = useApp(),
    navigate = useNavigate();
  const {
    setValue,
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  function enter(role) {
    setSelectedRole(role);
    if (config?.demo) setValue("email", role + "@demo.societyos.local");
  }
  async function submit(d) {
    setError("");
    try {
      if (reset) {
        if (!sb)
          throw Error(
            "Password reset emails require Supabase Auth. In local mode, use the demo role buttons or create another account.",
          );
        const { error } = await sb.auth.resetPasswordForEmail(d.email, {
          redirectTo: location.origin + "/reset-password",
        });
        if (error) throw error;
        say("If your account exists, a reset email has been requested.");
        return;
      }
      if (update) {
        if (!sb) throw Error("Password reset is available with Supabase Auth.");
        const { error } = await sb.auth.updateUser({ password: d.password });
        if (error) throw error;
        say("Password updated.");
        navigate("/login");
        return;
      }
      if (sb) {
        const { data, error } = signup
          ? await sb.auth.signUp({
              email: d.email,
              password: d.password,
              options: {
                data: { name: d.name },
                emailRedirectTo: location.origin + "/login",
              },
            })
          : await sb.auth.signInWithPassword({
              email: d.email,
              password: d.password,
            });
        if (error) throw error;
        if (signup && !data.session) {
          say(
            "Check your email to verify your account, then sign in to create your society.",
          );
          navigate("/login");
          return;
        }
      } else
        await request(signup ? "/auth/signup" : "/auth/login", {
          method: "POST",
          body: d,
        });
      await refresh();
      qc.clear();
      navigate("/app/overview");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="app reference-app auth-reference">
      <ReferenceSidebar locked />
      <div className="workspace">
        <CommandCenter
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          items={items}
          navigate={(key) => navigate("/app/" + key)}
        />
        <ReferenceTopbar locked />
        <main className="maincontent">
          <button type="button" className="cc-launcher" onClick={() => setCommandOpen(true)} aria-label="Open quick navigation">
            <Search size={15} /> Jump to a workspace <kbd>Ctrl / ⌘ K</kbd>
          </button>
          <div className="workspace-kicker">
            SOCIETYOS / SECURE {signup ? "REGISTRATION" : "SIGN IN"}
          </div>
          <div className="pageheading">
            <div>
              <h1>
                {signup
                  ? "Create your SocietyOS account"
                  : reset
                    ? "Recover your account"
                    : update
                      ? "Choose a new password"
                      : "Welcome back to SocietyOS"}
              </h1>
              <p>Secure access · Your community workspace</p>
            </div>
          </div>
          <section className="authform reference-authform">
            <div className="eyebrow">SECURE ACCESS</div>
            <h2>
              {signup
                ? "Start your community"
                : reset
                  ? "Reset your password"
                  : update
                    ? "Set your new password"
                    : "Sign in to your community"}
            </h2>
            <p>One account, permissions tailored to your role.</p>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit(submit)}>
              {signup && (
                <label>
                  Your name
                  <input
                    {...register("name")}
                    required
                    minLength={2}
                    placeholder="Your full name"
                  />
                </label>
              )}
              {!update && (
                <label className="compact-label">
                  <span>Email address</span>
                  <input
                    aria-label="Email address"
                    {...register("email")}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Email address"
                  />
                </label>
              )}
              {!reset && (
                <label className="compact-label">
                  <span>Password</span>
                  <input
                    aria-label="Password"
                    {...register("password")}
                    type="password"
                    required
                    minLength={signup || update ? 10 : 1}
                    autoComplete={signup ? "new-password" : "current-password"}
                    placeholder={
                      signup ? "Password · at least 10 characters" : "Password"
                    }
                  />
                </label>
              )}
              {signup && !sb && (
                <label>
                  Society name
                  <input
                    {...register("society")}
                    required
                    minLength={3}
                    placeholder="Your society name"
                  />
                </label>
              )}
              <button disabled={isSubmitting} className="button full">
                {isSubmitting
                  ? "Signing in…"
                  : reset
                    ? "Send reset link"
                    : update
                      ? "Update password"
                      : signup
                        ? "Create account"
                        : "Sign in securely"}
                <ArrowRight size={15} />
              </button>
            </form>
            {!signup && !reset && !update && (
              <>
                <h3>Access levels</h3>
                <div className="access-cards">
                  {[
                    ["resident", "Resident", Home],
                    ["guard", "Security guard", ShieldCheck],
                    ["maintenance", "Maintenance staff", Wrench],
                    ["admin", "Administrator", LayoutDashboard],
                  ].map(([key, title, RoleIcon]) => (
                    <button
                      key={key}
                      className={selectedRole === key ? "selected" : ""}
                      onClick={() => enter(key)}
                    >
                      <span aria-hidden="true"><RoleIcon size={25}/></span>
                      <b>{title}</b>
                    </button>
                  ))}
                </div>
                {config?.demo && (
                  <div className="local-access-note">
                    <p>
                      Select a local account above, then enter the password
                      printed in your startup terminal.
                    </p>
                    <button onClick={() => enter("superadmin")}>
                      Use platform administrator account
                    </button>
                  </div>
                )}
              </>
            )}
            <div className="auth-links">
              <Link to={signup ? "/login" : "/signup"}>
                {signup ? "Already registered? Sign in" : "Create an account"}
              </Link>
              {!reset && !update && !signup && (
                <Link to="/forgot-password">Forgot password?</Link>
              )}
            </div>
            <small className="auth-lock">
              <ShieldCheck size={13} /> All screens and records require sign-in.
            </small>
          </section>
        </main>
      </div>
    </div>
  );
}
const navGroups = [
  { title: "Dashboard", keys: ["overview", "platform"] },
  {
    title: "Residents & units",
    keys: ["members", "units", "unit_occupancies", "buildings", "floors"],
  },
  {
    title: "Visitors & QR",
    keys: ["visitor_passes", "scanner", "visitor_entries"],
  },
  { title: "Complaints", keys: ["complaints", "feedback"] },
  { title: "Maintenance", keys: ["maintenance", "shifts"] },
  { title: "Billing & payments", keys: ["invoices", "payments"] },
  { title: "Facilities", keys: ["facilities", "facility_bookings"] },
  {
    title: "Announcements",
    keys: [
      "announcements",
      "polls",
      "community_events",
      "documents",
      "lost_found_reports",
    ],
  },
  { title: "Reports", keys: ["reports", "audit_logs"] },
  {
    title: "Staff & settings",
    keys: [
      "settings",
      "emergency_contacts",
      "security_incidents",
      "notifications",
      "support_requests",
    ],
  },
];
const referenceTitles = {
  members: "Know every home, securely",
  units: "Know every home, securely",
  visitor_passes: "Safe entry, smoother arrivals",
  complaints: "Every issue has an owner",
  maintenance: "Today’s assigned work",
  invoices: "Clear finances, simpler collections",
  payments: "Every payment, clearly verified",
  facilities: "Shared spaces, thoughtfully managed",
  facility_bookings: "Shared spaces, thoughtfully managed",
  announcements: "Keep everyone in the loop",
  polls: "Give your community a voice",
  reports: "Insights that improve communities",
  scanner: "Verify guests in seconds",
  settings: "Your community, your settings",
  documents: "Important information, in one place",
};
function Protected({ children }) {
  const { me, ready } = useApp();
  return !ready ? (
    <Loading />
  ) : me ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
}
function ReferenceSidebar({
  locked = false,
  items = [],
  section = "",
  mobile = false,
  onClose = () => {},
  onLogout,
  me,
  membership,
  onSociety,
  role,
}) {
  // Use the authenticated membership role, never a role chosen in the browser.
  // Each link is individually allowlisted; a shared category cannot expose
  // another role's screens through its first/default destination.
  const allowed = new Set(menus[role] || []);
  const visible = locked ? [] : items.filter((key) => allowed.has(key));
  const roleNames = {
    admin: { overview: "Admin dashboard", members: "Residents", units: "Units", visitor_passes: "Visitor passes", settings: "Society settings" },
    resident: { overview: "My dashboard", units: "My unit", visitor_passes: "My visitors", invoices: "My bills", payments: "My payments", complaints: "My complaints", settings: "My settings" },
    guard: { overview: "Security dashboard", scanner: "Scan visitor QR", visitor_passes: "Visitor verification", visitor_entries: "Gate entry history", security_incidents: "Security incidents", shifts: "My shifts" },
    maintenance: { overview: "Maintenance dashboard", maintenance: "Assigned work", complaints: "Service requests", shifts: "My shifts" },
  };
  const entries = locked
    ? navGroups.map((g) => ({ key: g.keys[0], title: g.title, locked: true }))
    : visible.map((key) => ({ key, title: roleNames[role]?.[key] || label(key), locked: false }));
  return (
    <aside className={"sidebar reference-sidebar " + (mobile ? "shown" : "")}>
      <Brand />
      <button
        className="sidebarclose mobileonly"
        onClick={onClose}
        aria-label="Close navigation"
      >
        <X />
      </button>
      <nav aria-label="Workspace navigation">
        {entries.map(({ key, title, locked: disabled }) =>
          disabled ? (
            <button key={key} aria-disabled="true" title="Sign in to open this workspace">
              <Icon name={key} /><span>{title}</span>
            </button>
          ) : (
            <Link key={key} title={title} className={section === key ? "active" : ""}
              to={"/app/" + key} onClick={onClose}>
              <Icon name={key} /><span>{title}</span>
            </Link>
          )
        )}
      </nav>
      <div className="reference-sidebar-footer">
        {!locked && me?.memberships.length > 0 && (
          <label className="reference-society-label">
            Your society
            <select
              aria-label="Select society"
              value={membership?.society_id || ""}
              onChange={(e) => onSociety(e.target.value)}
            >
              {me.memberships.map((m) => (
                <option key={m.id} value={m.society_id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <span>
          <i /> {locked ? "Sign in required" : "System operational"}
        </span>
        <small>© {new Date().getFullYear()} SocietyOS</small>
        {!locked && (
          <button className="usercard" aria-label="Sign out" onClick={onLogout}>
            <span>{me?.user.name}</span>
            <span>
              Sign out <LogOut size={14} />
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
function GlobalSearch() {
  const [q, setQ] = useState(""),
    [open, setOpen] = useState(false);
  const { data: results = [] } = useQuery({
    queryKey: ["global-search", currentSociety, q],
    queryFn: () => request("/search?q=" + encodeURIComponent(q)),
    enabled: q.trim().length >= 2,
  });
  return (
    <div className="global-search">
      <Search size={16} />
      <input
        aria-label="Search the workspace"
        placeholder="Search residents, units, complaints…"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className="search-results">
          <button className="search-dismiss" onClick={() => setOpen(false)}>
            <X size={14} />
            Close search
          </button>
          {results.length ? (
            results.map((r) => (
              <Link
                key={r.module + r.id}
                to={"/app/" + r.module + "?q=" + encodeURIComponent(r.title)}
                onClick={() => {
                  setOpen(false);
                  setQ("");
                }}
              >
                <Icon name={r.module} />
                <span>
                  <b>{r.title}</b>
                  <small>{label(r.module)}</small>
                </span>
                <ChevronRight size={15} />
              </Link>
            ))
          ) : (
            <p>No matching records.</p>
          )}
        </div>
      )}
    </div>
  );
}
function ReferenceTopbar({ locked = false, me, onMenu, section, items = [] }) {
  return (
    <header className="topbar reference-topbar">
      <button
        className="mobileonly"
        aria-label="Toggle sidebar"
        onClick={onMenu}
      >
        <Menu size={21} />
      </button>
      {locked ? (
        <div className="global-search locked-search">
          <Search size={15} />
          <input
            aria-label="Search unavailable until sign-in"
            disabled
            placeholder="Search residents, units, complaints…"
          />
        </div>
      ) : me?.memberships.length ? (
        <GlobalSearch />
      ) : (
        <span className="muted">Platform overview</span>
      )}
      {!locked && (navGroups.find(g=>g.keys.includes(section))?.keys.filter(k=>items.includes(k)).length||0)>1 && (
        <details className="context-nav-menu">
          <summary>
            More <ChevronDown size={13} />
          </summary>
          <ContextTabs section={section} items={items} />
        </details>
      )}
      <div className="reference-account">
        {locked ? (
          <span>
            <ShieldCheck size={14} /> Secure sign in
          </span>
        ) : (
          <>
            {items.includes("notifications")&&<Link to="/app/notifications">
              <Bell size={14} /> Notifications
            </Link>}
            <Link
              to={me?.memberships.length ? "/app/settings" : "/app/platform"}
            >
              <span className="account-dot" />
              {me?.user.name}
              <ChevronDown size={13} />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
function ContextTabs({ section, items }) {
  const group = navGroups.find((g) => g.keys.includes(section));
  const tabs = group?.keys.filter((k) => items.includes(k)) || [];
  if (tabs.length < 2) return null;
  return (
    <nav className="context-tabs" aria-label="Section navigation">
      {tabs.map((k) => (
        <Link
          key={k}
          className={section === k ? "active" : ""}
          to={"/app/" + k}
        >
          {k === "maintenance" ? "Assigned work" : label(k)}
        </Link>
      ))}
    </nav>
  );
}
function SummaryCards({ items }) {
  return (
    <div className="stats reference-stats">
      {items.map(([title, value, note, tone = "mint", href]) => {
        const body = (
          <>
            <p>{title}</p>
            <h2>{value ?? "—"}</h2>
            <span className={"metric-tag " + tone}>{note}</span>
          </>
        );
        return href ? (
          <Link to={href} className="stat" key={title}>
            {body}
          </Link>
        ) : (
          <div className="stat" key={title}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
function OperationalSnapshot({ data }) {
  const bars = [
    [
      "Maintenance",
      data.complaints
        ? Math.round((data.resolved / data.complaints) * 100)
        : 100,
    ],
    ["Payments", data.total ? Math.round((data.paid / data.total) * 100) : 100],
    [
      "Security",
      data.passes ? Math.round((data.validPasses / data.passes) * 100) : 100,
    ],
  ];
  return (
    <section className="panel operational">
      <h3>Operational snapshot</h3>
      <div className="operational-score">
        {data.score}
        <small>/100</small>
      </div>
      <p>Community health score</p>
      {bars.map(([name, value]) => (
        <div className="operational-bar" key={name}>
          <div>
            <b>{name}</b>
            <span>{value}%</span>
          </div>
          <div className="progress-track">
            <i style={{ width: value + "%" }} />
          </div>
        </div>
      ))}
      <details>
        <summary>How this is calculated</summary>
        <p>
          {data.formula} Bars show resolved requests, verified collections, and
          currently valid passes. Empty categories receive full marks.
        </p>
      </details>
    </section>
  );
}
function ReferenceTrend({ data, title = "Visitor & collection trends" }) {
  return (
    <section className="panel reference-chart">
      <h3>{title}</h3>
      <p className="chart-subtitle">
        Verified collections (PKR) and visitor entries · last six months
      </p>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={8}>
            <CartesianGrid vertical={false} stroke="#edf3f6" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#73899a" }}
            />
            <YAxis yAxisId="money" hide />
            <YAxis yAxisId="visitors" orientation="right" hide />
            <Tooltip />
            <Bar
              name="Collection (PKR)"
              yAxisId="money"
              dataKey="collected"
              fill="#65bfe5"
              radius={[7, 7, 0, 0]}
              isAnimationActive={
                !matchMedia("(prefers-reduced-motion: reduce)").matches
              }
            />
            <Bar
              name="Visitor entries"
              yAxisId="visitors"
              dataKey="visitors"
              fill="#f3a5c8"
              radius={[7, 7, 0, 0]}
              isAnimationActive={
                !matchMedia("(prefers-reduced-motion: reduce)").matches
              }
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chartlegend">
        <span>
          <i className="blue" /> Collection (PKR)
        </span>
        <span>
          <i className="pinkdot" /> Visitor entries · separate scale
        </span>
      </div>
    </section>
  );
}
function Overview({ role, name }) {
  const { me } = useApp();
  const membership = me.memberships.find(
    (m) => m.society_id === currentSociety,
  );
  const {
    data: d,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["analytics", currentSociety, role],
    queryFn: () => request("/analytics"),
  });
  const { data: ann = [] } = useQuery({
    queryKey: ["announcements", currentSociety],
    queryFn: () => request("/announcements"),
  });
  if (isLoading) return <Loading />;
  if (error) return <div className="error">{error.message}</div>;
  if (role === "guard") return <Scanner />;
  if (role === "maintenance")
    return <Records module="complaints" role={role} maintenance />;
  const stats =
    role === "admin"
      ? [
          [
            "Total residents",
            d.residents,
            "Active members",
            "mint",
            "/app/members",
          ],
          [
            "Visitors today",
            d.todayVisitors,
            "Live activity",
            "sky",
            "/app/visitor_passes",
          ],
          [
            "Open complaints",
            d.open,
            d.urgent + " urgent",
            "pink",
            "/app/complaints",
          ],
          [
            "Monthly collection",
            money(d.monthlyCollected),
            "Verified payments",
            "mint",
            "/app/invoices",
          ],
        ]
      : [
          ["My homes", d.units, "Assigned units", "mint", "/app/units"],
          [
            "Visitor passes",
            d.visitors,
            "Your invitations",
            "sky",
            "/app/visitor_passes",
          ],
          [
            "Open requests",
            d.open,
            "Needs attention",
            "pink",
            "/app/complaints",
          ],
          [
            "Outstanding",
            money(d.outstanding),
            "Your balance",
            "mint",
            "/app/invoices",
          ],
        ];
  return (
    <>
      <div className="pageheading">
        <div>
          <h1>
            {role === "admin"
              ? "Good morning, " + name
              : "Welcome home, " + name}
          </h1>
          <p>
            {role === "admin" ? "Society Dashboard" : "Resident Dashboard"} ·{" "}
            {membership?.name}
          </p>
        </div>
      </div>
      <SummaryCards items={stats} />
      <div className="reference-dashboard-top">
        <ReferenceTrend data={d.trend} />
        <OperationalSnapshot data={d} />
      </div>
      <div className="reference-dashboard-bottom">
        <section className="panel">
          <h3>Recent activity</h3>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.recent?.length ? (
                  d.recent.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <b>{r.title}</b>
                      </td>
                      <td>{r.body}</td>
                      <td>
                        <Status value={r.read_at ? "read" : "new"} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>
                      Your community activity will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel reference-quick">
          <h3>Quick actions</h3>
          <div>
            {(role === "admin"
              ? [
                  [
                    "members",
                    "Add resident",
                    "Invite someone to your community",
                  ],
                  ["invoices", "Create invoice", "Manage society charges"],
                  ["complaints", "Review requests", "Keep repairs moving"],
                  ["announcements", "Publish update", "Keep everyone informed"],
                ]
              : [
                  [
                    "visitor_passes",
                    "Invite a visitor",
                    "Create a secure QR pass",
                  ],
                  [
                    "complaints",
                    "Report an issue",
                    "Track a maintenance request",
                  ],
                  [
                    "facility_bookings",
                    "Book a facility",
                    "Reserve a shared space",
                  ],
                  ["invoices", "View my bills", "See your latest balance"],
                ]
            ).map(([k, t, s]) => (
              <Link key={k} to={"/app/" + k}>
                <Icon name={k} />
                <b>{t}</b>
                <small>{s}</small>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className="panel reference-notice-strip">
        <h3>Community updates</h3>
        {ann.slice(0, 2).map((a) => (
          <Link key={a.id} to="/app/announcements">
            <b>{a.title}</b>
            <span>{a.body}</span>
            <Status value={a.priority} />
          </Link>
        ))}
      </section>
    </>
  );
}
function Shell() {
  const { me, refresh } = useApp(),
    { section = "overview" } = useParams(),
    navigate = useNavigate();
  const [mobile, setMobile] = useState(false),
    [soc, setSoc] = useState(currentSociety);
  const [commandOpen, setCommandOpen] = useState(false);
  useEffect(() => {
    const keyboard = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  const membership = me.memberships.find((m) => m.society_id === soc),
    role = membership?.role || null,
    superadmin = me.user.platform_role === "superadmin";
  let items = menus[role] || [];
  if (superadmin) items = membership ? ["platform", ...items] : ["platform"];
  async function logout() {
    if (sb) await sb.auth.signOut();
    await request("/auth/logout", { method: "POST" });
    qc.clear();
    await refresh();
    navigate("/login", { replace: true });
  }
  if (!membership && !superadmin) return <Onboard />;
  if (!items.includes(section))
    return (
      <Navigate
        to={superadmin && !membership ? "/app/platform" : "/app/overview"}
        replace
      />
    );
  return (
    <div className="app reference-app">
      <ReferenceSidebar
        items={items}
        section={section}
        mobile={mobile}
        onClose={() => setMobile(false)}
        onLogout={logout}
        me={me}
        membership={membership}
        role={role}
        onSociety={(id) => {
          selectSociety(id);
          setSoc(id);
          qc.clear();
        }}
      />
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}
      <div className="workspace">
        <CommandCenter
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          items={items}
          navigate={(key) => navigate("/app/" + key)}
        />
        <ReferenceTopbar
          me={me}
          section={section}
          items={items}
          onMenu={() => setMobile(!mobile)}
        />
        <main className="maincontent">
          <button type="button" className="cc-launcher" onClick={() => setCommandOpen(true)} aria-label="Open quick navigation">
            <Search size={15} /> Jump to a workspace <kbd>Ctrl / ⌘ K</kbd>
          </button>
          <div className="workspace-kicker">
            SOCIETYOS /{" "}
            {section === "overview"
              ? role === "admin"
                ? "SOCIETY DASHBOARD"
                : role + " WORKSPACE"
              : section === "platform"
                ? "PLATFORM OVERVIEW"
                : section === "scanner"
                  ? "SECURITY GATE CONSOLE"
                  : section === "visitor_passes"
                    ? "VISITORS & QR PASSES"
                    : section === "complaints"
                      ? "COMPLAINTS & MAINTENANCE"
                      : section === "members"
                        ? "RESIDENTS & UNITS"
                        : section === "announcements"
                          ? "COMMUNITY UPDATES"
                          : section === "reports"
                            ? "ANALYTICS & REPORTS"
                            : label(section).toUpperCase()}
          </div>
          {section === "overview" ? (
            <>
              <WorkspaceLaunchpad role={role} items={items} navigate={(key) => navigate("/app/" + key)} />
              <Overview role={role} name={me.user.name} />
            </>
          ) : section === "platform" ? (
            <Platform />
          ) : section === "scanner" ? (
            <Scanner />
          ) : section === "settings" ? (
            <SettingsPage role={role} />
          ) : section === "reports" ? (
            <Reports />
          ) : section === "maintenance" ? (
            <Records
              key={section + soc}
              module="complaints"
              role={role}
              maintenance
            />
          ) : (
            <Records key={section + soc} module={section} role={role} />
          )}
        </main>
      </div>
    </div>
  );
}

function Onboard() {
  const { refresh, say } = useApp();
  const [error, setError] = useState("");
  return (
    <div className="onboard">
      <Brand />
      <h1>Welcome to your next chapter.</h1>
      <p>Create your society, or join one with an invitation.</p>
      <div className="two-col">
        <FormBox
          title="Create a society"
          fields={{
            name: "text",
            address: "text",
            plan: ["starter", "community", "estate"],
          }}
          onSave={async (d) => {
            await request("/auth/onboard", { method: "POST", body: d });
            await refresh();
          }}
        />
        <FormBox
          title="Join your society"
          fields={{ token: "text" }}
          onSave={async (d) => {
            await request("/auth/join", { method: "POST", body: d });
            await refresh();
          }}
        />
      </div>
    </div>
  );
}
function Empty({
  text = "Nothing here just yet. Add your first record to get started.",
}) {
  return (
    <div className="empty">
      <Leaf size={32} />
      <h3>A fresh start.</h3>
      <p>{text}</p>
    </div>
  );
}
function FormBox({
  title,
  fields,
  onSave,
  initial = {},
  button = "Save",
  children,
  allowCreateUnit = false,
  hideVisitorUnit = false,
}) {
  const {
    register,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: Object.fromEntries(
      Object.keys(fields).map((k) => [
        k,
        initial[k] ?? (Array.isArray(fields[k]) ? fields[k][0] : ""),
      ]),
    ),
  });
  const [error, setError] = useState("");
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitBuilding, setNewUnitBuilding] = useState("");
  const [unitBusy, setUnitBusy] = useState(false);
  const queryClient = useQueryClient();
  const { data: unitBuildings = [] } = useQuery({
    queryKey: ["unit-buildings", currentSociety],
    queryFn: () => request("/buildings"),
    enabled: allowCreateUnit && addingUnit,
  });
  const refs = [
    ...new Set(
      Object.values(fields)
        .filter(
          (v) =>
            typeof v === "string" &&
            ![
              "text",
              "text?",
              "textarea",
              "number",
              "money",
              "datetime-local",
              "email",
            ].includes(v),
        )
        .map((v) => v.replace("?", "")),
    ),
  ];
  const { data: options = {} } = useQuery({
    queryKey: ["options", currentSociety, refs.join(",")],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(refs.map(async (k) => [k, await request("/" + k)])),
      ),
    enabled: refs.length > 0,
  });
  async function save(d) {
    setError("");
    try {
      for (const [k, t] of Object.entries(fields)) {
        if (d[k] === "" && String(t).endsWith("?")) delete d[k];
        else if (t === "number") d[k] = Number(d[k]);
        else if (t === "money") d[k] = Math.round(Number(d[k]) * 100);
        else if (t === "datetime-local") d[k] = new Date(d[k]).toISOString();
      }
      if (hideVisitorUnit) delete d.unit_id;
      await onSave(d);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <form className="formbox" onSubmit={handleSubmit(save)}>
      {title && <h2>{title}</h2>}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="formfields">
        {Object.entries(fields).filter(([key]) => !(hideVisitorUnit && key === "unit_id")).map(([key, type]) => (
          <label className={type === "textarea" ? "wide" : ""} key={key}>
            {fieldLabel(key)}
            {Array.isArray(type) ? (
              <select aria-label={fieldLabel(key)} {...register(key)}>
                {type.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            ) : type === "textarea" ? (
              <textarea
                aria-label={fieldLabel(key)}
                {...register(key)}
                required
                maxLength={5000}
                rows={4}
              />
            ) : refs.includes(type.replace("?", "")) ? (
              <div>
              <select
                aria-label={fieldLabel(key)}
                {...register(key)}
                required={!type.endsWith("?")}
              >
                <option value="">Choose {fieldLabel(key).toLowerCase()}</option>
                {(options[type.replace("?", "")] || [])
                  .filter(
                    (x) =>
                      key !== "user_id" ||
                      (fields.title
                        ? ["guard", "maintenance"].includes(x.role)
                        : x.role === "resident"),
                  )
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name || x.title}
                      {x.role ? " · " + x.role : ""}
                    </option>
                  ))}
              </select>
              {key === "unit_id" && allowCreateUnit && (
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="button secondary" onClick={() => setAddingUnit(!addingUnit)}>
                    {addingUnit ? "Cancel adding unit" : "+ Add missing unit"}
                  </button>
                  {addingUnit && (
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      <input aria-label="New unit name" placeholder="Unit name / number" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} maxLength={300} />
                      <select aria-label="Building for new unit" value={newUnitBuilding} onChange={e => setNewUnitBuilding(e.target.value)}>
                        <option value="">Choose building</option>
                        {unitBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <button type="button" className="button secondary" disabled={unitBusy || !newUnitName.trim() || !newUnitBuilding} onClick={async () => {
                        setUnitBusy(true);
                        setError("");
                        try {
                          const unit = await request("/units", { method: "POST", body: { name: newUnitName.trim(), building_id: newUnitBuilding } });
                          await queryClient.invalidateQueries({ queryKey: ["options"] });
                          setValue("unit_id", unit.id, { shouldValidate: true });
                          setAddingUnit(false);
                          setNewUnitName("");
                        } catch (e) { setError(e.message); }
                        finally { setUnitBusy(false); }
                      }}>
                        {unitBusy ? "Adding…" : "Save unit and select"}
                      </button>
                      {unitBuildings.length === 0 && <small>Create a building in Residents & units first.</small>}
                    </div>
                  )}
                </div>
              )}
              </div>
            ) : (
              <input
                aria-label={fieldLabel(key)}
                {...register(key)}
                type={type === "money" ? "number" : type.replace("?", "")}
                min={
                  type === "number" ? "1" : type === "money" ? "0" : undefined
                }
                step={type === "money" ? ".01" : undefined}
                required={!type.endsWith("?")}
                maxLength={300}
              />
            )}
          </label>
        ))}
      </div>
      {children}
      <button className="button full" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : button}
        <Check size={17} />
      </button>
    </form>
  );
}
function Modal({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const a = [
          ...ref.current.querySelectorAll(
            'button,a,input,select,textarea,[tabindex="0"]',
          ),
        ].filter((x) => !x.disabled);
        if (e.shiftKey && document.activeElement === a[0]) {
          e.preventDefault();
          a.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === a.at(-1)) {
          e.preventDefault();
          a[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      old?.focus();
    };
  }, []);
  return (
    <div className="modaloverlay" onClick={onClose}>
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="Close dialog" onClick={onClose}>
            <X />
          </button>
        </header>
        {children}
      </motion.section>
    </div>
  );
}
function Status({ value }) {
  return (
    <span className={"status s-" + value}>
      {String(value || "active").replaceAll("_", " ")}
    </span>
  );
}
function ModuleSummary({ module, maintenance, rows }) {
  const { data: items = [] } = useQuery({
    queryKey: ["summary", module, currentSociety],
    queryFn: () => request("/summary/" + module),
    enabled: [
      "members",
      "units",
      "unit_occupancies",
      "visitor_passes",
      "complaints",
      "invoices",
      "facilities",
      "facility_bookings",
    ].includes(module),
  });
  if (maintenance)
    return (
      <SummaryCards
        items={[
          ["Assigned tasks", rows.length, "My work", "mint"],
          [
            "Urgent",
            rows.filter(
              (r) =>
                ["high", "urgent"].includes(r.priority) &&
                !["closed", "resolved"].includes(r.status),
            ).length,
            "Prioritize",
            "pink",
          ],
          [
            "In progress",
            rows.filter((r) => r.status === "in_progress").length,
            "Active",
            "sky",
          ],
          [
            "Completed",
            rows.filter((r) => ["resolved", "closed"].includes(r.status))
              .length,
            "This workspace",
            "mint",
          ],
        ]}
      />
    );
  if (!items.length) return null;
  return (
    <SummaryCards
      items={items.map(([t, v, n, c, format]) => [
        t,
        format === "money" ? money(v) : v,
        n,
        c,
      ])}
    />
  );
}
function ReferenceTable({ module, rows, onOpen }) {
  const columnSets = {
    members: [
      ["Resident / staff", "name"],
      ["Unit", "unit_name"],
      ["Type", "role"],
      ["Account status", "account_status"],
    ],
    units: [
      ["Unit", "name"],
      ["Building", "building_name"],
      ["Occupancy", "status"],
    ],
    visitor_passes: [
      ["Visitor", "name"],
      ["Host resident", "person_name"],
      ["Unit", "unit_name"],
      ["Time", "starts_at"],
      ["Status", "visitor_status"],
    ],
    complaints: [
      ["Ticket", "ticket"],
      ["Issue", "title"],
      ["Unit", "unit_name"],
      ["Priority", "priority"],
      ["Assigned to", "assigned_name"],
      ["Status", "status"],
    ],
    invoices: [
      ["Invoice", "ticket"],
      ["Unit", "unit_name"],
      ["Description", "title"],
      ["Amount", "amount_cents"],
      ["Status", "status"],
    ],
    payments: [
      ["Reference", "reference"],
      ["Submitted by", "person_name"],
      ["Amount", "amount_cents"],
      ["Status", "status"],
    ],
    visitor_entries: [
      ["Entry", "ticket"],
      ["Guard", "person_name"],
      ["Check-in", "checked_in"],
      ["Check-out", "checked_out"],
    ],
    facility_bookings: [
      ["Booking", "title"],
      ["Starts", "starts_at"],
      ["Ends", "ends_at"],
      ["Status", "status"],
    ],
  };
  const cols = columnSets[module] || [
    ["Record", "record"],
    ["Details", "details"],
    ["Status / role", "status_role"],
    ["Created", "created_at"],
  ];
  function value(r, key) {
    if (key === "record")
      return (
        r.name || r.title || r.action || r.reference || "#" + r.id.slice(0, 8)
      );
    if (key === "details")
      return (
        r.category ||
        r.purpose ||
        r.kind ||
        r.entity_type ||
        r.body?.slice(0, 50) ||
        "—"
      );
    if (key === "ticket")
      return (
        (module === "complaints"
          ? "CMP-"
          : module === "invoices"
            ? "INV-"
            : "#") + r.id.slice(0, 6).toUpperCase()
      );
    if (key === "status_role")
      return (
        <Status
          value={
            r.role ||
            r.status ||
            (module === "notifications"
              ? r.read_at
                ? "read"
                : "unread"
              : "active")
          }
        />
      );
    if (key === "visitor_status")
      return (
        <Status
          value={
            new Date(r.ends_at) < new Date()
              ? "expired"
              : r.status !== "active"
                ? r.status
                : r.used_entries >= r.allowed_entries
                  ? "used"
                  : "expected"
          }
        />
      );
    if (key === "account_status") return <Status value="active" />;
    if (["status", "priority", "role"].includes(key))
      return <Status value={r[key]} />;
    if (key.endsWith("_cents")) return money(r[key]);
    if (key.endsWith("_at") || key.startsWith("checked_"))
      return r[key]
        ? new Date(r[key]).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
    return r[key] || "—";
  }
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {cols.map(([name, key]) => (
              <th key={key}>{name}</th>
            ))}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {cols.map(([name, key], i) => (
                <td key={key}>
                  {i === 0 ? <b>{value(r, key)}</b> : value(r, key)}
                </td>
              ))}
              <td>
                <button
                  className="table-view"
                  aria-label={"Open " + (r.name || r.title || "record")}
                  onClick={() => onOpen(r)}
                >
                  View <ChevronDown size={11} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ResidentPoll() {
  const { say } = useApp();
  const { data: polls = [] } = useQuery({
    queryKey: ["polls", currentSociety],
    queryFn: () => request("/polls"),
  });
  const poll = polls.find((p) => new Date(p.ends_at) > new Date()) || polls[0];
  const { data: options = [] } = useQuery({
    queryKey: ["pollresults", poll?.id],
    queryFn: () => request("/polls/" + poll.id + "/results"),
    enabled: !!poll,
  });
  const total = options.reduce((s, o) => s + o.votes, 0);
  return (
    <aside className="panel resident-poll">
      <h3>Resident poll</h3>
      {poll ? (
        <>
          <h4>{poll.title}</h4>
          {options.map((o, i) => (
            <div className="poll-choice" key={o.id}>
              <p>{o.title}</p>
              <button
                className={"metric-tag " + ["mint", "sky", "pink"][i % 3]}
                disabled={new Date(poll.ends_at) < new Date()}
                onClick={async () => {
                  try {
                    await request("/polls/" + poll.id + "/vote", {
                      method: "POST",
                      body: { option_id: o.id },
                    });
                    qc.invalidateQueries({
                      queryKey: ["pollresults", poll.id],
                    });
                    say("Your vote has been recorded.");
                  } catch (e) {
                    say(e.message);
                  }
                }}
              >
                {total ? Math.round((o.votes / total) * 100) + "% · " : ""}
                {o.votes} votes · Vote
              </button>
            </div>
          ))}
          <small>
            One vote per person. Closes{" "}
            {new Date(poll.ends_at).toLocaleDateString()}.
          </small>
        </>
      ) : (
        <>
          <p>No active poll yet.</p>
          <Link className="button secondary" to="/app/polls">
            View community polls
          </Link>
        </>
      )}
    </aside>
  );
}
function VisitorPreview({ pass, onCreate }) {
  return (
    <aside className="panel visitor-preview">
      <h3>Pass preview</h3>
      {pass ? (
        <>
          <img className="qr" src={pass.qr} alt="Latest visitor QR pass" />
          <h4>{pass.name}</h4>
          <p>{pass.purpose}</p>
          <span className="metric-tag mint">
            Valid until{" "}
            {new Date(pass.ends_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <a
            className="button secondary"
            href={pass.qr}
            download="visitor-pass.png"
          >
            <Download size={14} />
            Save QR
          </a>
        </>
      ) : (
        <>
          <div className="empty-qr">
            <ScanLine size={80} strokeWidth={1} />
          </div>
          <h4>Your next visitor pass</h4>
          <p>Create a pass to preview its secure QR code here.</p>
          <button className="button" onClick={onCreate}>
            <Plus size={14} />
            Create a visitor pass
          </button>
        </>
      )}
      <small>
        QR codes are shown when created. Save the code before leaving this page.
      </small>
    </aside>
  );
}
function RecordsFooter({ module, rows, maintenance, onOpen }) {
  const { data: d } = useQuery({
    queryKey: ["analytics", currentSociety],
    queryFn: () => request("/analytics"),
    enabled: module === "invoices" || maintenance,
  });
  if (module === "invoices")
    return (
      <div className="reference-dashboard-bottom record-footer">
        <ReferenceTrend title="Collection performance" data={d?.trend || []} />
        <section className="panel">
          <h3>Payment methods</h3>
          <p>Bank transfer · Receipt upload · Admin verification</p>
          <span className="metric-tag mint">No payment gateway required</span>
          <p>
            Residents submit a payment reference and proof. The balance changes
            only after administrator approval.
          </p>
          <Link to="/app/payments" className="button secondary">
            Review payment records <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    );
  if (maintenance) {
    const row =
      rows.find((r) => !["resolved", "closed"].includes(r.status)) || rows[0];
    return (
      <div className="reference-dashboard-bottom record-footer">
        <section className="panel">
          <h3>
            {row
              ? "Task detail · CMP-" + row.id.slice(0, 6).toUpperCase()
              : "Task detail"}
          </h3>
          <p>{row?.title || "No tasks assigned yet."}</p>
          {row && (
            <>
              <p>{row.description}</p>
              <button className="button" onClick={() => onOpen(row)}>
                Update task progress
              </button>
            </>
          )}
        </section>
        <section className="panel">
          <h3>Work progress</h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  "open",
                  "assigned",
                  "in_progress",
                  "resolved",
                  "closed",
                ].map((name) => ({
                  name: name.replace("_", " "),
                  value: rows.filter((r) => r.status === name).length,
                }))}
              >
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#74c7f2" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    );
  }
  return null;
}

function Records({ module, role, maintenance = false }) {
  const { say, me } = useApp();
  const routeLocation = useLocation();
  const societyName =
    me.memberships.find((m) => m.society_id === currentSociety)?.name ||
    "Your community";
  const [lastPass, setLastPass] = useState(null);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [modal, setModal] = useState(null),
    [detail, setDetail] = useState(null),
    [result, setResult] = useState(null),
    [since, setSince] = useState("");
  const {
    data: rawRows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [module, currentSociety],
    queryFn: () => request("/" + module),
  });
  const rows = maintenance ? rawRows.filter((r) => r.assigned_to) : rawRows;
  useEffect(() => {
    setSearch(new URLSearchParams(routeLocation.search).get("q") || "");
  }, [routeLocation.search]);
  const [view, setView] = useState("list");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const conf = specs[module] || {},
    canCreate = createRoles[module]?.includes(role);
  const filtered = rows.filter(
    (r) =>
      JSON.stringify(r).toLowerCase().includes(search.toLowerCase()) &&
      (status === "all" || r.status === status) &&
      (!since || new Date(r.created_at) >= new Date(since)),
  );
  async function done(d) {
    const r = await request("/" + module, { method: "POST", body: d });
    qc.invalidateQueries();
    setModal(null);
    say("Saved successfully");
    if (r.qr) {
      setResult(r);
      setLastPass(r);
    }
  }
  const cards = [
    "announcements",
    "facilities",
    "community_events",
    "polls",
    "lost_found_reports",
  ].includes(module);
  return (
    <>
      <div className="pageheading">
        <div>
          <h1>
            {referenceTitles[maintenance ? "maintenance" : module] ||
              conf.label}
          </h1>
          <p>
            {maintenance
              ? "Maintenance Workspace"
              : module === "members"
                ? "Residents & Units"
                : module === "visitor_passes"
                  ? "Visitors & QR Passes"
                  : conf.label}{" "}
            · {societyName}
          </p>
        </div>
      </div>
      <ModuleSummary module={module} rows={rows} maintenance={maintenance} />
      {module === "facility_bookings" && (
        <div className="actions" style={{ marginBottom: 16 }}>
          <button
            className="button secondary"
            onClick={() => setView(view === "list" ? "calendar" : "list")}
          >
            {view === "list" ? "Show calendar" : "Show list"}
          </button>
          <input
            aria-label="Calendar month"
            type="month"
            style={{ width: 180 }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      )}
      {module === "facility_bookings" && view === "calendar" && (
        <div className="booking-calendar panel">
          {Array.from(
            {
              length: new Date(
                Number(month.slice(0, 4)),
                Number(month.slice(5)),
                0,
              ).getDate(),
            },
            (_, i) => {
              const date = month + "-" + String(i + 1).padStart(2, "0");
              const bookings = rows.filter(
                (r) =>
                  new Date(r.starts_at).toLocaleDateString("en-CA") === date &&
                  ["pending", "approved"].includes(r.status),
              );
              return (
                <div className="calday" key={date}>
                  <b>{i + 1}</b>
                  {bookings.map((b) => (
                    <button key={b.id} onClick={() => setDetail(b)}>
                      {new Date(b.starts_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {b.title}
                    </button>
                  ))}
                </div>
              );
            },
          )}
        </div>
      )}
      <div
        className={
          "reference-record-layout " +
          (module === "visitor_passes"
            ? "with-preview"
            : module === "announcements" && ["admin", "resident"].includes(role)
              ? "with-poll"
              : "") +
          " module-" +
          module
        }
      >
        <div className="panel records-panel">
          <div className="record-panel-heading">
            <h3>
              {maintenance
                ? "My assigned maintenance tasks"
                : {
                    members: "Resident & staff directory",
                    units: "Unit directory",
                    visitor_passes: "Visitor register",
                    complaints: "Maintenance requests",
                    invoices: "Monthly invoices",
                    facilities: "Facilities",
                    announcements: "Community announcements",
                  }[module] || conf.label}
            </h3>
            <div className="actions">
              {module !== "members" && (
                <button
                  className="button secondary"
                  onClick={() =>
                    download("/" + module + "/export", module + ".csv").catch(
                      (e) => say(e.message),
                    )
                  }
                >
                  <Download size={16} /> Export
                </button>
              )}
              {canCreate && (
                <button className="button" onClick={() => setModal("create")}>
                  <Plus size={17} />
                  New {conf.singular}
                </button>
              )}
              {module === "invoices" && role === "admin" && (
                <button
                  className="button secondary"
                  onClick={() => setModal("monthly")}
                >
                  <CalendarDays size={16} />
                  Monthly charges
                </button>
              )}
              {module === "units" && role === "admin" && (
                <button
                  className="button secondary"
                  onClick={() => setModal("import")}
                >
                  <Upload size={16} />
                  Import CSV
                </button>
              )}
              {module === "members" && (
                <button className="button" onClick={() => setModal("invite")}>
                  <Plus size={17} /> Invite a person
                </button>
              )}
              {module === "documents" && role === "admin" && (
                <button className="button" onClick={() => setModal("upload")}>
                  <Upload size={17} /> Upload document
                </button>
              )}
              {module === "polls" && role === "admin" && (
                <button className="button" onClick={() => setModal("poll")}>
                  <Plus size={17} /> Create poll
                </button>
              )}
            </div>
          </div>
          <div className="tabletoolbar">
            <label className="search">
              <Search size={17} />
              <input
                aria-label="Search records"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={"Search " + conf.label?.toLowerCase() + "…"}
              />
            </label>
            <div className="filters">
              <select
                aria-label="Filter status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                {[...new Set(rows.map((x) => x.status).filter(Boolean))].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </select>
              <input
                aria-label="Created since"
                title="Created since"
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
              />
              <span>{filtered.length} records</span>
            </div>
          </div>
          {error ? (
            <div className="error">{error.message}</div>
          ) : isLoading ? (
            <Loading />
          ) : !filtered.length ? (
            <Empty
              text={
                rows.length
                  ? "No records match your filters."
                  : "Your records will appear here when they are added."
              }
            />
          ) : cards ? (
            <div className="recordcards">
              {filtered.map((r) => (
                <article
                  className={
                    "recordcard " +
                    (module === "facilities" ? "facilitycard" : "")
                  }
                  key={r.id}
                >
                  {module === "facilities" && (
                    <div className="facility-art">
                      <span className="facility-emoji">
                        <Building2 size={58} strokeWidth={1.4} aria-hidden="true"/>
                      </span>
                      <span>{r.capacity} people</span>
                    </div>
                  )}
                  <div className="recordcard-body">
                    <span className="eyebrow">
                      {r.priority || r.kind || conf.label}
                    </span>
                    <h3>{r.name || r.title}</h3>
                    <p>
                      {r.body ||
                        r.description ||
                        "Closes " + new Date(r.ends_at).toLocaleString()}
                    </p>
                    {r.fee_cents !== undefined && (
                      <b>{money(r.fee_cents)} / booking</b>
                    )}
                    {r.starts_at && (
                      <small>
                        <CalendarDays size={14} />{" "}
                        {new Date(r.starts_at).toLocaleString()} · {r.location}
                      </small>
                    )}
                    <button
                      className="button secondary"
                      onClick={() => setDetail(r)}
                    >
                      {module === "polls"
                        ? "Vote & see results"
                        : "View details"}
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <ReferenceTable
              module={module}
              rows={filtered}
              onOpen={setDetail}
            />
          )}
        </div>
        {module === "visitor_passes" && (
          <VisitorPreview pass={lastPass} onCreate={() => setModal("create")} />
        )}
        {module === "announcements" && ["admin", "resident"].includes(role) && (
          <ResidentPoll />
        )}
      </div>
      <RecordsFooter
        module={module}
        rows={rows}
        maintenance={maintenance}
        onOpen={setDetail}
      />
      {modal === "monthly" && (
        <Modal title="Generate monthly charges" onClose={() => setModal(null)}>
          <p>
            Creates one invoice per occupied unit. An existing invoice for the
            same month is skipped.
          </p>
          <FormBox
            fields={{
              period: "text",
              title: "text",
              amount_cents: "money",
              extra_cents: "money",
              due_at: "datetime-local",
            }}
            initial={{
              period: new Date().toISOString().slice(0, 7),
              title: "Monthly society charges",
              extra_cents: 0,
            }}
            onSave={async (d) => {
              const r = await request("/billing/monthly", {
                method: "POST",
                body: d,
              });
              setModal(null);
              qc.invalidateQueries();
              say(
                r.created +
                  " invoices created; " +
                  r.skipped +
                  " existing invoices skipped.",
              );
            }}
          />
        </Modal>
      )}
      {modal === "import" && (
        <Modal title="Import units from CSV" onClose={() => setModal(null)}>
          <p>
            Columns: building_id, floor_id (optional), name. Use exported
            building and floor IDs. Up to 200 rows.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={async (e) => {
              try {
                const text = await e.target.files[0].text();
                const lines = text.trim().split(/\r?\n/);
                const split = (line) =>
                  (line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g) || [])
                    .filter(Boolean)
                    .map((s) =>
                      s
                        .replace(/,$/, "")
                        .replace(/^"|"$/g, "")
                        .replaceAll('""', '"'),
                    );
                const headers = split(lines.shift());
                const rows = lines.map((l) =>
                  Object.fromEntries(
                    split(l)
                      .map((v, i) => [headers[i], v])
                      .filter(([k, v]) => k && v),
                  ),
                );
                const r = await request("/units/import", {
                  method: "POST",
                  body: { rows },
                });
                setResult({ importResults: r.results });
                setModal(null);
                qc.invalidateQueries();
              } catch (e) {
                say(e.message);
              }
            }}
          />
        </Modal>
      )}
      {modal === "create" && (
        <Modal title={"New " + conf.singular} onClose={() => setModal(null)}>
          <FormBox
            fields={conf.fields}
            hideVisitorUnit={module === "visitor_passes"}
            initial={{ allowed_entries: 1, capacity: 10, fee_cents: 0 }}
            onSave={done}
            button={"Create " + conf.singular}
          />
        </Modal>
      )}
      {modal === "invite" && (
        <Modal title="Invite someone home" onClose={() => setModal(null)}>
          <p className="muted">
            Invitations are shared manually. The recipient must sign in with the
            invited email.
          </p>
          <FormBox
            fields={{
              email: "email",
              role: ["resident", "guard", "maintenance", "admin"],
            }}
            onSave={async (d) => {
              const r = await request("/invitations", {
                method: "POST",
                body: d,
              });
              setResult(r);
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal === "upload" && (
        <Modal
          title="Upload a community document"
          onClose={() => setModal(null)}
        >
          <UploadForm
            onDone={() => {
              setModal(null);
              qc.invalidateQueries();
            }}
          />
        </Modal>
      )}
      {modal === "poll" && (
        <Modal title="Let your community decide" onClose={() => setModal(null)}>
          <FormBox
            fields={{
              title: "text",
              ends_at: "datetime-local",
              options: "textarea",
            }}
            onSave={async (d) => {
              d.options = d.options
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean);
              await request("/polls", { method: "POST", body: d });
              setModal(null);
              qc.invalidateQueries();
              say("Poll created");
            }}
          >
            <p className="muted">Enter one option per line (2–8 choices).</p>
          </FormBox>
        </Modal>
      )}
      {result?.importResults && (
        <Modal title="Import results" onClose={() => setResult(null)}>
          {result.importResults.map((r) => (
            <p key={r.row}>
              Row {r.row}: {r.ok ? "Imported" : r.error}
            </p>
          ))}
        </Modal>
      )}
      {result && !result.importResults && (
        <Modal
          title={result.qr ? "Your visitor pass is ready" : "Invitation ready"}
          onClose={() => setResult(null)}
        >
          {result.qr && (
            <img className="qr" src={result.qr} alt="Visitor QR code" />
          )}
          <p>Scan the QR with your phone to view visitor details. Guard approval is required for entry.</p>
          <textarea
            readOnly
            rows={3}
            value={result.pass_token || result.token}
          />
          <button
            className="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  result.pass_token || result.token,
                );
                say("Copied");
              } catch {
                say("Select and copy the token above.");
              }
            }}
          >
            <Copy size={16} />
            Copy token
          </button>
          {result.qr && (
            <a
              className="button secondary"
              download="visitor-pass.png"
              href={result.qr}
            >
              Download QR
            </a>
          )}
        </Modal>
      )}
      {detail && (
        <Modal
          title={detail.title || detail.name || label(module)}
          onClose={() => setDetail(null)}
        >
          <Detail
            module={module}
            row={detail}
            role={role}
            onDone={() => {
              setDetail(null);
              qc.invalidateQueries();
            }}
          />
        </Modal>
      )}
    </>
  );
}
function UploadForm({ type = "community", entity, onDone }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const f = new FormData(e.target);
          f.set("entity_type", type);
          if (entity) f.set("entity_id", entity);
          await request("/files", { method: "POST", body: f });
          onDone();
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && <div className="error">{error}</div>}
      <label>
        Document title
        <input name="title" required />
      </label>
      <label>
        File · PDF, PNG or JPEG · up to 5 MB
        <input
          name="file"
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          required
        />
      </label>
      <button disabled={busy} className="button full">
        {busy ? "Uploading…" : "Upload file"}
        <Upload size={16} />
      </button>
    </form>
  );
}
function Detail({ module, row, role, onDone }) {
  const { say } = useApp();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [extra, setExtra] = useState("");
  const { data: staff = [] } = useQuery({
    queryKey: ["staff", currentSociety],
    queryFn: () => request("/staff"),
    enabled: module === "complaints" && role === "admin",
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", row.id],
    queryFn: () => request("/complaints/" + row.id + "/comments"),
    enabled: module === "complaints",
  });
  const { data: options = [] } = useQuery({
    queryKey: ["pollresults", row.id],
    queryFn: () => request("/polls/" + row.id + "/results"),
    enabled: module === "polls",
  });
  const { data: docs = [] } = useQuery({
    queryKey: ["attachments", row.id],
    queryFn: () => request("/documents"),
    enabled: ["complaints", "payments"].includes(module),
  });
  async function act(verb, data = {}) {
    setError("");
    setBusy(true);
    try {
      await request("/" + module + "/" + row.id + "/" + verb, {
        method: "POST",
        body: data,
      });
      say("Updated successfully");
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const editable =
    role === "admin" &&
    [
      "buildings",
      "floors",
      "units",
      "facilities",
      "announcements",
      "community_events",
      "emergency_contacts",
      "shifts",
    ].includes(module);
  const removable =
    role === "admin" &&
    [
      "buildings",
      "floors",
      "units",
      "unit_occupancies",
      "emergency_contacts",
      "shifts",
      "facilities",
      "community_events",
    ].includes(module);
  const verbs = [];
  if (module === "complaints") {
    if (role === "admin" && ["open", "assigned"].includes(row.status))
      verbs.push("assign");
    if (["admin", "maintenance"].includes(role) && row.status === "assigned")
      verbs.push("start");
    if (["admin", "maintenance"].includes(role) && row.status === "in_progress")
      verbs.push("resolve");
    if (["admin", "resident"].includes(role) && row.status === "resolved")
      verbs.push("close");
    if (
      ["admin", "resident"].includes(role) &&
      ["resolved", "closed"].includes(row.status)
    )
      verbs.push("reopen");
  }
  if (
    module === "facility_bookings" &&
    ["pending", "approved"].includes(row.status)
  ) {
    if (role === "admin" && row.status === "pending")
      verbs.push("approve", "reject");
    verbs.push("cancel");
  }
  if (module === "payments" && role === "admin" && row.status === "pending")
    verbs.push("approve", "reject");
  if (
    module === "visitor_passes" &&
    ["admin", "resident"].includes(role) &&
    row.status === "active"
  )
    verbs.push("cancel");
  if (
    [
      "feedback",
      "lost_found_reports",
      "security_incidents",
      "support_requests",
    ].includes(module) &&
    row.status === "open"
  )
    verbs.push("close");
  return (
    <div className="detail">
      {error && <div className="error">{error}</div>}
      {editable && (
        <button
          className="button secondary"
          onClick={() => setExtra(extra === "edit" ? "" : "edit")}
        >
          Edit details
        </button>
      )}
      {removable && (
        <button className="button secondary" onClick={() => setExtra("delete")}>
          Remove record
        </button>
      )}
      {extra === "delete" && (
        <div className="error">
          Remove this record? Linked historical records prevent deletion.
          <button
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request("/" + module + "/" + row.id, {
                  method: "DELETE",
                });
                onDone();
                say("Record removed");
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm removal
          </button>
        </div>
      )}
      {extra === "edit" && (
        <FormBox
          title="Edit details"
          fields={specs[module].fields}
          initial={Object.fromEntries(
            Object.entries(specs[module].fields).map(([k, t]) => [
              k,
              t === "money"
                ? row[k] / 100
                : t === "datetime-local"
                  ? new Date(
                      new Date(row[k]) - new Date().getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .slice(0, 16)
                  : row[k] || "",
            ]),
          )}
          onSave={async (d) => {
            await request("/" + module + "/" + row.id, {
              method: "PATCH",
              body: d,
            });
            onDone();
            say("Details updated");
          }}
        />
      )}
      <div className="detail-grid">
        {Object.entries(row)
          .filter(
            ([k]) =>
              ![
                "token_hash",
                "storage_key",
                "society_id",
                "user_id",
                "id",
                "assigned_to",
                "unit_id",
                "facility_id",
                "building_id",
                "floor_id",
                "entity_id",
                "dedupe_key",
              ].includes(k),
          )
          .map(([k, v]) => (
            <div key={k}>
              <small>{fieldLabel(k)}</small>
              <p>
                {k.endsWith("_cents")
                  ? money(v)
                  : k.endsWith("_at") ||
                      ["checked_in", "checked_out"].includes(k)
                    ? v
                      ? new Date(v).toLocaleString()
                      : "—"
                    : typeof v === "object"
                      ? JSON.stringify(v)
                      : String(v ?? "—")}
              </p>
            </div>
          ))}
      </div>
      {module === "members" && role === "admin" && (
        <>
          <FormBox
            title="Society role"
            fields={{ role: ["resident", "guard", "maintenance", "admin"] }}
            initial={{ role: row.role }}
            onSave={async (d) => {
              await request("/members/" + row.id, { method: "PATCH", body: d });
              onDone();
              say("Membership role updated");
            }}
          />
          <button
            className="button secondary"
            onClick={() => setExtra("remove-member")}
          >
            Remove membership
          </button>
          {extra === "remove-member" && (
            <div className="error">
              Remove access and unit assignments for this person?
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await request("/members/" + row.id, { method: "DELETE" });
                    onDone();
                    say("Membership removed");
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Confirm removal
              </button>
            </div>
          )}
        </>
      )}
      {module === "invoices" && (
        <>
          <button
            className="button secondary"
            onClick={() =>
              download("/invoices/" + row.id + "/pdf", "invoice.pdf").catch(
                (e) => setError(e.message),
              )
            }
          >
            <Download size={16} /> Download invoice PDF
          </button>
          {row.status !== "paid" && (
            <button className="button" onClick={() => setExtra("payment")}>
              Submit a payment
            </button>
          )}
        </>
      )}
      {extra === "payment" && (
        <FormBox
          title="Record your payment"
          fields={{ amount_cents: "money", reference: "text" }}
          onSave={async (d) => {
            await request("/invoices/" + row.id + "/payments", {
              method: "POST",
              body: d,
            });
            say("Payment submitted for administrator verification");
            onDone();
          }}
        >
          <p className="muted">
            This records a payment already made. It does not transfer money.
            Attach proof from Payment review after submitting.
          </p>
        </FormBox>
      )}
      {verbs.includes("assign") && (
        <label>
          Assign maintenance staff
          <select value={extra} onChange={(e) => setExtra(e.target.value)}>
            <option value="">Choose a team member</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="actions">
        {verbs.map((v) => (
          <button
            disabled={busy || (v === "assign" && !extra)}
            key={v}
            className={
              "button " + (["reject", "cancel"].includes(v) ? "secondary" : "")
            }
            onClick={() => act(v, v === "assign" ? { assigned_to: extra } : {})}
          >
            {v === "start"
              ? "Start work"
              : v === "resolve"
                ? "Mark resolved"
                : v[0].toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      {module === "notifications" && !row.read_at && (
        <button className="button" onClick={() => act("read")}>
          Mark as read
        </button>
      )}
      {module === "documents" && (
        <button
          className="button"
          onClick={() =>
            download("/files/" + row.id, row.title).catch((e) =>
              setError(e.message),
            )
          }
        >
          <Download size={16} /> Download
        </button>
      )}
      {module === "facilities" && (
        <Link className="button" to="/app/facility_bookings" onClick={onDone}>
          Make a reservation <ArrowRight size={16} />
        </Link>
      )}
      {module === "polls" && (
        <div className="polloptions">
          {options.map((o) => (
            <button
              disabled={busy || new Date(row.ends_at) < new Date()}
              key={o.id}
              onClick={() => act("vote", { option_id: o.id })}
            >
              <span>{o.title}</span>
              <b>{o.votes} votes</b>
            </button>
          ))}
          <small>
            One vote per person. Results include all submitted votes.
          </small>
        </div>
      )}
      {module === "complaints" && (
        <section className="comments">
          <h3>Conversation</h3>
          {comments.map((c) => (
            <article key={c.id}>
              <b>{c.name}</b>
              <p>{c.body}</p>
              <small>{new Date(c.created_at).toLocaleString()}</small>
            </article>
          ))}
          <FormBox
            fields={{ body: "textarea" }}
            button="Add comment"
            onSave={async (d) => {
              await request("/complaints/" + row.id + "/comment", {
                method: "POST",
                body: d,
              });
              qc.invalidateQueries({ queryKey: ["comments", row.id] });
              say("Comment added");
            }}
          />
        </section>
      )}
      {["complaints", "payments"].includes(module) && (
        <section>
          <h3>Attachments & evidence</h3>
          {docs
            .filter((d) => d.entity_id === row.id)
            .map((d) => (
              <button
                className="filelink"
                key={d.id}
                onClick={() =>
                  download("/files/" + d.id, d.title).catch((e) =>
                    setError(e.message),
                  )
                }
              >
                <FileText size={15} />
                {d.title}
                <Download size={14} />
              </button>
            ))}
          <UploadForm
            type={module === "complaints" ? "complaint" : "payment"}
            entity={row.id}
            onDone={() => {
              qc.invalidateQueries({ queryKey: ["attachments", row.id] });
              say("Attachment uploaded");
            }}
          />
        </section>
      )}
    </div>
  );
}
function VisitorPassPreview() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/public/visitor-pass/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw Error(d.error || "Unable to verify pass"); return d; })
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [token]);
  return <div style={{ minHeight: "100vh", background: "#f4f8f8", padding: "48px 16px" }}>
    <section className="panel" style={{ maxWidth: 540, margin: "auto", padding: 30 }}>
      <Brand />
      <h1>Visitor pass details</h1>
      {error ? <div className="error">{error}</div> : !data ? <p>Checking pass…</p> : <>
        <div className={data.status === "valid" ? "success" : "error"}>Pass status: {data.status}</div>
        <p><strong>Visitor:</strong> {data.name}</p>
        <p><strong>Purpose:</strong> {data.purpose}</p>
        <p><strong>Vehicle:</strong> {data.vehicle || "Not provided"}</p>
        <p><strong>Valid from:</strong> {new Date(data.starts_at).toLocaleString()}</p>
        <p><strong>Valid until:</strong> {new Date(data.ends_at).toLocaleString()}</p>
        <p>For security, only an authorized SocietyOS guard can record check-in or check-out.</p>
      </>}
      <Link className="textlink green" to="/login">SocietyOS sign in</Link>
    </section>
  </div>;
}
function extractPassToken(value) {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/visitor\/verify\/([a-f0-9]{64})\/?$/i);
    if (match) return match[1];
  } catch { /* Existing raw tokens remain supported. */ }
  return value;
}
function Scanner() {
  const { say } = useApp();
  const navigate=useNavigate();
  const {data: gateEntries=[]}=useQuery({queryKey:["visitor_entries",currentSociety],queryFn:()=>request("/visitor_entries")});
  const [value, setValue] = useState(""),
    [result, setResult] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false);
  const video = useRef(),
    stream = useRef(),
    timer = useRef();
  function stop() {
    clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    setCamera(false);
  }
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function scan() {
    setError("");
    try {
      if (!("BarcodeDetector" in window))
        throw Error(
          "Camera QR scanning is not supported by this browser. Use Chrome on Android, or paste the pass token below.",
        );
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCamera(true);
      await new Promise((r) => setTimeout(r, 100));
      video.current.srcObject = stream.current;
      await video.current.play();
      async function frame() {
        if (!video.current) return;
        try {
          const codes = await detector.detect(video.current);
          if (codes[0]) {
            setValue(extractPassToken(codes[0].rawValue));
            stop();
            return;
          }
          timer.current = setTimeout(frame, 400);
        } catch {
          stop();
          setError("Could not read camera. Use the token below.");
        }
      }
      frame();
    } catch (e) {
      stop();
      setError(e.message);
    }
  }
  async function verify(exit) {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const r = await request("/visitors/verify", {
        method: "POST",
        body: { token: extractPassToken(value.trim()), exit },
      });
      setResult(r.name + " has " + r.status + ".");
      qc.invalidateQueries();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="pageheading">
        <div>
          <h1>Verify guests in seconds</h1>
          <p>Scan a visitor’s pass, or enter their secure token.</p>
        </div>
        <span className="badge">
          <ShieldCheck size={14} /> Security workspace
        </span>
      </div>
      <div className="scanner-grid">
        <section className="panel scan-panel">
          <div className="scanframe">
            {camera ? (
              <video ref={video} playsInline muted />
            ) : (
              <ScanLine size={100} strokeWidth={1} />
            )}
          </div>
          <h2>
            {camera
              ? "Hold the QR code in view"
              : "Ready for the next arrival."}
          </h2>
          <p>Camera access requires HTTPS or localhost.</p>
          <button className="button" onClick={camera ? stop : scan}>
            {camera ? "Stop camera" : "Open camera"}
            <ScanLine size={18} />
          </button>
        </section>
        <section className="panel">
          <h2>Verify a visitor pass</h2>
          <p>Always confirm the visitor’s identity before entry.</p>
          {error && <div className="error">{error}</div>}
          {result && <div className="success">{result}</div>}
          <label>
            Secure pass token
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={4}
              placeholder="Paste the 64-character visitor token"
            />
          </label>
          <div className="actions">
            <button
              className="button"
              disabled={busy || !value}
              onClick={() => verify(false)}
            >
              Check in <DoorOpen size={17} />
            </button>
            <button
              className="button secondary"
              disabled={busy || !value}
              onClick={() => verify(true)}
            >
              Check out <ArrowRight size={17} />
            </button>
          </div>
          <div className="tip">
            <ShieldCheck />
            <p>
              Society, validity window, pass status and entry limits are checked
              by the server.
            </p>
          </div>
          <Link to="/app/visitor_passes" className="textlink green">
            Register a visitor manually <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <section className="panel gate-log"><h3>Gate entry log</h3>{gateEntries.length?<ReferenceTable module="visitor_entries" rows={gateEntries.slice(0,8)} onOpen={()=>navigate("/app/visitor_entries")}/>:<p>No entries yet. Verified check-ins appear here.</p>}</section>
    </>
  );
}
function SettingsPage({ role }) {
  const { me, refresh, say } = useApp();
  const { data: prefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => request("/auth/preferences"),
  });
  const { data: s } = useQuery({
    queryKey: ["settings", currentSociety],
    queryFn: () => request("/settings"),
  });
  return (
    <>
      <div className="pageheading">
        <div>
          <h1>A space that feels like yours.</h1>
          <p>Manage your profile and community preferences.</p>
        </div>
      </div>
      <div className="two-col">
        <section className="panel">
          <FormBox
            title="Your profile"
            fields={{ name: "text" }}
            initial={{ name: me.user.name }}
            onSave={async (d) => {
              await request("/auth/profile", { method: "PATCH", body: d });
              await refresh();
              say("Profile updated");
            }}
          />
          <p className="muted">Signed in as {me.user.email}</p>
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="checkbox"
              style={{ width: 18, margin: 0 }}
              checked={prefs?.updates !== false}
              onChange={async (e) => {
                try {
                  await request("/auth/preferences", {
                    method: "PATCH",
                    body: { updates: e.target.checked },
                  });
                  qc.invalidateQueries({ queryKey: ["preferences"] });
                  say("Notification preference saved");
                } catch (e) {
                  say(e.message);
                }
              }}
            />{" "}
            Receive personal workflow updates
          </label>
          <small className="muted">
            Community notices and deadline reminders remain visible.
          </small>
        </section>
        {role === "admin" && s && (
          <section className="panel">
            <FormBox
              title="Your society"
              fields={{
                name: "text",
                address: "text",
                plan: ["starter", "community", "estate"],
              }}
              initial={s}
              onSave={async (d) => {
                await request("/settings", { method: "PATCH", body: d });
                await refresh();
                qc.invalidateQueries();
                say("Society updated");
              }}
            />
          </section>
        )}
        <section className="panel">
          <h2>Join another society</h2>
          <p>Enter the invitation shared by your administrator.</p>
          <FormBox
            fields={{ token: "text" }}
            onSave={async (d) => {
              await request("/auth/join", { method: "POST", body: d });
              await refresh();
              say("Membership added. Select the society in the sidebar.");
            }}
          />
        </section>
        {role === "admin" && (
          <section className="panel">
            <h2>A thoughtful nudge</h2>
            <p>
              Create reminders for invoices due within three days and overdue
              assigned maintenance. Duplicate reminders are prevented each day.
            </p>
            <button
              className="button"
              onClick={async () => {
                try {
                  const r = await request("/reminders", { method: "POST" });
                  say(r.count + " new reminders created");
                  qc.invalidateQueries();
                } catch (e) {
                  say(e.message);
                }
              }}
            >
              <Bell size={17} /> Run reminders
            </button>
          </section>
        )}
      </div>
    </>
  );
}
function Platform() {
  const { say } = useApp();
  const {
    data: d,
    isLoading,
    error,
  } = useQuery({ queryKey: ["platform"], queryFn: () => request("/platform") });
  if (isLoading) return <Loading />;
  if (error) return <div className="error">{error.message}</div>;
  return (
    <>
      <div className="pageheading">
        <div>
          <h1>Your communities at a glance</h1>
          <p>Your communities, people, and platform activity.</p>
        </div>
        <span className="badge">Platform administrator</span>
      </div>
      <SummaryCards
        items={[
          ["Total societies", d.societies.length, "Registered communities"],
          ["Total users", d.users.length, "Across the platform", "blue"],
          [
            "Active societies",
            d.societies.filter((s) => s.status === "active").length,
            "Access enabled",
          ],
          ["Support requests", d.support.length, "Platform help desk", "pink"],
        ]}
      />
      <div className="two-col">
        {[
          [
            "Subscriptions by plan",
            Object.entries(
              d.societies.reduce(
                (a, s) => ((a[s.plan] = (a[s.plan] || 0) + 1), a),
                {},
              ),
            ).map(([name, value]) => ({ name, value })),
          ],
          [
            "Platform growth",
            Object.entries(
              d.societies.reduce((a, s) => {
                const k = new Date(s.created_at).toISOString().slice(0, 7);
                a[k] = (a[k] || 0) + 1;
                return a;
              }, {}),
            ).map(([name, value]) => ({ name, value })),
          ],
        ].map(([title, data]) => (
          <section className="panel" key={title}>
            <h3>{title}</h3>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#78a68a" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ))}
      </div>
      <section className="panel" style={{ marginTop: 20 }}>
        <h3>Registered societies</h3>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Society</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {d.societies.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.name}</b>
                    <small>{s.address}</small>
                  </td>
                  <td>{s.plan}</td>
                  <td>
                    <Status value={s.status} />
                  </td>
                  <td>
                    <button
                      className="button secondary small"
                      onClick={async () => {
                        try {
                          await request("/platform/" + s.id, {
                            method: "POST",
                            body: {
                              status:
                                s.status === "active" ? "suspended" : "active",
                            },
                          });
                          qc.invalidateQueries();
                          say("Society access updated");
                        } catch (e) {
                          say(e.message);
                        }
                      }}
                    >
                      {s.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="two-col">
        <section className="panel">
          <h3>Plan limits</h3>
          {d.plans.map((p) => (
            <div className="simple-row" key={p.id}>
              <b>{p.name}</b>
              <span>{p.unit_limit} units</span>
            </div>
          ))}
        </section>
        <section className="panel">
          <h3>Support inbox</h3>
          {d.support.length ? (
            d.support.map((s) => (
              <div className="simple-row" key={s.id}>
                <div>
                  <b>{s.title}</b>
                  <p>{s.body}</p>
                </div>
                <Status value={s.status} />
              </div>
            ))
          ) : (
            <p className="muted">No support requests yet.</p>
          )}
        </section>
        <section className="panel">
          <h3>Platform users</h3>
          {d.users.map((u) => (
            <div className="simple-row" key={u.id}>
              <div>
                <b>{u.name}</b>
                <small>{u.email}</small>
              </div>
              <Status value={u.platform_role} />
            </div>
          ))}
        </section>
        <section className="panel">
          <h3>Recent audit trail</h3>
          {d.audit.slice(0, 12).map((a) => (
            <div className="simple-row" key={a.id}>
              <span>{a.action}</span>
              <small>{new Date(a.created_at).toLocaleString()}</small>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
function Reports() {
  const { say } = useApp();
  const { data: overview } = useQuery({
    queryKey: ["analytics", currentSociety],
    queryFn: () => request("/analytics"),
  });
  const [from, setFrom] = useState(
      new Date(Date.now() - 86400000 * 90).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const {
    data: d,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reports", currentSociety, from, to],
    queryFn: () => request("/reports?from=" + from + "&to=" + to),
    enabled: !!from && !!to,
  });
  const charts = [
    [
      "occupancy",
      "Home occupancy",
      "Current occupancy, independent of date range",
    ],
    ["growth", "Resident growth", "New resident memberships"],
    ["collections", "Verified collections", "PKR, by payment submission month"],
    ["balances", "Outstanding balances", "PKR, for invoices created in range"],
    ["visitors", "Visitor traffic", "Entries per day"],
    ["categories", "Maintenance categories", "Requests created in range"],
    [
      "resolution",
      "Resolution progress",
      "Current status of requests created in range",
    ],
    ["workload", "Team workload", "Open tasks created in range"],
    ["facilities", "Facility use", "Approved reservations starting in range"],
    ["buildings", "Building maintenance", "Requests by building"],
  ];
  function exportData() {
    if (!d) return;
    const cell = (v) =>
      '"' +
      String(v)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const lines = [
      ["report", "label", "value"],
      ...charts.flatMap(([k]) => (d[k] || []).map((r) => [k, r.name, r.value])),
    ]
      .map((r) => r.map(cell).join(","))
      .join("\n");
    const u = URL.createObjectURL(new Blob([lines], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = u;
    a.download = "society-reports.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  return (
    <>
      <div className="pageheading">
        <div>
          <h1>Understand your community better</h1>
          <p>
            Real records, useful trends, and a little direction for what comes
            next.
          </p>
        </div>
        <button className="button secondary" onClick={exportData}>
          <Download size={16} />
          Export reports
        </button>
      </div>
      {overview && (
        <>
          <SummaryCards
            items={[
              [
                "Verified collections",
                money(overview.paid),
                "All-time approved payments",
              ],
              ["Open complaints", overview.open, "Needs attention", "pink"],
              [
                "Occupied units",
                overview.occupied,
                "Current occupancy",
                "blue",
              ],
              [
                "Community score",
                overview.score + "/100",
                "Live operational health",
              ],
            ]}
          />
          <div className="reference-dashboard-top">
            <ReferenceTrend data={overview.trend} />
            <OperationalSnapshot data={overview} />
          </div>
        </>
      )}
      <div className="panel reportfilters">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <span className="muted">
          Date range applies to each chart as described.
        </span>
      </div>
      {error && <div className="error">{error.message}</div>}
      {isLoading ? (
        <Loading />
      ) : (
        d && (
          <div className="two-col">
            {charts.map(([k, title, description]) => (
              <section className="panel" key={k}>
                <div className="panel-heading">
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <Activity size={17} />
                </div>
                {d[k].length ? (
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d[k]}>
                        <CartesianGrid vertical={false} stroke="#edf0e7" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 10 }} width={55} />
                        <Tooltip />
                        <Bar
                          dataKey="value"
                          fill={
                            ["collections", "growth", "visitors"].includes(k)
                              ? "#74aeb9"
                              : "#6f9b77"
                          }
                          radius={[5, 5, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty text="No records in this date range." />
                )}
              </section>
            ))}
          </div>
        )
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
