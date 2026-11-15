-- Sample data (dates are relative to today so events are always upcoming)
INSERT INTO organizer (organizer_name, email, department) VALUES
 ('Dr. Anita Rao',   'anita.rao@pes.edu',  'Computer Science'),
 ('Prof. Rahul Nair','rahul.nair@pes.edu', 'Electronics'),
 ('Dr. Meena Iyer',  'meena.iyer@pes.edu', 'Management');

INSERT INTO student (student_name, email, department, phone) VALUES
 ('Dhawal Pathak',  'dhawal@pes.edu',  'Computer Science', '9876543210'),
 ('D Harikrishnan', 'hari@pes.edu',    'Computer Science', '9876543211'),
 ('Asha Kumar',     'asha@pes.edu',    'Electronics',      '9876543212'),
 ('Rohit Sharma',   'rohit@pes.edu',   'Electronics',      '9876543213'),
 ('Sneha Reddy',    'sneha@pes.edu',   'Management',       '9876543214'),
 ('Vikram Singh',   'vikram@pes.edu',  'Management',       '9876543215');

INSERT INTO venue (venue_name, location, capacity) VALUES
 ('Main Auditorium',  'Block A, Ground Floor', 4),
 ('Seminar Hall 1',   'Block B, First Floor',  3),
 ('Open Air Theatre', 'Central Campus',        200);

INSERT INTO event_resource (resource_name, resource_type, available_quantity) VALUES
 ('Projector',       'Equipment', 5),
 ('Microphone',      'Equipment', 10),
 ('Chairs',          'Furniture', 300),
 ('Laptop',          'Equipment', 8),
 ('Printed Banners', 'Material',  6);

INSERT INTO event (event_name, event_date, start_time, end_time, organizer_id, venue_id) VALUES
 ('AI and Machine Learning Workshop', CURRENT_DATE + 7,  '10:00', '13:00', 1, 1),
 ('Embedded Systems Seminar',         CURRENT_DATE + 10, '14:00', '16:00', 2, 2),
 ('Startup Pitch Day',                CURRENT_DATE + 14, '09:30', '12:30', 3, 3),
 ('Database Design Bootcamp',         CURRENT_DATE + 20, '10:00', '15:00', 1, 2);

INSERT INTO registration (student_id, event_id, registration_status) VALUES
 (1,1,'Registered'),(2,1,'Registered'),(3,1,'Registered'),
 (4,2,'Registered'),(5,2,'Registered'),
 (1,3,'Registered'),(6,3,'Registered');

INSERT INTO resource_allocation (event_id, resource_id, quantity) VALUES
 (1,1,2),(1,2,3),(1,3,4),
 (2,1,1),(2,2,2),
 (3,3,150),(3,5,4);
