import { ArrowUpRight, Users } from "lucide-react";
import type { Resource, Booking } from "../types";
import { clock, minuteOfDay } from "../time";
import { ResourceIcon } from "./ResourceIcon";
export function Schedule({
  resources,
  bookings,
  timezone,
  book,
  inspect,
}: {
  resources: Resource[];
  bookings: Booking[];
  timezone: string;
  book: (id: number) => void;
  inspect: (b: Booking) => void;
}) {
  return (
    <div className="schedule" aria-label="Daily resource availability">
      <div className="schedule-head">
        <span>RESOURCE</span>
        <div className="hour-labels">
          {Array.from({ length: 13 }, (_, i) => (
            <span key={i}>{String(i + 8).padStart(2, "0")}:00</span>
          ))}
        </div>
      </div>
      {resources.map((r) => {
        const slots = bookings.filter(
          (b) => b.resource_id === r.id && !b.cancelled_at,
        );
        return (
          <div
            className={`schedule-row ${!r.active ? "paused" : ""}`}
            key={r.id}
          >
            <button
              className="resource-label"
              onClick={() => book(r.id)}
              disabled={!r.active}
              aria-label={`Book ${r.name}`}
            >
              <span className={`resource-icon ${r.kind}`}>
                <ResourceIcon kind={r.kind} />
              </span>
              <span>
                <strong>{r.name}</strong>
                <small>
                  <Users size={12} /> {r.capacity}{" "}
                  {r.capacity === 1 ? "person" : "people"}{" "}
                  <span>· {r.active ? r.kind : "Paused"}</span>
                </small>
              </span>
              <ArrowUpRight className="row-arrow" size={15} />
            </button>
            <div className="schedule-track">
              {slots.map((b) => {
                const start = minuteOfDay(b.starts_at, timezone);
                const end = minuteOfDay(b.ends_at, timezone);
                return (
                  <button
                    key={b.id}
                    className={`slot ${b.mine ? "mine" : r.kind}`}
                    style={{
                      left: `${((start - 480) / 720) * 100}%`,
                      width: `${((end - start) / 720) * 100}%`,
                    }}
                    onClick={() => inspect(b)}
                    aria-label={`${r.name}: ${b.title}, ${clock(b.starts_at, timezone)} to ${clock(b.ends_at, timezone)}`}
                  >
                    <strong>{b.title}</strong>
                    <span>
                      {clock(b.starts_at, timezone)} –{" "}
                      {clock(b.ends_at, timezone)}
                    </span>
                    {b.mine && <i>Your booking</i>}
                  </button>
                );
              })}
            </div>
            <div className="mobile-slots">
              {slots.length ? (
                slots.map((b) => (
                  <button
                    key={b.id}
                    className={`mobile-slot ${b.mine ? "mine" : ""}`}
                    onClick={() => inspect(b)}
                  >
                    <span>
                      {clock(b.starts_at, timezone)}–
                      {clock(b.ends_at, timezone)}
                    </span>
                    <strong>{b.title}</strong>
                  </button>
                ))
              ) : (
                <p className="muted small">A clear day. Make it yours.</p>
              )}
            </div>
          </div>
        );
      })}
      {!resources.length && (
        <div className="empty">No resources match this filter.</div>
      )}
      <div className="schedule-footer">
        <span>
          <i className="legend-dot mine" /> Your booking
        </span>
        <span>
          <i className="legend-dot room" /> Reserved
        </span>
        <span className="schedule-hint">
          Choose a resource to find your next slot <ArrowUpRight size={14} />
        </span>
      </div>
    </div>
  );
}
