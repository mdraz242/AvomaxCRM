-- ============================================================================
-- Seed Data: Admission & Visa Tracking Management System
-- Default password for all seeded staff accounts: Admin@123456
-- ============================================================================

INSERT INTO public.profiles (id, full_name, email, password_hash, role, phone, department, is_active)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'Elena Vance', 'superadmin@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'super_admin', '+1-555-0101', 'Executive Leadership', TRUE),
  ('11111111-1111-4111-8111-111111111102', 'Marcus Chen', 'admin@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'admin', '+1-555-0102', 'Admissions Operations', TRUE),
  ('11111111-1111-4111-8111-111111111103', 'Priya Sharma', 'counselor1@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'counselor', '+1-555-0103', 'UK & Europe Counseling', TRUE),
  ('11111111-1111-4111-8111-111111111104', 'David Miller', 'counselor2@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'counselor', '+1-555-0104', 'North America & Australia', TRUE),
  ('11111111-1111-4111-8111-111111111105', 'Sarah Jenkins', 'viewer@educrm.io', '$2b$12$HHrepXFMqbl/rJf2/9GbTucpZ9a7sln1r2oP6r/w2V5QEHZ5EooiK', 'viewer', '+1-555-0105', 'Compliance & Audit', TRUE)
ON CONFLICT (email) DO NOTHING;

-- System Settings
INSERT INTO public.system_settings (setting_key, setting_value, description, updated_by)
VALUES
  ('organization_name', '"AvomaxCRM"'::jsonb, 'Organization display name', '11111111-1111-4111-8111-111111111101'),
  ('default_currency', '"USD"'::jsonb, 'Default billing currency for admission fees', '11111111-1111-4111-8111-111111111101'),
  ('active_academic_year', '"2026-2027"'::jsonb, 'Default academic year for new student applications', '11111111-1111-4111-8111-111111111101'),
  ('supported_intakes', '["Fall 2026", "Spring 2027", "Summer 2027"]'::jsonb, 'Standard intake cycles', '11111111-1111-4111-8111-111111111101'),
  ('max_upload_mb', '10'::jsonb, 'Maximum document upload size in MB', '11111111-1111-4111-8111-111111111101')
ON CONFLICT (setting_key) DO NOTHING;

-- Sample Students
INSERT INTO public.students (
  id, student_code, full_name, email, phone, whatsapp_number, passport_number,
  nationality, date_of_birth, gender, passport_expiry_date,
  destination_country, university_name, course_name, intake, academic_year,
  assigned_counselor_id, application_date, internal_remarks, created_by
)
VALUES
  ('22222222-2222-4222-8222-222222222201', '', 'Aarav Patel', 'aarav.patel@example.com', '+91-9820111222', '+91-9820111222', 'Z4829104', 'Indian', '2003-04-12', 'Male', '2030-08-15', 'United Kingdom', 'University of Manchester', 'MSc Data Science', 'Fall 2026', '2026-2027', '11111111-1111-4111-8111-111111111103', '2026-08-10', 'Strong academic background; IELTS 7.5 cleared.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222202', '', 'Sofia Rodriguez', 'sofia.r@example.com', '+52-5540123456', '+52-5540123456', 'G9102837', 'Mexican', '2002-11-23', 'Female', '2031-03-20', 'Canada', 'University of Toronto', 'Master of Engineering', 'Fall 2026', '2026-2027', '11111111-1111-4111-8111-111111111104', '2026-08-22', 'Awaiting updated financial sponsor statement.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222203', '', 'Liam O''Connor', 'liam.oconnor@example.com', '+353-871234567', '+353-871234567', 'P3391022', 'Irish', '2004-02-08', 'Male', '2029-11-30', 'Australia', 'University of Melbourne', 'BSc Computer Science', 'Spring 2027', '2026-2027', '11111111-1111-4111-8111-111111111104', '2026-09-05', 'Preparing visa SOP and OSHC insurance.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222204', '', 'Zainab Al-Mansoor', 'zainab.m@example.com', '+971-501122334', '+971-501122334', 'N7721094', 'Emirati', '2001-07-19', 'Female', '2031-06-10', 'United States', 'Boston University', 'MBA Global Business', 'Fall 2026', '2026-2027', '11111111-1111-4111-8111-111111111103', '2026-09-18', 'All 6 stages complete; ready for departure.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222205', '', 'Min-jun Park', 'minjun.park@example.com', '+82-1044556677', '+82-1044556677', 'M5540192', 'South Korean', '2003-09-30', 'Male', '2030-01-14', 'Germany', 'TU Munich', 'MSc Robotics & AI', 'Spring 2027', '2026-2027', '11111111-1111-4111-8111-111111111103', '2026-10-02', 'Blocked account confirmation pending.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222206', '', 'Chidinma Okafor', 'chidinma.o@example.com', '+234-8031122334', '+234-8031122334', 'A8812033', 'Nigerian', '2002-05-14', 'Female', '2029-09-01', 'United Kingdom', 'University of Leeds', 'MSc Public Health', 'Fall 2026', '2026-2027', '11111111-1111-4111-8111-111111111104', '2026-10-15', 'Conditional offer received; awaiting final transcript.', '11111111-1111-4111-8111-111111111102')
ON CONFLICT (id) DO NOTHING;

-- Admissions
INSERT INTO public.admissions (student_id, status, offer_reference, offer_received_date, decision_date, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Admission Confirmed', 'UOM-2026-991', '2026-08-20', '2026-09-01', 'CAS issued and seat confirmed.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222202', 'Unconditional Offer Received', 'UOT-2026-441', '2026-09-02', NULL, 'Offer accepted verbally; deposit pending.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222203', 'Admission Confirmed', 'MELB-2027-112', '2026-09-14', '2026-09-25', 'COE generated.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222204', 'Admission Confirmed', 'BU-2026-778', '2026-09-22', '2026-09-28', 'I-20 issued.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222205', 'Under Review', NULL, NULL, NULL, 'Application forwarded to admissions committee.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222206', 'Conditional Offer Received', 'LEEDS-2026-310', '2026-10-22', NULL, 'Condition: submit attested degree certificate.', '11111111-1111-4111-8111-111111111104')
ON CONFLICT (student_id) DO NOTHING;

-- Fee Payments
INSERT INTO public.fee_payments (student_id, payment_status, currency, total_fee, amount_paid, payment_date, payment_reference, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Paid', 'USD', 4500.00, 4500.00, '2026-09-02', 'TXN-UOM-8821', 'Full admission deposit received.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222202', 'Partially Paid', 'USD', 5000.00, 2000.00, '2026-09-10', 'TXN-UOT-3310', 'Initial installment received; balance due next week.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222203', 'Paid', 'USD', 3800.00, 3800.00, '2026-09-24', 'TXN-MELB-551', 'Cleared via wire transfer.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222204', 'Waived', 'USD', 2500.00, 0.00, '2026-09-27', 'SCHOLAR-MERIT-100', '100% merit fee waiver approved.', '11111111-1111-4111-8111-111111111101'),
  ('22222222-2222-4222-8222-222222222205', 'Pending', 'USD', 1500.00, 0.00, NULL, NULL, 'Awaiting invoice issuance.', '11111111-1111-4111-8111-111111111102'),
  ('22222222-2222-4222-8222-222222222206', 'Pending', 'USD', 3000.00, 0.00, NULL, NULL, 'Payable upon unconditional offer.', '11111111-1111-4111-8111-111111111102');

-- Visa Applications
INSERT INTO public.visa_applications (student_id, doc_status, eligibility_status, eligibility_remarks, verification_date, verified_by, submission_date, visa_reference, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Compiling Visa Documents', 'Eligible to Proceed with Visa', 'Bank statement and CAS verified.', '2026-09-10', '11111111-1111-4111-8111-111111111102', NULL, NULL, 'Biometrics slot scheduled.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222202', 'Documents Pending', 'Under Review', 'Pending sponsor notarized affidavit.', NULL, NULL, NULL, NULL, 'Counselor following up.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222203', 'Documents Ready', 'Eligible to Proceed with Visa', 'All financial & GTE checks cleared.', '2026-10-01', '11111111-1111-4111-8111-111111111102', NULL, NULL, 'Ready for ImmiAccount submission.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222204', 'Completed', 'Eligible to Proceed with Visa', 'F-1 Visa stamped and verified.', '2026-10-05', '11111111-1111-4111-8111-111111111101', '2026-10-08', 'US-F1-90812', 'Visa approved.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222205', 'Not Started', 'Not Evaluated', NULL, NULL, NULL, NULL, NULL, 'Starts after admission offer.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222206', 'Not Started', 'On Hold', 'Waiting on final academic transcript.', NULL, NULL, NULL, NULL, 'On hold until condition cleared.', '11111111-1111-4111-8111-111111111104')
ON CONFLICT (student_id) DO NOTHING;

-- Flights
INSERT INTO public.flights (student_id, flight_status, airline, flight_number, departure_date, departure_airport, arrival_airport, booking_reference, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Searching for Flights', 'British Airways', NULL, NULL, 'BOM', 'MAN', NULL, 'Comparing direct and one-stop fares.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222202', 'Not Booked', NULL, NULL, NULL, 'MEX', 'YYZ', NULL, 'Pending visa submission.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222203', 'Flight Ticket Booked', 'Qatar Airways', 'QR018', '2027-01-18T10:30:00Z', 'DUB', 'MEL', 'QR-MEL-7741', 'Student baggage allowance included.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222204', 'Flight Ticket Booked', 'Emirates', 'EK237', '2026-12-01T08:15:00Z', 'DXB', 'BOS', 'EK-BOS-9910', 'Confirmed business class ticket.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222205', 'Not Booked', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222206', 'Not Booked', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '11111111-1111-4111-8111-111111111104');

-- Accommodations
INSERT INTO public.accommodations (student_id, requirement_status, payment_status, provider, property_name, address, check_in_date, check_out_date, payment_amount, currency, booking_confirmation, remarks, updated_by)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'Hostel Reserved', 'Pre-paid', 'University Residences', 'Oak House Residence', 'Fallowfield Campus, Manchester M14 6HD', '2026-09-15', '2027-06-30', 1200.00, 'USD', 'UOM-ACC-441', 'En-suite single room reserved.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222202', 'Off-campus Accommodation', 'Paid Upon Arrival', 'CampusLiving', NULL, 'Downtown Toronto', NULL, NULL, 0.00, 'USD', NULL, 'Shortlisting studio apartments near St. George campus.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222203', 'Off-campus Accommodation Reserved', 'Pre-paid', 'UniLodge', 'UniLodge Lincoln House', 'Carlton VIC 3053, Melbourne', '2027-01-20', '2027-12-20', 1800.00, 'USD', 'UL-MEL-8812', 'Deposit paid; lease signed.', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222204', 'Accommodation Not Required', 'Paid Upon Arrival', NULL, NULL, 'Family residence in Brookline, MA', NULL, NULL, 0.00, 'USD', 'SELF-ARRANGED', 'Student staying with family.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222205', 'Hostel Required', 'Paid Upon Arrival', NULL, NULL, NULL, NULL, NULL, 0.00, 'USD', NULL, 'Will apply for Studentenwerk dorm.', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222206', 'Hostel Required', 'Paid Upon Arrival', NULL, NULL, NULL, NULL, NULL, 0.00, 'USD', NULL, NULL, '11111111-1111-4111-8111-111111111104');

-- Staff Assignment Audit
INSERT INTO public.staff_assignments (student_id, counselor_id, assigned_by, is_active, notes)
VALUES
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111102', TRUE, 'UK counselor assigned'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111102', TRUE, 'Canada counselor assigned'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111102', TRUE, 'Australia counselor assigned'),
  ('22222222-2222-4222-8222-222222222204', '11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111102', TRUE, 'US counselor assigned'),
  ('22222222-2222-4222-8222-222222222205', '11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111102', TRUE, 'Europe counselor assigned'),
  ('22222222-2222-4222-8222-222222222206', '11111111-1111-4111-8111-111111111104', '11111111-1111-4111-8111-111111111102', TRUE, 'UK counselor assigned');

-- Sample Activity Logs
INSERT INTO public.activity_logs (actor_id, student_id, entity_type, action, description)
VALUES
  ('11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222201', 'admission', 'admission_status_updated', 'Admission status for Aarav Patel updated to "Admission Confirmed"'),
  ('11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222201', 'payment', 'payment_recorded', 'Fee payment of USD 4500.00 (Paid) recorded for Aarav Patel'),
  ('11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222204', 'flight', 'flight_booked', 'Flight EK237 booked for Zainab Al-Mansoor'),
  ('11111111-1111-4111-8111-111111111104', '22222222-2222-4222-8222-222222222203', 'accommodation', 'accommodation_reserved', 'Off-campus Accommodation Reserved at UniLodge Lincoln House for Liam O''Connor'),
  ('11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222203', 'visa', 'visa_eligibility_approved', 'Liam O''Connor marked Eligible to Proceed with Visa');

-- Sample Notifications
INSERT INTO public.notifications (recipient_id, student_id, event_type, title, message, is_read)
VALUES
  ('11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222204', 'flight_booked', 'Flight Ticket Booked', 'Emirates EK237 confirmed for Zainab Al-Mansoor.', FALSE),
  ('11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222201', 'payment_received', 'Fee Payment Received', 'Full fee payment USD 4500.00 confirmed for Aarav Patel.', FALSE),
  ('11111111-1111-4111-8111-111111111104', '22222222-2222-4222-8222-222222222203', 'visa_eligibility_approved', 'Visa Eligibility Approved', 'Liam O''Connor is Eligible to Proceed with Visa.', FALSE);

