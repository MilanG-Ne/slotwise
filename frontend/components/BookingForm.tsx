import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock3, ShieldCheck } from "lucide-react";
import { api, errorMessage, send } from "../api";
import type { Booking, BookingInput, Resource, Session } from "../types";
import { addDays, timeOptions } from "../time";
import { Dialog } from "./Dialog";
export function BookingForm({
  resources,
  session,
  date,
  resourceId,
  close,
  saved,
}: {
  resources: Resource[];
  session: Session;
  date: string;
  resourceId?: number;
  close: () => void;
  saved: () => void;
}) {
  const query = useQueryClient();
  const [form, setForm] = useState<BookingInput>({
    resource_id: resourceId || resources.find((r) => r.active)?.id || 0,
    title: "",
    date: date < session.today ? session.today : date,
    start_time: "10:00",
    duration: 60,
  });
  const mutation = useMutation({
    mutationFn: (input: BookingInput) =>
      api<{ data: Booking }>("/bookings", send("POST", input)),
    onSuccess: () => {
      saved();
      close();
    },
    onSettled: () => query.invalidateQueries({ queryKey: ["bookings"] }),
  });
  const update = (key: keyof BookingInput, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));
  return (
    <Dialog title="Make a little room" close={close} busy={mutation.isPending}>
      <p className="muted">
        A space for your next good idea. All times in {session.timezone}.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <label>
          Resource
          <select
            value={form.resource_id}
            onChange={(e) => update("resource_id", Number(e.target.value))}
          >
            {resources
              .filter((r) => r.active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.capacity}{" "}
                  {r.capacity === 1 ? "person" : "people"}
                </option>
              ))}
          </select>
        </label>
        <label>
          What’s the plan?
          <input
            data-autofocus
            required
            maxLength={100}
            placeholder="e.g. Design team catch-up"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>
        <label>
          Date
          <input
            required
            type="date"
            min={session.today}
            max={addDays(session.today, 90)}
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Start time
            <select
              value={form.start_time}
              onChange={(e) => update("start_time", e.target.value)}
            >
              {timeOptions.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Duration
            <select
              value={form.duration}
              onChange={(e) => update("duration", Number(e.target.value))}
            >
              {[30, 60, 90, 120, 150, 180, 210, 240].map((m) => (
                <option value={m} key={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="callout">
          <Clock3 size={17} /> Open 08:00–20:00 · Up to 4 hours per booking
        </div>
        {mutation.isError && (
          <p className="error" role="alert">
            {errorMessage(mutation.error)}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="secondary"
            disabled={mutation.isPending}
            onClick={close}
          >
            Never mind
          </button>
          <button
            className="primary"
            disabled={mutation.isPending || !form.resource_id}
          >
            {mutation.isPending ? "Reserving…" : "Confirm booking"}
          </button>
        </div>
        <p className="form-note">
          <ShieldCheck size={14} /> Your slot is confirmed only when the
          reservation succeeds.
        </p>
      </form>
    </Dialog>
  );
}
