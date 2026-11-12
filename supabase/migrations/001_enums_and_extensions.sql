-- ============================================================================
-- Migration 001: Extensions and PostgreSQL ENUM Types
-- Admission & Visa Tracking Management System
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Staff Roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'counselor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Gender
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other', 'Prefer not to say');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A. Admission Status
DO $$ BEGIN
  CREATE TYPE admission_status_enum AS ENUM (
    'Application Pending',
    'Documents Required',
    'Under Review',
    'Conditional Offer Received',
    'Unconditional Offer Received',
    'Admission Confirmed',
    'Rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- B. Admission Fee Status
DO $$ BEGIN
  CREATE TYPE fee_status_enum AS ENUM (
    'Pending',
    'Partially Paid',
    'Paid',
    'Waived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- C. Visa Documentation Status
DO $$ BEGIN
  CREATE TYPE visa_doc_status_enum AS ENUM (
    'Not Started',
    'Documents Pending',
    'Compiling Visa Documents',
    'Documents Ready',
    'Submitted',
    'Additional Documents Required',
    'Completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- D. Visa Eligibility Status
DO $$ BEGIN
  CREATE TYPE visa_eligibility_status_enum AS ENUM (
    'Not Evaluated',
    'Eligible to Proceed with Visa',
    'Not Eligible',
    'On Hold',
    'Under Review'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- E. Flight Ticket Status
DO $$ BEGIN
  CREATE TYPE flight_status_enum AS ENUM (
    'Not Booked',
    'Searching for Flights',
    'Flight Ticket Booked',
    'Rescheduled',
    'Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- F1. Accommodation Payment Status
DO $$ BEGIN
  CREATE TYPE accommodation_payment_status_enum AS ENUM (
    'Paid Upon Arrival',
    'Pre-paid'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- F2. Accommodation Requirement Status
DO $$ BEGIN
  CREATE TYPE accommodation_requirement_enum AS ENUM (
    'Hostel Required',
    'Off-campus Accommodation',
    'Hostel Reserved',
    'Off-campus Accommodation Reserved',
    'Accommodation Not Required'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Document Categories
DO $$ BEGIN
  CREATE TYPE document_category_enum AS ENUM (
    'Passport',
    'Academic Certificates',
    'Transcripts',
    'Admission Letter',
    'Fee Receipt',
    'Bank Statement',
    'Financial Documents',
    'Visa Application Documents',
    'Flight Ticket',
    'Accommodation Confirmation',
    'Other Documents'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Document Verification Status
DO $$ BEGIN
  CREATE TYPE document_verification_status_enum AS ENUM (
    'Pending',
    'Verified',
    'Rejected',
    'Needs Revision'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

