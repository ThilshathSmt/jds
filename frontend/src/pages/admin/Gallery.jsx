import { useCallback, useEffect, useRef, useState } from 'react'
import { FaCloudArrowUp, FaImages, FaPlus, FaTrashCan, FaXmark } from 'react-icons/fa6'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import DashboardSection from '../../components/dashboard/DashboardSection'
import DashboardWelcome from '../../components/dashboard/DashboardWelcome'
import Toast from '../../components/dashboard/Toast'
import {
  deleteGalleryImage,
  galleryImageSrc,
  listAdminGalleryImages,
  uploadGalleryImages,
} from '../../services/galleryApi'
import { formatDateTime } from '../../utils/formatUtils'
import {
  GALLERY_IMAGE_ACCEPT,
  GALLERY_MAX_FILES_PER_UPLOAD,
  getGalleryFileError,
} from '../../utils/galleryValidation'

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

// A chosen file with its preview (an object URL, released when it is removed)
const toChosen = (file) => ({ key: `${file.name}-${file.size}-${file.lastModified}`, file, preview: URL.createObjectURL(file), error: getGalleryFileError(file) })

// Choose images, see them, upload them. `onUploaded(images, message)` gets the saved ones.
function UploadForm({ onUploaded, onToast }) {
  const inputRef = useRef(null)
  const [chosen, setChosen] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const chosenRef = useRef(chosen)
  chosenRef.current = chosen

  // Previews still shown when the page is left are released too
  useEffect(() => () => chosenRef.current.forEach(({ preview }) => URL.revokeObjectURL(preview)), [])

  const add = (event) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    setError('')
    setChosen((current) => {
      const known = new Set(current.map(({ key }) => key))
      const added = files.map(toChosen).filter(({ key, preview }) => {
        if (!known.has(key)) return true
        URL.revokeObjectURL(preview)
        return false
      })
      return [...current, ...added]
    })
  }

  const removeChosen = (key) =>
    setChosen((current) =>
      current.filter((item) => {
        if (item.key === key) URL.revokeObjectURL(item.preview)
        return item.key !== key
      }),
    )

  const invalid = chosen.filter((item) => item.error)
  const tooMany = chosen.length > GALLERY_MAX_FILES_PER_UPLOAD

  const upload = async () => {
    if (chosen.length === 0) {
      setError('Choose at least one image.')
      return
    }
    if (invalid.length > 0 || tooMany) return
    setBusy(true)
    setError('')
    try {
      const { images, message } = await uploadGalleryImages(chosen.map(({ file }) => file))
      chosen.forEach(({ preview }) => URL.revokeObjectURL(preview))
      setChosen([])
      onUploaded(images)
      onToast({ variant: 'success', message })
    } catch (uploadError) {
      setError(uploadError.fieldErrors?.images ?? uploadError.message)
      onToast({ variant: 'error', message: uploadError.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardSection title="Upload Images" icon={FaCloudArrowUp}>
      <input
        ref={inputRef}
        id="gallery-images"
        type="file"
        accept={GALLERY_IMAGE_ACCEPT}
        multiple
        onChange={add}
        disabled={busy}
        aria-describedby="gallery-images-help gallery-images-error"
        className="sr-only"
      />
      <label
        htmlFor="gallery-images"
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/40 bg-brand-soft/40 px-4 py-8 text-center transition hover:border-brand hover:bg-brand-soft focus-within:ring-2 focus-within:ring-brand/30 ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <FaPlus aria-hidden="true" className="text-2xl text-brand" />
        <span className="font-semibold text-ink">Choose images</span>
        <span id="gallery-images-help" className="text-sm text-gray-600">
          JPG, PNG or WebP, up to 5 MB each, at most {GALLERY_MAX_FILES_PER_UPLOAD} at a time.
        </span>
      </label>

      {chosen.length > 0 && (
        <ul aria-label="Images to upload" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {chosen.map(({ key, file, preview, error: fileError }) => (
            <li
              key={key}
              className={`relative overflow-hidden rounded-xl border-2 bg-white ${fileError ? 'border-danger' : 'border-gray-200'}`}
            >
              <img src={preview} alt="" className="aspect-[4/3] w-full bg-gray-100 object-cover" />
              <div className="px-2 py-1.5 text-xs">
                <p className="truncate font-semibold text-ink" title={file.name}>{file.name}</p>
                <p className={fileError ? 'font-medium text-danger' : 'text-gray-500'}>{fileError || formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeChosen(key)}
                disabled={busy}
                aria-label={`Remove ${file.name}`}
                className="absolute top-1.5 right-1.5 cursor-pointer rounded-full bg-black/60 p-1.5 text-white transition hover:bg-danger disabled:opacity-50"
              >
                <FaXmark aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p id="gallery-images-error" role="alert" className="mt-3 min-h-5 text-sm text-danger">
        {error ||
          (tooMany ? `Choose at most ${GALLERY_MAX_FILES_PER_UPLOAD} images at a time.` : '') ||
          (invalid.length > 0 ? 'Remove the images marked in red before uploading.' : '')}
      </p>

      <div className="mt-2 flex justify-end border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={upload}
          disabled={busy || chosen.length === 0 || invalid.length > 0 || tooMany}
          className="btn btn-primary !rounded-lg !px-6 !py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaCloudArrowUp aria-hidden="true" />
          {busy ? 'Uploading...' : `Upload ${chosen.length || ''} ${chosen.length === 1 ? 'Image' : 'Images'}`}
        </button>
      </div>
    </DashboardSection>
  )
}

// Admin-only page: the images of the public Gallery page. Uploaded images appear there at
// once; deleting one removes it there too.
function AdminGallery() {
  const [images, setImages] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    listAdminGalleryImages()
      .then((loaded) => active && setImages(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [])

  const confirmDelete = async () => {
    setBusy(true)
    setDeleteError('')
    try {
      await deleteGalleryImage(deleting.id)
      setImages((current) => current.filter((image) => image.id !== deleting.id))
      setToast({ variant: 'success', message: `"${deleting.title}" has been deleted from the gallery.` })
      setDeleting(null)
    } catch (removeError) {
      setDeleteError(removeError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DashboardWelcome
        title="Gallery"
        message="Images shown on the public Gallery page of the website."
        icon={FaImages}
      />

      <UploadForm onUploaded={(added) => setImages((current) => [...[...added].reverse(), ...(current ?? [])])} onToast={setToast} />

      <DashboardSection title={`Gallery Images${images ? ` (${images.length})` : ''}`} icon={FaImages}>
        {!images ? (
          <p role={error ? 'alert' : 'status'} className="py-8 text-center text-gray-600">
            {error || 'Loading images...'}
          </p>
        ) : images.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-gray-600">
            No images yet. Upload some above: they appear on the public Gallery page straight away.
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {images.map((image) => (
              <li key={image.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <img
                  src={galleryImageSrc(image)}
                  alt={image.title}
                  loading="lazy"
                  className="aspect-[4/3] w-full bg-gray-100 object-cover"
                />
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink" title={image.originalName}>{image.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDateTime(image.createdAt)} · {formatSize(image.sizeBytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError('')
                      setDeleting(image)
                    }}
                    aria-label={`Delete ${image.title}`}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-danger-dark"
                  >
                    <FaTrashCan aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      {deleting && (
        <ConfirmDialog
          title="Delete image?"
          message={`"${deleting.title}" will be removed from the public gallery and deleted. This cannot be undone.`}
          confirmLabel="Delete"
          tone="danger"
          busy={busy}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default AdminGallery
