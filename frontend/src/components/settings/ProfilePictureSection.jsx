import { useEffect, useRef, useState } from 'react'
import { FaCamera, FaFloppyDisk, FaTrashCan, FaXmark } from 'react-icons/fa6'
import DashboardSection from '../dashboard/DashboardSection'
import UserAvatar from '../dashboard/UserAvatar'
import { removeProfilePicture, uploadProfilePicture } from '../../services/profileApi'
import { PROFILE_PICTURE_ACCEPT, validateProfilePicture } from '../../utils/authValidation'

const smallButton =
  'inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

// Current picture, a preview of the chosen file, and Save / Cancel / Remove.
// `avatarUser` is the panel user (name, role icon and current picture); `onSaved(profile)`
// receives the saved profile.
function ProfilePictureSection({ avatarUser, hasPicture, onSaved, onToast }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // The preview's object URL is released when it is replaced or the page is left
  useEffect(() => {
    if (!file) return undefined
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const clear = () => {
    setFile(null)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const choose = (event) => {
    const chosen = event.target.files?.[0]
    if (!chosen) return
    const problem = validateProfilePicture(chosen)
    setError(problem)
    if (problem) {
      clear()
      return
    }
    setFile(chosen)
  }

  const run = async (request, successMessage) => {
    setBusy(true)
    setError('')
    try {
      onSaved(await request())
      clear()
      onToast({ variant: 'success', message: successMessage })
    } catch (requestError) {
      setError(requestError.fieldErrors?.picture ?? requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardSection title="Profile Picture" icon={FaCamera}>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <UserAvatar
          user={preview ? { ...avatarUser, avatar: preview } : avatarUser}
          size="xl"
          className="!ring-4 !ring-brand-soft"
        />
        <div className="flex w-full flex-col items-center gap-3 sm:items-start">
          <p className="text-center text-sm text-gray-600 sm:text-left">
            {preview
              ? 'This is a preview. Save it to use it as your profile picture.'
              : 'JPG, PNG or WebP, up to 2 MB. A square picture looks best.'}
          </p>
          <input
            ref={inputRef}
            id="profile-picture"
            type="file"
            accept={PROFILE_PICTURE_ACCEPT}
            onChange={choose}
            disabled={busy}
            aria-describedby="profile-picture-error"
            className="sr-only"
          />
          <div className="flex flex-wrap justify-center gap-2">
            {file ? (
              <>
                <button
                  type="button"
                  onClick={() => run(() => uploadProfilePicture(file), 'Your profile picture has been updated.')}
                  disabled={busy}
                  className={`${smallButton} bg-brand text-white hover:bg-brand-dark`}
                >
                  <FaFloppyDisk aria-hidden="true" />
                  {busy ? 'Uploading...' : 'Save Picture'}
                </button>
                <button type="button" onClick={clear} disabled={busy} className={`${smallButton} bg-gray-200 text-ink hover:bg-gray-300`}>
                  <FaXmark aria-hidden="true" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <label
                  htmlFor="profile-picture"
                  className={`${smallButton} border border-brand bg-white text-brand hover:bg-brand hover:text-white focus-within:ring-2 focus-within:ring-brand/30 ${busy ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <FaCamera aria-hidden="true" />
                  {hasPicture ? 'Change Picture' : 'Upload Picture'}
                </label>
                {hasPicture && (
                  <button
                    type="button"
                    onClick={() => run(removeProfilePicture, 'Your profile picture has been removed.')}
                    disabled={busy}
                    className={`${smallButton} border border-gray-300 bg-white text-gray-700 hover:border-danger hover:text-danger`}
                  >
                    <FaTrashCan aria-hidden="true" />
                    Remove
                  </button>
                )}
              </>
            )}
          </div>
          <p id="profile-picture-error" role="alert" className="min-h-5 text-sm text-danger">
            {error}
          </p>
        </div>
      </div>
    </DashboardSection>
  )
}

export default ProfilePictureSection
