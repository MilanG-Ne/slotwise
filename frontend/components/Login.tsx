import { useState } from "react";
import { ArrowRight, Leaf, CalendarDays, ShieldCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api, send, rememberSession, errorMessage } from "../api";
import type { Session } from "../types";
export function Login({
  session,
  onLogin,
}: {
  session: Session;
  onLogin: (s: Session) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api<Session>("/login", send("POST", credentials)).then(rememberSession),
    onSuccess: onLogin,
  });
  return (
    <main className="login">
      <section className="login-story">
        <a className="brand" href="/">
          <span className="brand-mark">s</span>slotwise
          <span className="brand-period">.</span>
        </a>
        <div>
          <span className="eyebrow light">
            LESS COORDINATION. MORE CREATION.
          </span>
          <h1>
            Good work
            <br />
            needs a<br />
            <em>little room.</em>
          </h1>
          <p>
            One shared space for your shared spaces.
            <br />
            Find a room, grab your time, get to it.
          </p>
        </div>
        <div className="login-art" aria-hidden="true">
          <div className="art-window" />
          <div className="art-table" />
          <div className="art-plant">
            <Leaf size={62} />
          </div>
          <span className="art-note">
            <CalendarDays size={20} /> Room for your next idea
          </span>
        </div>
        <p className="login-footer">Thoughtfully shared. Simply booked.</p>
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <span className="eyebrow">WELCOME TO THE COMMONS</span>
          <h2>Your day, with a little more space.</h2>
          <p className="muted">
            Sign in to book rooms, studios, and equipment.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate({ email, password });
            }}
          >
            <label>
              Email
              <input
                autoComplete="username"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {mutation.isError && (
              <p role="alert" className="error">
                {errorMessage(mutation.error)}
              </p>
            )}
            <button className="primary full" disabled={mutation.isPending}>
              Sign in <ArrowRight size={18} />
            </button>
          </form>
          {session.demo && (
            <div className="demo-panel">
              <span className="eyebrow">TAKE A LOOK AROUND</span>
              <p>Fictional workspace. Real booking experience.</p>
              <div className="demo-buttons">
                <button
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      email: "alex@example.test",
                      password: "demo-password",
                    })
                  }
                >
                  Explore as member <ArrowRight size={15} />
                </button>
                <button
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      email: "jordan@example.test",
                      password: "demo-password",
                    })
                  }
                >
                  Explore as admin <ArrowRight size={15} />
                </button>
              </div>
              <small>
                Demo accounts use the password <code>demo-password</code>.
              </small>
            </div>
          )}
          <div className="login-trust">
            <ShieldCheck size={17} /> No payments. No email integrations. Just a
            shared calendar.
          </div>
        </div>
      </section>
    </main>
  );
}
