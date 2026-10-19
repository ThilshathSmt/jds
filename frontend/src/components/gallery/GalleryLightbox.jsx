import { useEffect, useRef } from 'react'
import { FaChevronLeft, FaChevronRight, FaXmark } from 'react-icons/fa6'
import { galleryImageSrc } from '../../services/galleryApi'

const navButton =
  'absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/15 p-3 text-xl text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-30'

// Larger view of one gallery image, on the native <dialog> (focus is trapped, Esc closes).
// Arrow keys or the side buttons move through `images`. Render it only while it is open.
function GalleryLightbox({ images, index, onIndexChange, onClose }) {
  const dialogRef = useRef(null)
  const image = images[index]
  const hasPrevious = index > 0
  const hasNext = index < images.length - 1

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft' && hasPrevious) onIndexChange(index - 1)
    if (event.key === 'ArrowRight' && hasNext) onIndexChange(index + 1)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={image.title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={handleKeyDown}
      // A click on the dark backdrop (the dialog itself, not its content) closes it
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto h-dvh max-h-none w-screen max-w-none bg-black/90 p-0 backdrop:bg-black/70"
    >
      <div className="relative flex h-full flex-col items-center justify-center gap-4 px-4 py-16 sm:px-20">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          autoFocus
          className="absolute top-4 right-4 cursor-pointer rounded-full bg-white/15 p-3 text-xl text-white transition hover:bg-white/30"
        >
          <FaXmark aria-hidden="true" />
        </button>

        <img
          src={galleryImageSrc(image)}
          alt={image.title}
          className="max-h-[calc(100dvh-10rem)] max-w-full rounded-xl object-contain shadow-2xl"
        />
        <p className="text-center font-semibold text-white">
          {image.title}
          <span className="ml-2 text-sm font-normal text-white/60">
            {index + 1} / {images.length}
          </span>
        </p>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onIndexChange(index - 1)}
              disabled={!hasPrevious}
              aria-label="Previous image"
              className={`${navButton} left-2 sm:left-6`}
            >
              <FaChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange(index + 1)}
              disabled={!hasNext}
              aria-label="Next image"
              className={`${navButton} right-2 sm:right-6`}
            >
              <FaChevronRight aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </dialog>
  )
}

export default GalleryLightbox
