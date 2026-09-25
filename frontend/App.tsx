import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  LayoutGrid,
  LogOut,
  MapPin,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { api, getSession, send, errorMessage, rememberSession } from "./api";
import type { Booking, Resource, Session } from "./types";
import { addDays, clock, dateInZone, formatDay } from "./time";
import { BookingForm } from "./components/BookingForm";
import { ResourceForm } from "./components/ResourceForm";
import { ResourceIcon } from "./components/ResourceIcon";
import { Schedule } from "./components/Schedule";
import { Login } from "./components/Login";
import { Dialog } from "./components/Dialog";

type View = "availability" | "bookings" | "resources" | "manage";
const pages = {
  availability: "Availability",
  bookings: "My bookings",
  resources: "Resources",
  manage: "Manage resources",
};
function currentView(): View {
  const hash = location.hash.slice(1);
  return Object.hasOwn(pages, hash) ? (hash as View) : "availability";
}
export default function App() {
  const query = useQueryClient();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    staleTime: Infinity,
    retry: false,
  });
  useEffect(() => {
    const expired = () => {
      query.cancelQueries();
      query.removeQueries({ queryKey: ["bookings"] });
      query.invalidateQueries({ queryKey: ["session"] });
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [query]);
  const replaceSession = (data: Session) => {
    query.setQueryData(["session"], rememberSession(data));
    query.removeQueries({
      predicate: (entry) => entry.queryKey[0] !== "session",
    });
  };
  if (session.isPending)
    return (
      <main className="boot" role="status">
        <span className="brand-mark">s</span> Opening your workspace…
      </main>
    );
  if (session.isError)
    return (
      <main className="boot">
        <h1>We couldn’t open your workspace.</h1>
        <p>{errorMessage(session.error)}</p>
        <button className="primary" onClick={() => session.refetch()}>
          Try again
        </button>
      </main>
    );
  if (!session.data.user)
    return <Login session={session.data} onLogin={replaceSession} />;
  return (
    <Workspace
      key={session.data.user.id}
      session={session.data}
      onLogout={replaceSession}
    />
  );
}
function Workspace({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: (s: Session) => void;
}) {
  const user = session.user!;
  const query = useQueryClient();
  const [view, setView] = useState<View>(currentView);
  const [date, setDate] = useState(session.today);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [bookingForm, setBookingForm] = useState<{
    resourceId?: number;
  } | null>(null);
  const [resourceForm, setResourceForm] = useState<{
    resource?: Resource;
  } | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const change = () => {
      setView(currentView());
      setSearch("");
      setFilter("all");
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const resources = useQuery({
    queryKey: ["resources"],
    queryFn: ({ signal }) =>
      api<{ data: Resource[] }>("/resources", { signal }),
  });
  const bookings = useQuery({
    queryKey: ["bookings", "day", date],
    queryFn: ({ signal }) =>
      api<{ data: Booking[] }>(`/bookings?date=${date}`, { signal }),
    refetchInterval: 30000,
  });
  const mine = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: ({ signal }) =>
      api<{ data: Booking[] }>("/bookings?mine=1", { signal }),
  });
  const logout = useMutation({
    mutationFn: () => api<Session>("/logout", send("POST")),
    onSuccess: onLogout,
  });
  const cancellation = useMutation({
    mutationFn: (id: number) => api(`/bookings/${id}`, send("DELETE")),
    onMutate: async (id) => {
      await query.cancelQueries({ queryKey: ["bookings"] });
      const previous = query.getQueriesData<{ data: Booking[] }>({
        queryKey: ["bookings"],
      });
      query.setQueriesData<{ data: Booking[] }>(
        { queryKey: ["bookings"] },
        (old) =>
          old && {
            data: old.data.map((b) =>
              b.id === id
                ? {
                    ...b,
                    cancelled_at: new Date().toISOString(),
                    can_cancel: false,
                  }
                : b,
            ),
          },
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([key, data]) => query.setQueryData(key, data));
    },
    onSuccess: () => {
      setSelected(null);
      setNotice("Booking cancelled. The space is free again.");
    },
    onSettled: () => query.invalidateQueries({ queryKey: ["bookings"] }),
  });
  const all = resources.data?.data || [];
  const day = bookings.data?.data.filter((b) => !b.cancelled_at) || [];
  const own = mine.data?.data || [];
  const upcoming = own.filter(
    (b) => !b.cancelled_at && new Date(b.ends_at) > new Date(),
  );
  const shown = all.filter(
    (r) =>
      (filter === "all" || r.kind === filter) &&
      `${r.name} ${r.location}`.toLowerCase().includes(search.toLowerCase()),
  );
  const inspect = (booking: Booking) => {
    cancellation.reset();
    setConfirmCancel(false);
    setSelected(booking);
  };
  const isManage = view === "manage" && user.is_admin;
  const loadError = resources.error || bookings.error || mine.error;
  const loading = resources.isPending || bookings.isPending || mine.isPending;
  const titles: Record<View, [string, string]> = {
    availability: [
      "Make room for good work.",
      "Find your space. Pick your moment. Make something happen.",
    ],
    bookings: [
      "A little space, just for you.",
      "Your plans, all in one place. Make room for what matters.",
    ],
    resources: [
      "Find your kind of space.",
      "From a quiet corner to a big idea. There’s a place for it here.",
    ],
    manage: [
      "A well-run workspace.",
      "Keep your shared resources ready for the next good idea.",
    ],
  };
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="#availability">
          <span className="brand-mark">s</span>slotwise
          <span className="brand-period">.</span>
        </a>
        <div className="workspace-badge">
          <span className="workspace-avatar">C</span>
          <div>
            <strong>The Commons</strong>
            <small>Shared workspace</small>
          </div>
          <span className="live-dot" />
        </div>
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {(
            [
              ["availability", CalendarDays],
              ["bookings", Clock3],
              ["resources", LayoutGrid],
              ...(user.is_admin ? [["manage", Settings2]] : []),
            ] as const
          ).map(([key, Icon]) => (
            <a
              key={String(key)}
              href={`#${key}`}
              className={view === key ? "active" : ""}
              aria-current={view === key ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{pages[key as View]}</span>
              {key === "bookings" && upcoming.length > 0 && (
                <span className="nav-count">{upcoming.length}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={19} />
            <strong>
              Great things happen
              <br />
              in shared spaces.
            </strong>
            <p>
              A little planning.
              <br />A lot of possibility.
            </p>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.is_admin ? "Workspace admin" : "Workspace member"}
              </small>
            </div>
            <button
              aria-label="Sign out"
              title="Sign out"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              <LogOut size={17} />
            </button>
          </div>
          {logout.isError && (
            <p role="alert" className="error">
              Could not sign out. Try again.
            </p>
          )}
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{pages[view]}</strong>
          </div>
          <div className="topbar-right">
            <span className="workspace-time">
              <span className="live-dot" /> {session.timezone}
            </span>
            {session.demo && <span className="demo-pill">DEMO WORKSPACE</span>}
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                THE COMMONS /{" "}
                {view === "availability"
                  ? "YOUR DAY, SIMPLIFIED"
                  : "A SPACE FOR EVERY PLAN"}
              </div>
              <h1>{titles[view][0]}</h1>
              <p>{titles[view][1]}</p>
            </div>
            <button
              className="primary"
              onClick={() =>
                isManage ? setResourceForm({}) : setBookingForm({})
              }
              disabled={!isManage && !all.some((r) => r.active)}
            >
              <Plus size={18} />
              {isManage ? "Add resource" : "New booking"}
            </button>
          </section>
          {loadError && (
            <div role="alert" className="error load-error">
              {errorMessage(loadError)}{" "}
              <button onClick={() => query.invalidateQueries()}>
                Retry loading
              </button>
            </div>
          )}
          {view === "availability" && (
            <>
              <section className="stats" aria-label="Workspace summary">
                <div>
                  <span className="stat-icon sage">
                    <DoorOpen size={21} />
                  </span>
                  <div>
                    <span>Shared resources</span>
                    <strong>
                      {loading
                        ? "—"
                        : all
                            .filter((r) => r.active)
                            .length.toString()
                            .padStart(2, "0")}
                      <small>ready for your ideas</small>
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="stat-icon lilac">
                    <CalendarDays size={21} />
                  </span>
                  <div>
                    <span>On the calendar</span>
                    <strong>
                      {loading ? "—" : day.length.toString().padStart(2, "0")}
                      <small>bookings this day</small>
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="stat-icon peach">
                    <Clock3 size={21} />
                  </span>
                  <div>
                    <span>Your next plans</span>
                    <strong>
                      {loading
                        ? "—"
                        : upcoming.length.toString().padStart(2, "0")}
                      <small>upcoming reservations</small>
                    </strong>
                  </div>
                </div>
              </section>
              <section className="calendar-panel">
                <div className="panel-title">
                  <div>
                    <h2>
                      The day at a glance{" "}
                      <span className="count-pill">{all.length} resources</span>
                    </h2>
                    <p>
                      All times in {session.timezone}. Open daily, 08:00–20:00.
                    </p>
                  </div>
                  <div className="date-controls">
                    <button
                      className="icon-button"
                      aria-label="Previous day"
                      onClick={() => setDate(addDays(date, -1))}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <label className="date-label">
                      <span className="sr-only">Schedule date</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                          e.target.value && setDate(e.target.value)
                        }
                      />
                    </label>
                    <button
                      className="icon-button"
                      aria-label="Next day"
                      onClick={() => setDate(addDays(date, 1))}
                    >
                      <ChevronRight size={18} />
                    </button>
                    <button
                      className="secondary small-button"
                      onClick={() => setDate(session.today)}
                    >
                      Today
                    </button>
                  </div>
                </div>
                <div className="week-strip">
                  {Array.from({ length: 7 }, (_, i) =>
                    addDays(date, i - 3),
                  ).map((d) => (
                    <button
                      key={d}
                      className={d === date ? "selected" : ""}
                      aria-pressed={d === date}
                      aria-label={formatDay(d)}
                      onClick={() => setDate(d)}
                    >
                      <span>{formatDay(d, { weekday: "short" })}</span>
                      <strong>{d.slice(-2)}</strong>
                      <i>
                        {d === session.today
                          ? "TODAY"
                          : formatDay(d, { month: "short" }).toUpperCase()}
                      </i>
                    </button>
                  ))}
                  <div className="week-message">
                    <span className="mini-flower" aria-hidden="true">
                      ✳
                    </span>
                    <p>
                      A little space.
                      <br />
                      <strong>A lot of potential.</strong>
                    </p>
                  </div>
                </div>
                <div className="filterbar">
                  <div className="segmented" aria-label="Resource type">
                    {["all", "room", "studio", "equipment"].map((k) => (
                      <button
                        aria-pressed={filter === k}
                        className={filter === k ? "selected" : ""}
                        key={k}
                        onClick={() => setFilter(k)}
                      >
                        {k === "all"
                          ? "All resources"
                          : k === "equipment"
                            ? "Equipment"
                            : `${k[0].toUpperCase()}${k.slice(1)}s`}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search resources"
                      placeholder="Find a resource…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                {loading ? (
                  <div className="empty" role="status">
                    Loading the workspace…
                  </div>
                ) : (
                  <Schedule
                    resources={shown}
                    bookings={day}
                    timezone={session.timezone}
                    book={(resourceId) => setBookingForm({ resourceId })}
                    inspect={inspect}
                  />
                )}
              </section>
              <section className="bottom-banner">
                <div>
                  <span className="banner-icon">
                    <Sparkles size={21} />
                  </span>
                  <div>
                    <strong>Find a space that fits.</strong>
                    <p>
                      Explore the rooms, studios, and little things that make
                      work better.
                    </p>
                  </div>
                </div>
                <a href="#resources">
                  Meet the resources <ArrowRight size={16} />
                </a>
              </section>
            </>
          )}
          {view === "bookings" && (
            <section className="booking-list">
              <div className="panel-title">
                <div>
                  <h2>Your reservations</h2>
                  <p>
                    Upcoming plans and the last 30 days. Cancel before a booking
                    starts.
                  </p>
                </div>
              </div>
              {loading ? (
                <div className="empty" role="status">
                  Loading your plans…
                </div>
              ) : own.length === 0 ? (
                <div className="empty">
                  <CalendarDays size={32} />
                  <h3>A little room in your calendar.</h3>
                  <p>Your first reservation belongs here.</p>
                  <button
                    className="primary"
                    onClick={() => setBookingForm({})}
                  >
                    Find a space
                  </button>
                </div>
              ) : (
                own.map((b) => (
                  <button
                    className={`booking-list-row ${b.cancelled_at ? "cancelled" : ""}`}
                    key={b.id}
                    onClick={() => inspect(b)}
                  >
                    <span className="booking-date">
                      <small>
                        {formatDay(dateInZone(b.starts_at, session.timezone), {
                          month: "short",
                        })}
                      </small>
                      <strong>
                        {dateInZone(b.starts_at, session.timezone).slice(-2)}
                      </strong>
                    </span>
                    <span className="booking-info">
                      <strong>{b.title}</strong>
                      <small>
                        {b.resource_name} ·{" "}
                        {clock(b.starts_at, session.timezone)}–
                        {clock(b.ends_at, session.timezone)}
                      </small>
                    </span>
                    <span
                      className={`status-pill ${b.cancelled_at ? "neutral" : ""}`}
                    >
                      {b.cancelled_at
                        ? "Cancelled"
                        : new Date(b.ends_at) < new Date()
                          ? "Completed"
                          : "Confirmed"}
                    </span>
                    <ArrowUpRight size={18} />
                  </button>
                ))
              )}
            </section>
          )}
          {(view === "resources" || isManage) && (
            <section className="resource-grid" aria-label="Resources">
              {shown.map((r) => (
                <article className={`resource-card ${r.kind}`} key={r.id}>
                  <div className="resource-art" aria-hidden="true">
                    <div className="resource-art-circle" />
                    <ResourceIcon kind={r.kind} size={58} />
                    <span>
                      {r.kind === "equipment"
                        ? "TOOLS FOR IDEAS"
                        : r.kind === "studio"
                          ? "MAKE SOMETHING"
                          : "ROOM TO THINK"}
                    </span>
                  </div>
                  <div className="resource-card-body">
                    <div className="resource-card-title">
                      <span className="eyebrow">{r.kind}</span>
                      <span
                        className={`status-pill ${!r.active ? "neutral" : ""}`}
                      >
                        {r.active ? "Bookable" : "Paused"}
                      </span>
                    </div>
                    <h2>{r.name}</h2>
                    <p>{r.description}</p>
                    <div className="resource-facts">
                      <span>
                        <MapPin size={15} />
                        {r.location}
                      </span>
                      <span>
                        <Users size={15} />
                        {r.capacity} {r.capacity === 1 ? "person" : "people"}
                      </span>
                    </div>
                    <button
                      className="secondary full"
                      disabled={!isManage && !r.active}
                      onClick={() =>
                        isManage
                          ? setResourceForm({ resource: r })
                          : setBookingForm({ resourceId: r.id })
                      }
                    >
                      {isManage ? "Edit resource" : "Book this resource"}{" "}
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
          {view === "manage" && !user.is_admin && (
            <div className="empty">
              Resource settings are available to workspace admins.
            </div>
          )}
          <footer className="page-footer">
            <span>Made for a better workday.</span>
            <span>
              Slotwise <span className="footer-dot">·</span>{" "}
              {session.demo
                ? "Fictional demo workspace"
                : "Shared resource booking"}
            </span>
          </footer>
        </main>
      </div>
      <div
        className={`toast ${notice ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice && (
          <>
            <Check size={18} />
            {notice}
          </>
        )}
      </div>
      {bookingForm && (
        <BookingForm
          resources={all}
          session={session}
          date={date}
          resourceId={bookingForm.resourceId}
          close={() => setBookingForm(null)}
          saved={() => setNotice("You’re booked. Make something good.")}
        />
      )}
      {resourceForm && (
        <ResourceForm
          resource={resourceForm.resource}
          close={() => setResourceForm(null)}
          saved={() => setNotice("Resource saved.")}
        />
      )}
      {selected && (
        <Dialog
          title={selected.title}
          close={() => setSelected(null)}
          busy={cancellation.isPending}
        >
          <span className="detail-kind">{selected.resource_name}</span>
          <div className="booking-detail">
            <p>
              <CalendarDays size={18} />
              {formatDay(dateInZone(selected.starts_at, session.timezone))}
            </p>
            <p>
              <Clock3 size={18} />
              {clock(selected.starts_at, session.timezone)}–
              {clock(selected.ends_at, session.timezone)} · {session.timezone}
            </p>
            {selected.owner && (
              <p>
                <Users size={18} />
                {selected.owner}
                {selected.mine ? " (you)" : ""}
              </p>
            )}
          </div>
          {selected.cancelled_at ? (
            <p className="callout">This reservation has been cancelled.</p>
          ) : selected.can_cancel ? (
            <div className="cancel-area">
              {confirmCancel ? (
                <>
                  <p>
                    Cancel this booking? The time will become available to
                    everyone.
                  </p>
                  <div className="dialog-actions">
                    <button
                      className="secondary"
                      disabled={cancellation.isPending}
                      onClick={() => setConfirmCancel(false)}
                    >
                      Keep booking
                    </button>
                    <button
                      className="danger"
                      disabled={cancellation.isPending}
                      onClick={() => cancellation.mutate(selected.id)}
                    >
                      {cancellation.isPending
                        ? "Cancelling…"
                        : "Yes, cancel booking"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="secondary danger-text"
                  onClick={() => setConfirmCancel(true)}
                >
                  Cancel booking
                </button>
              )}
            </div>
          ) : (
            <p className="muted">
              {selected.mine
                ? "This booking has already started."
                : "This time is reserved."}
            </p>
          )}
          {cancellation.isError && (
            <p className="error" role="alert">
              {errorMessage(cancellation.error)} Your reservation has been
              restored in the calendar.
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}
