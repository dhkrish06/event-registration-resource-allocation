-- Event Registration and Resource Allocation Management System
-- PostgreSQL schema (DDL). Running this file RESETS the database.

DROP VIEW IF EXISTS v_event_summary, v_resource_usage;
DROP TABLE IF EXISTS app_user, resource_allocation, registration, event,
                     event_resource, venue, student, organizer CASCADE;
DROP FUNCTION IF EXISTS fn_check_venue_conflict() CASCADE;
DROP FUNCTION IF EXISTS fn_allocate_resource() CASCADE;
DROP FUNCTION IF EXISTS fn_restore_resource() CASCADE;
DROP FUNCTION IF EXISTS fn_seats_left(INT) CASCADE;

-- ---------- Tables ----------
CREATE TABLE organizer (
  organizer_id   SERIAL PRIMARY KEY,
  organizer_name VARCHAR(100) NOT NULL,
  email          VARCHAR(120) NOT NULL UNIQUE,
  department     VARCHAR(80)  NOT NULL
);

CREATE TABLE student (
  student_id   SERIAL PRIMARY KEY,
  student_name VARCHAR(100) NOT NULL,
  email        VARCHAR(120) NOT NULL UNIQUE,
  department   VARCHAR(80)  NOT NULL,
  phone        VARCHAR(15)
);
-- Added with ALTER to demonstrate ALTER TABLE
ALTER TABLE student ADD CONSTRAINT chk_student_phone
  CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$');
ALTER TABLE student ADD CONSTRAINT chk_student_email
  CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

CREATE TABLE venue (
  venue_id   SERIAL PRIMARY KEY,
  venue_name VARCHAR(100) NOT NULL UNIQUE,
  location   VARCHAR(150) NOT NULL,
  capacity   INT NOT NULL CHECK (capacity > 0)
);

CREATE TABLE event_resource (
  resource_id        SERIAL PRIMARY KEY,
  resource_name      VARCHAR(100) NOT NULL UNIQUE,
  resource_type      VARCHAR(50)  NOT NULL,
  available_quantity INT NOT NULL CHECK (available_quantity >= 0)
);

CREATE TABLE event (
  event_id     SERIAL PRIMARY KEY,
  event_name   VARCHAR(150) NOT NULL,
  event_date   DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  organizer_id INT NOT NULL REFERENCES organizer(organizer_id) ON DELETE RESTRICT,
  venue_id     INT NOT NULL REFERENCES venue(venue_id)         ON DELETE RESTRICT,
  CONSTRAINT chk_event_time CHECK (end_time > start_time)
);

CREATE TABLE registration (
  registration_id     SERIAL PRIMARY KEY,
  student_id          INT NOT NULL REFERENCES student(student_id) ON DELETE CASCADE,
  event_id            INT NOT NULL REFERENCES event(event_id)     ON DELETE CASCADE,
  registration_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  registration_status VARCHAR(12) NOT NULL DEFAULT 'Registered'
    CHECK (registration_status IN ('Registered','Waitlisted','Cancelled')),
  CONSTRAINT uq_student_event UNIQUE (student_id, event_id)
);

CREATE TABLE resource_allocation (
  allocation_id   SERIAL PRIMARY KEY,
  event_id        INT NOT NULL REFERENCES event(event_id)                ON DELETE CASCADE,
  resource_id     INT NOT NULL REFERENCES event_resource(resource_id)    ON DELETE RESTRICT,
  quantity        INT NOT NULL CHECK (quantity > 0),
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT uq_event_resource UNIQUE (event_id, resource_id)
);

-- Login accounts (authentication + role based access)
CREATE TABLE app_user (
  user_id       SERIAL PRIMARY KEY,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('admin','organizer','student')),
  student_id    INT REFERENCES student(student_id)     ON DELETE CASCADE,
  organizer_id  INT REFERENCES organizer(organizer_id) ON DELETE CASCADE,
  CONSTRAINT chk_role_link CHECK (
    (role = 'student'   AND student_id   IS NOT NULL AND organizer_id IS NULL) OR
    (role = 'organizer' AND organizer_id IS NOT NULL AND student_id   IS NULL) OR
    (role = 'admin'     AND student_id   IS NULL     AND organizer_id IS NULL))
);

-- ---------- Indexes ----------
CREATE INDEX idx_event_date        ON event(event_date);
CREATE INDEX idx_event_venue_date  ON event(venue_id, event_date);
CREATE INDEX idx_reg_event_status  ON registration(event_id, registration_status);
CREATE INDEX idx_alloc_event       ON resource_allocation(event_id);
-- Full-text search index on event names
CREATE INDEX idx_event_fts ON event USING GIN (to_tsvector('english', event_name));

-- ---------- Functions ----------
CREATE FUNCTION fn_seats_left(p_event_id INT) RETURNS INT AS $$
  SELECT v.capacity - (SELECT COUNT(*) FROM registration r
                       WHERE r.event_id = e.event_id
                         AND r.registration_status = 'Registered')::INT
  FROM event e JOIN venue v ON v.venue_id = e.venue_id
  WHERE e.event_id = p_event_id
$$ LANGUAGE sql STABLE;

-- ---------- Triggers ----------
-- 1. Prevent double-booking of a venue (overlapping time on same date)
CREATE FUNCTION fn_check_venue_conflict() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM event e
    WHERE e.venue_id   = NEW.venue_id
      AND e.event_date = NEW.event_date
      AND e.event_id  <> COALESCE(NEW.event_id, -1)
      AND NEW.start_time < e.end_time
      AND NEW.end_time   > e.start_time
  ) THEN
    RAISE EXCEPTION 'Venue is already booked for an overlapping time slot on this date';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_venue_conflict
  BEFORE INSERT OR UPDATE ON event
  FOR EACH ROW EXECUTE FUNCTION fn_check_venue_conflict();

-- 2. Check stock and deduct when a resource is allocated
CREATE FUNCTION fn_allocate_resource() RETURNS TRIGGER AS $$
DECLARE avail INT;
BEGIN
  SELECT available_quantity INTO avail
  FROM event_resource WHERE resource_id = NEW.resource_id FOR UPDATE;
  IF avail IS NULL THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;
  IF avail < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock: only % unit(s) available', avail;
  END IF;
  UPDATE event_resource
     SET available_quantity = available_quantity - NEW.quantity
   WHERE resource_id = NEW.resource_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_allocate_resource
  BEFORE INSERT ON resource_allocation
  FOR EACH ROW EXECUTE FUNCTION fn_allocate_resource();

-- 3. Return stock when an allocation is removed (also fires on event delete)
CREATE FUNCTION fn_restore_resource() RETURNS TRIGGER AS $$
BEGIN
  UPDATE event_resource
     SET available_quantity = available_quantity + OLD.quantity
   WHERE resource_id = OLD.resource_id;
  RETURN OLD;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restore_resource
  AFTER DELETE ON resource_allocation
  FOR EACH ROW EXECUTE FUNCTION fn_restore_resource();

-- ---------- Views ----------
CREATE VIEW v_event_summary AS
SELECT e.event_id, e.event_name, e.event_date, e.start_time, e.end_time,
       e.organizer_id, o.organizer_name,
       e.venue_id, v.venue_name, v.location, v.capacity,
       COUNT(r.registration_id) FILTER (WHERE r.registration_status = 'Registered') AS registered_count,
       COUNT(r.registration_id) FILTER (WHERE r.registration_status = 'Waitlisted') AS waitlisted_count,
       fn_seats_left(e.event_id) AS seats_left
FROM event e
JOIN organizer o ON o.organizer_id = e.organizer_id
JOIN venue v     ON v.venue_id     = e.venue_id
LEFT JOIN registration r ON r.event_id = e.event_id
GROUP BY e.event_id, o.organizer_id, v.venue_id;

CREATE VIEW v_resource_usage AS
SELECT er.resource_id, er.resource_name, er.resource_type, er.available_quantity,
       COALESCE(SUM(ra.quantity), 0)::INT AS allocated_quantity,
       (er.available_quantity + COALESCE(SUM(ra.quantity), 0))::INT AS total_quantity
FROM event_resource er
LEFT JOIN resource_allocation ra ON ra.resource_id = er.resource_id
GROUP BY er.resource_id;
