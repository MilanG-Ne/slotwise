export type User = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
};
export type Session = {
  user: User | null;
  csrf_token: string;
  timezone: string;
  today: string;
  demo: boolean;
};
export type Resource = {
  id: number;
  name: string;
  kind: "room" | "studio" | "equipment";
  location: string;
  capacity: number;
  description: string;
  active: boolean;
};
export type Booking = {
  id: number;
  resource_id: number;
  resource_name: string;
  title: string;
  owner: string | null;
  starts_at: string;
  ends_at: string;
  cancelled_at: string | null;
  mine: boolean;
  can_cancel: boolean;
};
export type BookingInput = {
  resource_id: number;
  title: string;
  date: string;
  start_time: string;
  duration: number;
};
export type ResourceInput = Omit<Resource, "id">;
