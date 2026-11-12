import {
  addVisaDocumentService,
  createAccommodationService,
  createFlightService,
  createPaymentService,
  deleteVisaDocumentService,
  listAccommodationsService,
  listAdmissionsService,
  listFlightsService,
  listPaymentsService,
  listVisaDocumentsService,
  listVisaService,
  updateAccommodationService,
  updateAdmissionStatusService,
  updateFlightService,
  updatePaymentService,
  updateVisaDocumentService,
  updateVisaStatusService
} from '../services/trackingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAdmissions = asyncHandler(async (req, res) => {
  const data = await listAdmissionsService(req.query, req.user);
  res.json({ success: true, data });
});

export const updateAdmissionStatus = asyncHandler(async (req, res) => {
  const data = await updateAdmissionStatusService(req.params.id, req.body, req.user, req.ip);
  res.json({ success: true, data });
});

export const listPayments = asyncHandler(async (req, res) => {
  const data = await listPaymentsService(req.query, req.user);
  res.json({ success: true, data });
});

export const createPayment = asyncHandler(async (req, res) => {
  const data = await createPaymentService(req.body, req.user, req.ip);
  res.status(201).json({ success: true, data });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const data = await updatePaymentService(req.params.id, req.body, req.user, req.ip);
  res.json({ success: true, data });
});

export const listVisa = asyncHandler(async (req, res) => {
  const data = await listVisaService(req.query, req.user);
  res.json({ success: true, data });
});

export const updateVisaStatus = asyncHandler(async (req, res) => {
  const data = await updateVisaStatusService(req.params.id, req.body, req.user, req.ip);
  res.json({ success: true, data });
});

export const listVisaDocuments = asyncHandler(async (req, res) => {
  const data = await listVisaDocumentsService(req.params.id, req.user);
  res.json({ success: true, data });
});

export const addVisaDocument = asyncHandler(async (req, res) => {
  const data = await addVisaDocumentService(req.params.id, req.body, req.user, req.ip);
  res.status(201).json({ success: true, data });
});

export const updateVisaDocument = asyncHandler(async (req, res) => {
  const data = await updateVisaDocumentService(req.params.id, req.params.docId, req.body, req.user);
  res.json({ success: true, data });
});

export const deleteVisaDocument = asyncHandler(async (req, res) => {
  await deleteVisaDocumentService(req.params.id, req.params.docId, req.user);
  res.json({ success: true, message: 'Visa checklist item deleted' });
});

export const listFlights = asyncHandler(async (req, res) => {
  const data = await listFlightsService(req.query, req.user);
  res.json({ success: true, data });
});

export const createFlight = asyncHandler(async (req, res) => {
  const data = await createFlightService(req.body, req.user, req.ip);
  res.status(201).json({ success: true, data });
});

export const updateFlight = asyncHandler(async (req, res) => {
  const data = await updateFlightService(req.params.id, req.body, req.user, req.ip);
  res.json({ success: true, data });
});

export const listAccommodations = asyncHandler(async (req, res) => {
  const data = await listAccommodationsService(req.query, req.user);
  res.json({ success: true, data });
});

export const createAccommodation = asyncHandler(async (req, res) => {
  const data = await createAccommodationService(req.body, req.user, req.ip);
  res.status(201).json({ success: true, data });
});

export const updateAccommodation = asyncHandler(async (req, res) => {
  const data = await updateAccommodationService(req.params.id, req.body, req.user, req.ip);
  res.json({ success: true, data });
});

