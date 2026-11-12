import { generateCsvBuffer, generateExcelBuffer } from '../services/exportService.js';
import { generateReportService } from '../services/reportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getReport = asyncHandler(async (req, res) => {
  const report = await generateReportService(req.params.type, req.query, req.user);
  res.json({
    success: true,
    data: report
  });
});

export const exportReport = asyncHandler(async (req, res) => {
  const format = String(req.query.format || 'csv').toLowerCase();
  const report = await generateReportService(req.params.type, req.query, req.user);
  const safeName = req.params.type.replace(/[^a-z0-9-]/gi, '_');

  if (format === 'xlsx' || format === 'excel') {
    const buffer = await generateExcelBuffer(report.title, report.columns, report.rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_report.xlsx"`);
    return res.send(buffer);
  }

  const csvBuffer = generateCsvBuffer(report.columns, report.rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_report.csv"`);
  return res.send(csvBuffer);
});

