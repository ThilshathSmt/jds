import useScrollReveal from '../utils/useScrollReveal'

// Generic semantic wrapper for staggered landing-page card collections.
function ScrollReveal({
  as: Element = 'div',
  className = '',
  delay = 0,
  children,
  style,
  enabled = true,
  ...props
}) {
  const { ref, className: revealClass } = useScrollReveal(enabled)
  return (
    <Element
      ref={ref}
      className={`${revealClass} ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...props}
    >
      {children}
    </Element>
  )
}

export default ScrollReveal
