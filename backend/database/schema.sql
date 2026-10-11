-- Jeslan Driving School database schema.
-- Applied by `npm run db:setup`. Safe to run more than once: existing tables are kept.

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  driving_school_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student', 'instructor') NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  -- Increased whenever the account is deactivated; login tokens carrying an older value
  -- are rejected, so a deactivated user's sessions stay dead even after reactivation.
  session_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_driving_school_id (driving_school_id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Registry of Driving School IDs issued by the school.
-- An ID is issued with a role; a person can only register with an 'available' ID,
-- and the account takes its role from this table (never from the registration request).
--   available -> assigned (linked to the user who registered with it)
--   revoked: withdrawn before it was used, or its account was deleted by an admin.
--            A revoked ID is kept (applications may still refer to it) and is never reissued.
CREATE TABLE IF NOT EXISTS driving_school_ids (
  id INT PRIMARY KEY AUTO_INCREMENT,
  driving_school_id VARCHAR(50) NOT NULL,
  role ENUM('admin', 'student', 'instructor') NOT NULL,
  status ENUM('available', 'assigned', 'revoked') NOT NULL DEFAULT 'available',
  user_id INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_driving_school_ids_driving_school_id (driving_school_id),
  UNIQUE KEY uq_driving_school_ids_user_id (user_id),
  KEY idx_driving_school_ids_role_status (role, status),
  CONSTRAINT fk_driving_school_ids_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_driving_school_ids_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One counter per ID prefix (JDS_STD_, JDS_INS_). The counter row is locked while a new
-- ID is issued, so two requests can never receive the same number.
CREATE TABLE IF NOT EXISTS driving_school_id_sequences (
  prefix VARCHAR(20) PRIMARY KEY,
  last_number INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Applications submitted through the public "Apply Now" form.
-- Submitting an application never creates a login account. When an admin approves it,
-- a student Driving School ID is issued and stored here; the applicant then uses that ID
-- on the Register page. The account is reached through driving_school_ids.user_id:
--   registration_applications.driving_school_id -> driving_school_ids -> users
-- Amounts are whole Sri Lankan rupees.
CREATE TABLE IF NOT EXISTS registration_applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  mobile_number CHAR(10) NOT NULL,
  email VARCHAR(150) NULL,
  nic VARCHAR(12) NOT NULL,
  address VARCHAR(500) NOT NULL,
  package_id INT NOT NULL,
  package_name VARCHAR(150) NOT NULL,
  package_price INT UNSIGNED NOT NULL,
  minimum_payment INT UNSIGNED NOT NULL,
  payment_method ENUM('bank-transfer', 'visit-branch') NOT NULL,
  status ENUM('NEW', 'APPROVED', 'SUSPENDED') NOT NULL DEFAULT 'NEW',
  driving_school_id VARCHAR(50) NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_registration_applications_driving_school_id (driving_school_id),
  KEY idx_registration_applications_status (status, created_at),
  CONSTRAINT fk_registration_applications_driving_school_id FOREIGN KEY (driving_school_id)
    REFERENCES driving_school_ids (driving_school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Files uploaded with an application. Only metadata is stored here; the file itself is on
-- disk under the uploads directory as `stored_name` (a random name chosen by the server).
CREATE TABLE IF NOT EXISTS application_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  application_id INT NOT NULL,
  document_type ENUM('payment_receipt') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(100) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_application_documents_stored_name (stored_name),
  CONSTRAINT fk_application_documents_application FOREIGN KEY (application_id)
    REFERENCES registration_applications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One student's timed attempt at an exam paper (the questions themselves live in
-- backend/data/examPapers; exam_id / paper_id are the ids used there).
--   in_progress -> submitted (the student is reviewing) -> completed (result final)
--   submitted -> in_progress again only by "Back to Quiz": manual submission, before the deadline
-- `active` is 1 until the attempt is completed and NULL afterwards. Because a UNIQUE key
-- ignores NULLs, a student can have any number of completed attempts at a paper but never
-- two unfinished ones.
-- `question_order` is the shuffle made when the attempt started:
--   [{ "q": questionId, "o": [optionId, optionId, optionId, optionId] }, ...]
-- `answer_key` ({ questionId: correctOptionId }) and the three counts are written when the
-- attempt is submitted, so a later correction of the paper never changes a recorded result.
-- Times are set by the server only; `deadline_at` is authoritative for the countdown.
CREATE TABLE IF NOT EXISTS exam_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  exam_id VARCHAR(50) NOT NULL,
  paper_id VARCHAR(50) NOT NULL,
  status ENUM('in_progress', 'submitted', 'completed') NOT NULL DEFAULT 'in_progress',
  active TINYINT NULL DEFAULT 1,
  submission_type ENUM('manual', 'timeout') NULL,
  question_order JSON NOT NULL,
  answer_key JSON NULL,
  total_questions SMALLINT UNSIGNED NOT NULL,
  duration_seconds INT UNSIGNED NOT NULL,
  started_at TIMESTAMP(3) NOT NULL,
  deadline_at TIMESTAMP(3) NOT NULL,
  submitted_at TIMESTAMP(3) NULL,
  completed_at TIMESTAMP(3) NULL,
  correct_count SMALLINT UNSIGNED NULL,
  incorrect_count SMALLINT UNSIGNED NULL,
  unanswered_count SMALLINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exam_attempts_one_active (user_id, exam_id, paper_id, active),
  KEY idx_exam_attempts_user_paper (user_id, exam_id, paper_id, status),
  CONSTRAINT fk_exam_attempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The option a student has chosen for each question of an attempt (no row = unanswered).
-- Stores the option's permanent id, never its position on screen.
CREATE TABLE IF NOT EXISTS exam_attempt_answers (
  attempt_id INT NOT NULL,
  question_id VARCHAR(50) NOT NULL,
  option_id VARCHAR(60) NOT NULL,
  answered_at TIMESTAMP(3) NOT NULL,
  PRIMARY KEY (attempt_id, question_id),
  CONSTRAINT fk_exam_attempt_answers_attempt FOREIGN KEY (attempt_id)
    REFERENCES exam_attempts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A student's request for a date for the physical driving licence examination.
--   PENDING -> APPROVED (the admin confirmed one of the preferred dates)
--   PENDING -> REJECTED (with a reason). A decided request never changes again; after a
--   rejection the student submits a new request.
-- `student_name` and `driving_school_id` are copied from the account when the request is
-- submitted, so the request reads the same even if the account is renamed later.
-- `pending` is 1 while the request is PENDING and NULL afterwards. Because a UNIQUE key
-- ignores NULLs, a student can have any number of decided requests but never two pending ones.
-- `approved_date` is always one of the request's rows in exam_date_request_dates.
CREATE TABLE IF NOT EXISTS exam_date_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  student_name VARCHAR(100) NOT NULL,
  driving_school_id VARCHAR(50) NOT NULL,
  medical_report_submitted TINYINT(1) NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  pending TINYINT NULL DEFAULT 1,
  approved_date DATE NULL,
  rejection_reason_code ENUM('MEDICAL_REPORT_NOT_SUBMITTED', 'NO_SLOTS_AVAILABLE', 'OTHER') NULL,
  rejection_reason VARCHAR(300) NULL,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exam_date_requests_one_pending (user_id, pending),
  KEY idx_exam_date_requests_status (status, created_at),
  KEY idx_exam_date_requests_user (user_id, created_at),
  CONSTRAINT fk_exam_date_requests_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_date_requests_reviewed_by FOREIGN KEY (reviewed_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The one to three Tuesdays a student is available on, in the order they were chosen
-- (`position` 1 is the first choice). These are preferences, not bookings.
CREATE TABLE IF NOT EXISTS exam_date_request_dates (
  request_id INT NOT NULL,
  position TINYINT UNSIGNED NOT NULL,
  preferred_date DATE NOT NULL,
  PRIMARY KEY (request_id, position),
  UNIQUE KEY uq_exam_date_request_dates_date (request_id, preferred_date),
  CONSTRAINT fk_exam_date_request_dates_request FOREIGN KEY (request_id)
    REFERENCES exam_date_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications shown under the bell and on the Notifications pages. One row per
-- recipient (`user_id`), so every user has their own read state: a message for the admins
-- is stored once for each admin account. `read_at` is NULL until the recipient reads it.
-- `type` says what the notification is about; `exam_date_request_id` links it to the
-- request it concerns (NULL for future notification types that have no request).
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(600) NOT NULL,
  exam_date_request_id INT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user (user_id, created_at),
  KEY idx_notifications_user_unread (user_id, read_at),
  KEY idx_notifications_request (exam_date_request_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_exam_date_request FOREIGN KEY (exam_date_request_id)
    REFERENCES exam_date_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
