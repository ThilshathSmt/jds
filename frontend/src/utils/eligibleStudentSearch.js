// Match the public ID as a whole or by any part of its numeric suffix. The ID match also
// handles numeric fragments with leading zeroes (for example, "19" in JDS_STD_0019).
export const filterEligibleDrivingSchoolIds = (ids, search) => {
  const query = String(search ?? '').trim().toUpperCase()
  if (!query) return ids
  const numericQuery = query.replace(/\D/g, '')
  return ids.filter((id) => {
    const normalizedId = String(id).trim().toUpperCase()
    if (normalizedId.includes(query)) return true
    const numericPart = normalizedId.match(/\d+$/)?.[0] ?? ''
    return Boolean(numericQuery && numericPart.includes(numericQuery))
  })
}
