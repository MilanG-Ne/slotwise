# Slotwise backend

- Use Laravel conventions and keep HTTP validation separate from reservation persistence.
- PostgreSQL is required. Do not substitute SQLite in tests: the exclusion constraint is part of the booking contract.
- Keep reservation timestamps in UTC; interpret booking inputs in `config('slotwise.timezone')`.
- New reservations and resource changes must lock the same resource row. Do not replace the database constraint with a preflight availability check.
- Members can cancel their own future bookings; admins can manage all resources and future bookings. Other members' booking titles stay private.
- Run `vendor/bin/pint` and `vendor/bin/phpunit` against a dedicated test database. Concurrency tests use separate processes and committed fixtures.
- Never commit `.env`, runtime storage, keys, or credentials. Demo accounts are deliberately fictional and enabled only for the local demo.
