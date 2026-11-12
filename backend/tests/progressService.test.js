import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStudentProgress } from '../src/services/progressService.js';

test('calculateStudentProgress returns 0% when all stages are not started or in-progress', () => {
  const result = calculateStudentProgress({
    student: { counselor: { full_name: 'Priya Sharma' } },
    admission: { status: 'Conditional Offer Received' }, // in_progress
    payment: { payment_status: 'Partially Paid' }, // in_progress
    visa: {
      doc_status: 'Compiling Visa Documents', // in_progress
      eligibility_status: 'Under Review' // in_progress
    },
    flight: { flight_status: 'Searching for Flights' }, // in_progress
    accommodation: { requirement_status: 'Hostel Required' } // in_progress
  });

  assert.equal(result.completedCount, 0);
  assert.equal(result.overallPercentage, 0);
  assert.equal(result.completedStages.length, 0);
  assert.equal(result.pendingStages.length, 6);
});

test('calculateStudentProgress returns 50% when exactly 3 stages are completed and 3 are in-progress', () => {
  const result = calculateStudentProgress({
    student: { counselor: { full_name: 'Priya Sharma' } },
    admission: { status: 'Admission Confirmed' }, // completed
    payment: { payment_status: 'Paid' }, // completed
    visa: {
      doc_status: 'Documents Ready', // in_progress (NOT Completed)
      eligibility_status: 'Eligible to Proceed with Visa' // completed
    },
    flight: { flight_status: 'Searching for Flights' }, // in_progress
    accommodation: { requirement_status: 'Off-campus Accommodation' } // in_progress
  });

  assert.equal(result.completedCount, 3);
  assert.equal(result.overallPercentage, 50);
  assert.deepEqual(result.completedStages, [
    'Admission Application',
    'Admission Fee Payment',
    'Visa Eligibility'
  ]);
});

test('calculateStudentProgress returns 100% when all 6 stages are completed (including Waived & Accommodation Not Required)', () => {
  const result = calculateStudentProgress({
    student: { counselor: { full_name: 'David Miller' } },
    admission: { status: 'Admission Confirmed' },
    payment: { payment_status: 'Waived' },
    visa: {
      doc_status: 'Completed',
      eligibility_status: 'Eligible to Proceed with Visa'
    },
    flight: { flight_status: 'Flight Ticket Booked' },
    accommodation: { requirement_status: 'Accommodation Not Required' }
  });

  assert.equal(result.completedCount, 6);
  assert.equal(result.overallPercentage, 100);
  assert.equal(result.pendingStages.length, 0);
});

