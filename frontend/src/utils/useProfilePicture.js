import { useEffect, useState } from 'react'
import { fetchProfilePicture } from '../services/profileApi'

// One picture is loaded at a time (the signed-in user's), and shared by every place that
// shows it (header, sidebar, Settings), so it is fetched once per picture.
let cached = { url: null, objectUrl: null, promise: null }

const load = (url) => {
  if (cached.url !== url) {
    if (cached.objectUrl) URL.revokeObjectURL(cached.objectUrl)
    const entry = { url, objectUrl: null, promise: null }
    entry.promise = fetchProfilePicture(url).then((blob) => {
      entry.objectUrl = URL.createObjectURL(blob)
      return entry.objectUrl
    })
    cached = entry
  }
  return cached.promise
}

// A local URL of the picture at `profilePictureUrl` (the user's `profilePictureUrl`), or
// null while it loads, when there is none or when it cannot be loaded
function useProfilePicture(profilePictureUrl) {
  const [loaded, setLoaded] = useState({ url: null, src: null })

  useEffect(() => {
    if (!profilePictureUrl) return undefined
    let active = true
    load(profilePictureUrl)
      .then((src) => active && setLoaded({ url: profilePictureUrl, src }))
      .catch(() => active && setLoaded({ url: profilePictureUrl, src: null }))
    return () => {
      active = false
    }
  }, [profilePictureUrl])

  return profilePictureUrl && loaded.url === profilePictureUrl ? loaded.src : null
}

export default useProfilePicture
