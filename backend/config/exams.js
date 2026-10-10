// Theory exam categories offered in the Student panel.
// Kept here while there are only two fixed categories and nothing is stored per exam.
// When questions, durations and attempts are added, this moves to the database and
// services/examService.js is the only place that has to change. The `id` is used in URLs
// (/api/student/exams/:examType) and is the key future question sets will refer to.

export const exams = [
  {
    id: 'heavy-vehicle',
    title: 'Heavy Vehicle Exam',
    description: 'Prepare for the heavy vehicle driving theory examination.',
    available: true,
  },
  {
    id: 'light-vehicle',
    title: 'Light Vehicle Exam',
    description: 'Prepare for the light vehicle driving theory examination.',
    available: true,
  },
]

export const findExamById = (id) => exams.find((exam) => exam.id === id) ?? null
