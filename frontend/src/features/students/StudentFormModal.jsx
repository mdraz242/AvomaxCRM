import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal.jsx';
import { GENDERS } from '../../utils/constants.js';

export default function StudentFormModal({ open, onClose, onSubmit, student = null, counselors = [], saving = false }) {
  const isEditing = Boolean(student);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  useEffect(() => {
    if (open) {
      reset(
        student
          ? {
              full_name: student.full_name || '',
              email: student.email || '',
              phone: student.phone || '',
              whatsapp_number: student.whatsapp_number || '',
              passport_number: student.passport_number || '',
              nationality: student.nationality || '',
              date_of_birth: student.date_of_birth || '',
              gender: student.gender || 'Prefer not to say',
              passport_expiry_date: student.passport_expiry_date || '',
              destination_country: student.destination_country || '',
              university_name: student.university_name || '',
              course_name: student.course_name || '',
              intake: student.intake || '',
              academic_year: student.academic_year || '2026-2027',
              assigned_counselor_id: student.assigned_counselor_id || '',
              application_date: student.application_date || new Date().toISOString().slice(0, 10),
              internal_remarks: student.internal_remarks || ''
            }
          : {
              full_name: '',
              email: '',
              phone: '',
              whatsapp_number: '',
              passport_number: '',
              nationality: '',
              date_of_birth: '',
              gender: 'Prefer not to say',
              passport_expiry_date: '',
              destination_country: '',
              university_name: '',
              course_name: '',
              intake: 'Fall 2026',
              academic_year: '2026-2027',
              assigned_counselor_id: '',
              application_date: new Date().toISOString().slice(0, 10),
              internal_remarks: ''
            }
      );
    }
  }, [open, student, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit Student — ${student.student_code}` : 'Register New Student'}
      subtitle="Enter student passport, academic destination, and counselor assignment details."
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Full Name *</label>
            <input className="input-field" {...register('full_name', { required: 'Required' })} />
            {errors.full_name && <p className="text-xs text-rose-600 mt-1">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="label-text">Email Address *</label>
            <input type="email" className="input-field" {...register('email', { required: 'Required' })} />
            {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label-text">Phone Number *</label>
            <input className="input-field" {...register('phone', { required: 'Required' })} />
            {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label-text">WhatsApp Number</label>
            <input className="input-field" {...register('whatsapp_number')} />
          </div>

          <div>
            <label className="label-text">Passport Number *</label>
            <input className="input-field" {...register('passport_number', { required: 'Required' })} />
            {errors.passport_number && <p className="text-xs text-rose-600 mt-1">{errors.passport_number.message}</p>}
          </div>
          <div>
            <label className="label-text">Passport Expiry Date *</label>
            <input type="date" className="input-field" {...register('passport_expiry_date', { required: 'Required' })} />
            {errors.passport_expiry_date && (
              <p className="text-xs text-rose-600 mt-1">{errors.passport_expiry_date.message}</p>
            )}
          </div>

          <div>
            <label className="label-text">Nationality *</label>
            <input className="input-field" {...register('nationality', { required: 'Required' })} />
            {errors.nationality && <p className="text-xs text-rose-600 mt-1">{errors.nationality.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Date of Birth *</label>
              <input type="date" className="input-field" {...register('date_of_birth', { required: 'Required' })} />
            </div>
            <div>
              <label className="label-text">Gender *</label>
              <select className="input-field" {...register('gender')}>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label-text">Destination Country *</label>
            <input className="input-field" {...register('destination_country', { required: 'Required' })} />
            {errors.destination_country && (
              <p className="text-xs text-rose-600 mt-1">{errors.destination_country.message}</p>
            )}
          </div>
          <div>
            <label className="label-text">University Name *</label>
            <input className="input-field" {...register('university_name', { required: 'Required' })} />
            {errors.university_name && <p className="text-xs text-rose-600 mt-1">{errors.university_name.message}</p>}
          </div>

          <div>
            <label className="label-text">Course Name *</label>
            <input className="input-field" {...register('course_name', { required: 'Required' })} />
            {errors.course_name && <p className="text-xs text-rose-600 mt-1">{errors.course_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Intake *</label>
              <input className="input-field" placeholder="Fall 2026" {...register('intake', { required: 'Required' })} />
            </div>
            <div>
              <label className="label-text">Academic Year *</label>
              <input
                className="input-field"
                placeholder="2026-2027"
                {...register('academic_year', { required: 'Required' })}
              />
            </div>
          </div>

          <div>
            <label className="label-text">Assigned Counselor</label>
            <select className="input-field" {...register('assigned_counselor_id')}>
              <option value="">Unassigned</option>
              {counselors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Application Date *</label>
            <input type="date" className="input-field" {...register('application_date', { required: 'Required' })} />
          </div>
        </div>

        <div>
          <label className="label-text">Internal Remarks</label>
          <textarea rows={2} className="input-field" {...register('internal_remarks')} />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : isEditing ? 'Update Student' : 'Create Student'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

