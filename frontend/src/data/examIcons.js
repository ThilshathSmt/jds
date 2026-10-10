// Icon shown for each exam category. Titles and descriptions come from the backend
// (GET /api/student/exams); only the presentation lives here.

import { FaCarSide, FaFileSignature, FaTruck } from 'react-icons/fa6'

const examIcons = {
  'heavy-vehicle': FaTruck,
  'light-vehicle': FaCarSide,
}

export const getExamIcon = (examId) => examIcons[examId] ?? FaFileSignature
