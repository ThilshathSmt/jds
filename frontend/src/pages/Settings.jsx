import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FaGear } from 'react-icons/fa6'
import DashboardWelcome from '../components/dashboard/DashboardWelcome'
import Toast from '../components/dashboard/Toast'
import ChangePasswordSection from '../components/settings/ChangePasswordSection'
import PersonalInfoSection from '../components/settings/PersonalInfoSection'
import ProfilePictureSection from '../components/settings/ProfilePictureSection'
import { useAuth } from '../context/useAuth'
import { getProfile } from '../services/profileApi'

// Settings for every panel (student, instructor, admin): the signed-in user's own profile
// picture, name and e-mail, and password. Loaded from and saved to the backend, which only
// ever works on the account of the session.
function Settings() {
  // The panel user: name, role icon and the current profile picture shown in the header
  const { user: panelUser } = useOutletContext()
  const { updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let active = true
    getProfile()
      .then((loaded) => active && setProfile(loaded))
      .catch((loadError) => active && setError(loadError.message))
    return () => {
      active = false
    }
  }, [])

  // The header and sidebar follow at once
  const handleSaved = (saved) => {
    setProfile(saved)
    updateUser({ name: saved.name, email: saved.email, profilePictureUrl: saved.profilePictureUrl })
  }

  return (
    <>
      <DashboardWelcome
        title="Settings"
        message="Manage your profile picture, personal information and password."
        icon={FaGear}
      />

      {!profile ? (
        <p role={error ? 'alert' : 'status'} className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          {error || 'Loading your profile...'}
        </p>
      ) : (
        <>
          <ProfilePictureSection
            avatarUser={panelUser}
            hasPicture={Boolean(profile.profilePictureUrl)}
            onSaved={handleSaved}
            onToast={setToast}
          />
          {/* Remounted after a save so the form starts from the saved values */}
          <PersonalInfoSection
            key={`${profile.name}|${profile.email}|${profile.pendingEmail ?? ''}`}
            profile={profile}
            onSaved={handleSaved}
            onToast={setToast}
          />
          <ChangePasswordSection onToast={setToast} />
        </>
      )}

      <Toast toast={toast} onClose={closeToast} />
    </>
  )
}

export default Settings
