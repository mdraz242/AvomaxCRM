import { ROLES } from '../config/constants.js';
import { findStudents } from '../repositories/studentRepository.js';
import { generateCsvBuffer, generateExcelBuffer } from '../services/exportService.js';
import { buildStudentsExportRows } from '../services/reportService.js';
import {
  createStudentService,
  deleteStudentService,
  getStudentDetailService,
  listStudentsService,
  updateStudentService
} from '../services/studentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listStudents = asyncHandler(async (req, res) => {
  const result = await listStudentsService(req.query, req.user);
  res.json({
    success: true,
    data: result.students,
    pagination: result.pagination
  });
});

export const getStudentById = asyncHandler(async (req, res) => {
  const student = await getStudentDetailService(req.params.id, req.user);
  res.json({
    success: true,
    data: student
  });
});

export const createStudent = asyncHandler(async (req, res) => {
  const student = await createStudentService(req.body, req.user, req.ip);
  res.status(201).json({
    success: true,
    data: student
  });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await updateStudentService(req.params.id, req.body, req.user, req.ip);
  res.json({
    success: true,
    data: student
  });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const result = await deleteStudentService(req.params.id, req.user, req.ip);
  res.json({
    success: true,
    message: 'Student archived successfully',
    data: result
  });
});

export const exportStudents = asyncHandler(async (req, res) => {
  const format = String(req.query.format || 'csv').toLowerCase();
  const counselorScopeId = req.user.role === ROLES.COUNSELOR ? req.user.id : null;
  const { records } = await findStudents({ ...req.query, counselorScopeId, fetchAll: true });
  const rows = buildStudentsExportRows(records);
  const columns = rows[0] ? Object.keys(rows[0]) : ['Student ID', 'Full Name', 'Email'];

  if (format === 'xlsx' || format === 'excel') {
    const buffer = await generateExcelBuffer('Students', columns, rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="students_export.xlsx"');
    return res.send(buffer);
  }

  const csvBuffer = generateCsvBuffer(columns, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
  return res.send(csvBuffer);
});

