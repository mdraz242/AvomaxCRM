import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only';

const { default: app } = await import('../src/app.js');
const { setSupabaseClientForTesting } = await import('../src/config/supabase.js');
const { generateCsvBuffer, generateExcelBuffer } = await import('../src/services/exportService.js');

const USERS = {
  '11111111-1111-4111-8111-111111111101': {
    id: '11111111-1111-4111-8111-111111111101',
    full_name: 'Super Admin',
    email: 'superadmin@educrm.io',
    role: 'super_admin',
    is_active: true
  },
  '11111111-1111-4111-8111-111111111102': {
    id: '11111111-1111-4111-8111-111111111102',
    full_name: 'Admin User',
    email: 'admin@educrm.io',
    role: 'admin',
    is_active: true
  },
  '11111111-1111-4111-8111-111111111103': {
    id: '11111111-1111-4111-8111-111111111103',
    full_name: 'Counselor One',
    email: 'counselor1@educrm.io',
    role: 'counselor',
    is_active: true
  },
  '11111111-1111-4111-8111-111111111105': {
    id: '11111111-1111-4111-8111-111111111105',
    full_name: 'Viewer User',
    email: 'viewer@educrm.io',
    role: 'viewer',
    is_active: true
  }
};

const STUDENTS = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    student_code: 'STU-2026-0001',
    full_name: 'Assigned Student',
    email: 'assigned@example.com',
    phone: '+1-555-1000',
    passport_number: 'P123456',
    nationality: 'Indian',
    date_of_birth: '2003-01-01',
    gender: 'Male',
    passport_expiry_date: '2030-01-01',
    destination_country: 'United Kingdom',
    university_name: 'Oxford',
    course_name: 'MSc CS',
    intake: 'Fall 2026',
    academic_year: '2026-2027',
    assigned_counselor_id: '11111111-1111-4111-8111-111111111103',
    deleted_at: null,
    admission: [{ id: 'adm-1', status: 'Admission Confirmed' }],
    fee_payments: [{ id: 'pay-1', payment_status: 'Paid', total_fee: 1000, amount_paid: 1000 }],
    visa: [{ id: 'vis-1', doc_status: 'Completed', eligibility_status: 'Eligible to Proceed with Visa' }],
    flights: [{ id: 'flt-1', flight_status: 'Not Booked' }],
    accommodations: [{ id: 'acc-1', requirement_status: 'Hostel Required', payment_status: 'Paid Upon Arrival' }]
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    student_code: 'STU-2026-0002',
    full_name: 'Other Counselor Student',
    email: 'other@example.com',
    phone: '+1-555-2000',
    passport_number: 'P999999',
    nationality: 'Mexican',
    date_of_birth: '2003-01-01',
    gender: 'Female',
    passport_expiry_date: '2030-01-01',
    destination_country: 'Canada',
    university_name: 'Toronto',
    course_name: 'MEng',
    intake: 'Fall 2026',
    academic_year: '2026-2027',
    assigned_counselor_id: '11111111-1111-4111-8111-111111111104',
    deleted_at: null,
    admission: [{ id: 'adm-2', status: 'Application Pending' }],
    fee_payments: [],
    visa: [],
    flights: [],
    accommodations: []
  }
];

function createMockSupabase() {
  return {
    from(table) {
      const state = { filters: {}, isNull: null };
      const chain = {
        select() { return chain; },
        insert() { return chain; },
        update() { return chain; },
        delete() { return chain; },
        eq(col, val) { state.filters[col] = val; return chain; },
        ilike() { return chain; },
        in() { return chain; },
        is(col, val) { state.isNull = { col, val }; return chain; },
        or() { return chain; },
        order() { return chain; },
        range() { return chain; },
        limit() { return chain; },
        single() {
          if (table === 'profiles') {
            const profile = USERS[state.filters.id];
            return Promise.resolve(profile ? { data: profile, error: null } : { data: null, error: { code: 'PGRST116' } });
          }
          if (table === 'students') {
            const student = STUDENTS.find((s) => s.id === state.filters.id);
            return Promise.resolve(student ? { data: student, error: null } : { data: null, error: { code: 'PGRST116' } });
          }
          return Promise.resolve({ data: null, error: null });
        },
        then(resolve) {
          if (table === 'students') {
            let rows = [...STUDENTS];
            if (state.filters.assigned_counselor_id) {
              rows = rows.filter((s) => s.assigned_counselor_id === state.filters.assigned_counselor_id);
            }
            return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve);
          }
          if (table === 'student_documents' || table === 'activity_logs') {
            return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
          }
          return Promise.resolve({ data: [], error: null }).then(resolve);
        }
      };
      return chain;
    }
  };
}

function makeToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function invokeApp(expressApp, path, { method = 'GET', token, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = new PassThrough();
    const rawBody = body ? JSON.stringify(body) : null;

    req.method = method;
    req.url = path;
    req.originalUrl = path;
    req.headers = {
      host: 'localhost',
      'x-forwarded-for': '127.0.0.1'
    };
    if (token) req.headers.authorization = `Bearer ${token}`;
    if (rawBody) {
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = String(Buffer.byteLength(rawBody));
    }
    const socket = new PassThrough();
    socket.remoteAddress = '127.0.0.1';
    req.socket = socket;
    req.connection = req.socket;

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.locals = {};
    const chunks = [];

    res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
    res.getHeader = (name) => res.headers[name.toLowerCase()];
    res.removeHeader = (name) => { delete res.headers[name.toLowerCase()]; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.writeHead = (code, hdrs = {}) => {
      res.statusCode = code;
      for (const [k, v] of Object.entries(hdrs)) res.setHeader(k, v);
      return res;
    };
    res.write = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    };
    res.end = (chunk) => {
      if (chunk) res.write(chunk);
      const raw = Buffer.concat(chunks).toString('utf-8');
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { parsed = raw; }
      resolve({ status: res.statusCode, body: parsed });
    };

    if (rawBody) {
      req.end(rawBody);
    } else {
      req.end();
    }

    expressApp.handle(req, res, (err) => {
      if (err) return reject(err);
      resolve({ status: res.statusCode || 404, body: null });
    });
  });
}

test('RBAC, validation, and health endpoints work as expected', async () => {
  setSupabaseClientForTesting(createMockSupabase());

  // 1. Health check
  const health = await invokeApp(app, '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.success, true);

  // 2. Unauthenticated blocked
  const unauth = await invokeApp(app, '/api/students');
  assert.equal(unauth.status, 401);

  // 3. Viewer cannot create student
  const viewerToken = makeToken('11111111-1111-4111-8111-111111111105');
  const viewerCreate = await invokeApp(app, '/api/students', {
    method: 'POST',
    token: viewerToken,
    body: { full_name: 'Test' }
  });
  assert.equal(viewerCreate.status, 403);

  // 4. Admin cannot create staff (super_admin only)
  const adminToken = makeToken('11111111-1111-4111-8111-111111111102');
  const adminStaff = await invokeApp(app, '/api/staff', {
    method: 'POST',
    token: adminToken,
    body: { full_name: 'New Staff', email: 'x@y.com', password: 'Password1', role: 'viewer' }
  });
  assert.equal(adminStaff.status, 403);

  // 5. Counselor only receives assigned students in list & gets 403 on unassigned student
  const counselorToken = makeToken('11111111-1111-4111-8111-111111111103');
  const counselorList = await invokeApp(app, '/api/students', { token: counselorToken });
  assert.equal(counselorList.status, 200);
  assert.equal(counselorList.body.data.length, 1);
  assert.equal(counselorList.body.data[0].id, '22222222-2222-4222-8222-222222222201');

  const unassignedRead = await invokeApp(app, '/api/students/22222222-2222-4222-8222-222222222202', {
    token: counselorToken
  });
  assert.equal(unassignedRead.status, 403);

  // 6. Super Admin passes RBAC and hits Zod validation on invalid student payload
  const superAdminToken = makeToken('11111111-1111-4111-8111-111111111101');
  const invalidStudent = await invokeApp(app, '/api/students', {
    method: 'POST',
    token: superAdminToken,
    body: { full_name: 'A' }
  });
  assert.equal(invalidStudent.status, 400);
  assert.equal(invalidStudent.body.message, 'Validation failed');
});

test('CSV and Excel export helpers generate valid buffers', async () => {
  const columns = ['Student ID', 'Full Name', 'Status'];
  const rows = [{ 'Student ID': 'STU-2026-0001', 'Full Name': 'Aarav, Patel', Status: 'Admission Confirmed' }];

  const csvBuf = generateCsvBuffer(columns, rows);
  assert.match(csvBuf.toString('utf-8'), /"Aarav, Patel"/);

  const xlsxBuf = await generateExcelBuffer('Students', columns, rows);
  assert.ok(xlsxBuf.length > 1000);
});
