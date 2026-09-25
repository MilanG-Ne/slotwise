import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, send, errorMessage } from "../api";
import type { Resource, ResourceInput } from "../types";
import { Dialog } from "./Dialog";
export function ResourceForm({
  resource,
  close,
  saved,
}: {
  resource?: Resource;
  close: () => void;
  saved: () => void;
}) {
  const query = useQueryClient();
  const [form, setForm] = useState<ResourceInput>(
    resource || {
      name: "",
      kind: "room",
      capacity: 4,
      location: "",
      description: "",
      active: true,
    },
  );
  const mutation = useMutation({
    mutationFn: () =>
      api(
        resource ? `/resources/${resource.id}` : "/resources",
        send(resource ? "PUT" : "POST", form),
      ),
    onSuccess: () => {
      query.invalidateQueries({ queryKey: ["resources"] });
      saved();
      close();
    },
  });
  return (
    <Dialog
      title={resource ? "Edit resource" : "A new shared space"}
      close={close}
      busy={mutation.isPending}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label>
          Name
          <input
            data-autofocus
            required
            maxLength={80}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            Type
            <select
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as Resource["kind"] })
              }
            >
              <option value="room">Room</option>
              <option value="studio">Studio</option>
              <option value="equipment">Equipment</option>
            </select>
          </label>
          <label>
            Capacity
            <input
              type="number"
              required
              min={1}
              max={100}
              value={form.capacity}
              onChange={(e) =>
                setForm({ ...form, capacity: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <label>
          Location
          <input
            required
            maxLength={80}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            required
            maxLength={300}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />{" "}
          Available for new bookings
        </label>
        <p className="muted small">
          Pausing a resource preserves existing reservations.
        </p>
        {mutation.isError && (
          <p role="alert" className="error">
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
            Cancel
          </button>
          <button className="primary" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save resource"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
