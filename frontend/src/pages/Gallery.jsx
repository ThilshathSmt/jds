import { useCallback, useEffect, useState } from 'react'
import { FaImages, FaMagnifyingGlassPlus } from 'react-icons/fa6'
import SectionHeading from '../components/SectionHeading'
import GalleryLightbox from '../components/gallery/GalleryLightbox'
import { galleryImageSrc, listGalleryImages } from '../services/galleryApi'

const noticeClass = 'mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-600 shadow-sm'

// The public Gallery page. The images are whatever the admins have uploaded, loaded from
// the backend on every visit: a new image shows here without changing the site.
// Three columns on desktops, two on tablets, one on small phones; rows follow as needed.
function Gallery() {
  const [images, setImages] = useState(null)
  const [error, setError] = useState('')
  const [openIndex, setOpenIndex] = useState(null)

  const load = useCallback(() => {
    setError('')
    listGalleryImages()
      .then(setImages)
      .catch((loadError) => setError(loadError.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="bg-gray-50 py-12 sm:py-16">
      <div className="container-page">
        <SectionHeading
          eyebrow="Gallery"
          title="Moments at Jeslan Driving School"
          subtitle="Lessons, vehicles and proud new drivers."
        />

        {error ? (
          <div role="alert" className={noticeClass}>
            <p className="font-semibold text-ink">The gallery could not be loaded.</p>
            <p className="mt-1 text-sm">{error}</p>
            <button type="button" onClick={load} className="btn btn-primary mt-5 !rounded-lg !px-5 !py-2">
              Try again
            </button>
          </div>
        ) : !images ? (
          <ul aria-label="Loading gallery" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (unused, index) => (
              <li key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200" />
            ))}
          </ul>
        ) : images.length === 0 ? (
          <div className={noticeClass}>
            <FaImages aria-hidden="true" className="mx-auto text-5xl text-brand/40" />
            <p className="mt-4 font-semibold text-ink">No photos yet</p>
            <p className="mt-1 text-sm">Photos from our lessons and events will appear here soon.</p>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image, index) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  aria-label={`View ${image.title}`}
                  className="group block w-full cursor-pointer overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-gray-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-4 focus-visible:ring-brand/40 focus-visible:outline-none"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={galleryImageSrc(image)}
                      alt={image.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-brand-deep/0 text-3xl text-white opacity-0 transition duration-300 group-hover:bg-brand-deep/35 group-hover:opacity-100">
                      <FaMagnifyingGlassPlus aria-hidden="true" />
                    </span>
                  </span>
                  <span className="block truncate px-4 py-3 font-semibold text-ink">{image.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {openIndex !== null && images?.[openIndex] && (
        <GalleryLightbox
          images={images}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  )
}

export default Gallery
