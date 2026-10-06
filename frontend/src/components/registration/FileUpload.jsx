import { FaFileArrowUp, FaXmark } from 'react-icons/fa6'
import { receiptRules } from '../../data/registrationData'

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

// The chosen File object is only kept in React state by the parent.
// TODO: Connect receipt upload to backend/storage later
function FileUpload({ id, label, file, error, onChange }) {
  return (
    <div>
      <p className="mb-2 font-semibold text-ink">
        {label}
        <span className="text-brand" aria-hidden="true">
          {' '}
          *
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          className="btn btn-outline cursor-pointer !rounded-lg !px-4 !py-2 !text-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
        >
          <FaFileArrowUp aria-hidden="true" />
          Choose File
          <input
            id={id}
            type="file"
            accept={receiptRules.accept}
            aria-label={label}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-error ${id}-hint`}
            className="sr-only"
            onChange={(event) => {
              onChange(event.target.files[0] ?? null)
              // Allow choosing the same file again after removing it
              event.target.value = ''
            }}
          />
        </label>

        {file ? (
          <span className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-gray-500">({formatSize(file.size)})</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remove selected file"
              className="shrink-0 cursor-pointer rounded-full p-1 text-gray-500 transition hover:bg-gray-100 hover:text-brand"
            >
              <FaXmark aria-hidden="true" />
            </button>
          </span>
        ) : (
          <span className="text-sm text-gray-500">No file chosen</span>
        )}
      </div>

      <p id={`${id}-hint`} className="mt-2 text-sm text-gray-500">
        PDF, JPG, JPEG or PNG. Maximum file size 2 MB.
      </p>
      <p id={`${id}-error`} role="alert" className="mt-1 min-h-5 text-sm text-brand">
        {error}
      </p>
    </div>
  )
}

export default FileUpload
