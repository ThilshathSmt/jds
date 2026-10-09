import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaBoxOpen,
  FaClipboardCheck,
  FaClipboardList,
  FaDownload,
  FaEye,
  FaFileLines,
  FaMoneyBillWave,
  FaUser,
} from 'react-icons/fa6'
import ApplicationActions from '../../components/admin/ApplicationActions'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import StatusBadge from '../../components/dashboard/StatusBadge'
import { formatPrice, paymentMethods } from '../../data/registrationData'
import { getApplication, getDocumentUrl } from '../../services/applicationApi'

const LIST_PATH = '/admin-dashboard/registration-forms'

const DOCUMENT_LABELS = { payment_receipt: 'Payment Receipt / Deposit Slip' }

const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const getPaymentMethodLabel = (id) => paymentMethods.find((method) => method.id === id)?.label ?? id

// Label / value rows inside a section
function DetailList({ rows }) {
  return (
    <dl className="divide-y divide-gray-100">
      {rows.map(({ label, value }) => (
        <div key={label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-sm font-medium text-gray-500">{label}</dt>
          <dd className="font-medium break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const documentLinkClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand'

function RegistrationFormDetails() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getApplication(applicationId)
      .then((loaded) => active && setApplication(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [applicationId])

  // A deleted application has no page any more: go back to the list
  const handleChanged = (updated) => (updated ? setApplication(updated) : navigate(LIST_PATH))

  const backLink = (
    <Link
      to={LIST_PATH}
      className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-brand"
    >
      <FaArrowLeft aria-hidden="true" />
      Back to Registration Forms
    </Link>
  )

  if (!application) {
    return (
      <>
        {backLink}
        <p
          role={error ? 'alert' : 'status'}
          className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm"
        >
          {error || 'Loading application...'}
        </p>
      </>
    )
  }

  return (
    <>
      {backLink}
      <DashboardWelcome
        title={`Application #${application.id}`}
        message={application.fullName}
        icon={FaClipboardList}
      />

      <DashboardSection
        title="Application Status"
        icon={FaClipboardCheck}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <ApplicationActions application={application} onChanged={handleChanged} />
          </div>
        }
      >
        <DetailList
          rows={[
            { label: 'Status', value: <StatusBadge status={application.status} /> },
            { label: 'Submitted', value: formatDateTime(application.createdAt) },
            ...(application.status === 'APPROVED'
              ? [
                  { label: 'Driving School ID', value: application.drivingSchoolId },
                  { label: 'Approved', value: formatDateTime(application.approvedAt) },
                  {
                    label: 'Student Account',
                    value: application.accountRegistered
                      ? 'Registered with this ID'
                      : 'Not registered yet',
                  },
                ]
              : []),
          ]}
        />
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection title="Applicant Details" icon={FaUser}>
          <DetailList
            rows={[
              { label: 'Full Name', value: application.fullName },
              { label: 'Mobile Number', value: application.mobileNumber },
              { label: 'Email', value: application.email ?? 'Not provided' },
              { label: 'NIC', value: application.nic },
              { label: 'Address', value: application.address },
            ]}
          />
        </DashboardSection>

        <div className="flex flex-col gap-6">
          <DashboardSection title="Package Details" icon={FaBoxOpen}>
            <DetailList
              rows={[
                { label: 'Selected Package', value: application.packageName },
                { label: 'Package Price', value: formatPrice(application.packagePrice) },
              ]}
            />
          </DashboardSection>

          <DashboardSection title="Payment Details" icon={FaMoneyBillWave}>
            <DetailList
              rows={[
                { label: 'Payment Method', value: getPaymentMethodLabel(application.paymentMethod) },
                {
                  label: 'Minimum Registration Payment',
                  value: formatPrice(application.minimumPayment),
                },
              ]}
            />
          </DashboardSection>
        </div>
      </div>

      <DashboardSection title="Documents" icon={FaFileLines}>
        {application.documents.length === 0 ? (
          <p className="text-gray-600">No documents were uploaded.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {application.documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {DOCUMENT_LABELS[document.type] ?? document.type}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {document.originalName} ({formatSize(document.sizeBytes)})
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={getDocumentUrl(application.id, document.id)}
                    target="_blank"
                    rel="noreferrer"
                    className={documentLinkClass}
                  >
                    <FaEye aria-hidden="true" />
                    View
                  </a>
                  <a
                    href={getDocumentUrl(application.id, document.id, { download: true })}
                    className={documentLinkClass}
                  >
                    <FaDownload aria-hidden="true" />
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
    </>
  )
}

export default RegistrationFormDetails
