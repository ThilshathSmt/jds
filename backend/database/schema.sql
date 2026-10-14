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
  -- Set when a student has failed all three attempts of an examination cycle: the account
  -- cannot be used until an admin approves a new registration application (a
  -- "reapplication"), which clears it again. Separate from `status`: activating or
  -- deactivating an account never unlocks it.
  locked_at TIMESTAMP NULL,
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

-- The course packages a student chooses from on the Apply Now and reapplication forms,
-- managed by the admins on the "Packages & Exam Penalties" page. Prices are whole Sri
-- Lankan rupees. A package is never deleted: it is deactivated, so it is no longer offered
-- but applications that chose it still refer to it. An application keeps its own copy of
-- the name, price and minimum payment (a snapshot), so a later change here never alters
-- an application that has already been submitted.
-- The first five rows are the school's original packages; their ids are the package ids
-- earlier applications were saved with. INSERT IGNORE adds them once and never overwrites
-- an admin's changes.
CREATE TABLE IF NOT EXISTS driving_school_packages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  price INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_driving_school_packages_name (name),
  KEY idx_driving_school_packages_active (is_active, sort_order),
  CONSTRAINT fk_driving_school_packages_updated_by FOREIGN KEY (updated_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO driving_school_packages (id, name, price, sort_order) VALUES
  (1, 'All Cars / Dual Purpose – Manual / Auto (B)', 40000, 1),
  (2, 'VIP Course (Pick & Drop)', 60000, 2),
  (3, 'Motorcycle (A, A-1)', 12500, 3),
  (4, '1 Hour Individual Lesson (B)', 3500, 4),
  (5, 'Theory Class', 3000, 5);

-- School-wide settings an admin changes on the "Packages & Exam Penalties" page: one row
-- per setting, whole numbers only.
--   registration_advance_payment_percent: the minimum share of a package's price paid
--     with a registration (1-100). Packages up to LKR 10,000 are always paid in full.
--   exam_reattempt_fee: LKR owed after a first or second failed examination attempt.
-- The value in force is copied wherever it is used (the application's minimum payment, the
-- failed attempt's fee), so changing a setting only affects what comes after.
-- INSERT IGNORE adds the starting values once and never overwrites an admin's change.
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value INT UNSIGNED NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_system_settings_updated_by FOREIGN KEY (updated_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES
  ('registration_advance_payment_percent', 40),
  ('exam_reattempt_fee', 2000);

-- Applications submitted through the public "Apply Now" form.
-- Submitting an application never creates a login account. When an admin approves it,
-- a student Driving School ID is issued and stored here; the applicant then uses that ID
-- on the Register page. `package_id` is the driving_school_packages row chosen;
-- `package_name`, `package_price` and `minimum_payment` are copied from it (and from the
-- advance payment setting) when the application is submitted, and never change afterwards.
-- The account is reached through driving_school_ids.user_id:
--   registration_applications.driving_school_id -> driving_school_ids -> users
-- Amounts are whole Sri Lankan rupees.
--
-- A REAPPLICATION is the new application a student must submit after failing all three
-- attempts of an examination cycle (their account is locked until it is approved). It
-- belongs to the existing account (`user_id`): no Driving School ID is issued for it and
-- `driving_school_id` stays NULL, so the student keeps the ID and the account they have.
--   NEW -> APPROVED (the account is unlocked and a new cycle of attempts starts)
--   NEW -> REJECTED (with `rejection_reason`; the account stays locked)
-- `pending` is 1 while a reapplication is NEW and NULL otherwise: one pending
-- reapplication per student. Like a first-time application it has a package chosen by the
-- student, its minimum registration payment and the payment receipt. The student confirms
-- that they have obtained a new medical report (`new_medical_report_confirmed` = 1); the
-- report itself is checked by the school, not uploaded. NULL on first-time applications.
-- It never includes the examination reattempt fee.
-- (Reapplications from before packages were chosen copied the first application's package
-- and recorded the reattempt fee as `minimum_payment`.)
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
  status ENUM('NEW', 'APPROVED', 'SUSPENDED', 'REJECTED') NOT NULL DEFAULT 'NEW',
  driving_school_id VARCHAR(50) NULL,
  application_type ENUM('NEW_STUDENT', 'REAPPLICATION') NOT NULL DEFAULT 'NEW_STUDENT',
  user_id INT NULL,
  pending TINYINT NULL,
  new_medical_report_confirmed TINYINT(1) NULL,
  rejection_reason VARCHAR(300) NULL,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_registration_applications_driving_school_id (driving_school_id),
  UNIQUE KEY uq_registration_applications_one_pending (user_id, pending),
  KEY idx_registration_applications_status (status, created_at),
  CONSTRAINT fk_registration_applications_driving_school_id FOREIGN KEY (driving_school_id)
    REFERENCES driving_school_ids (driving_school_id),
  CONSTRAINT fk_registration_applications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_registration_applications_reviewed_by FOREIGN KEY (reviewed_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Files uploaded with an application. Only metadata is stored here; the file itself is on
-- disk under the uploads directory as `stored_name` (a random name chosen by the server).
CREATE TABLE IF NOT EXISTS application_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  application_id INT NOT NULL,
  document_type ENUM('payment_receipt', 'medical_report') NOT NULL,
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

-- Attempts at the physical driving licence examination are counted in cycles of three.
-- A student's first cycle belongs to the application they registered with and uses the
-- medical report they confirmed when requesting a date. Every later cycle is created only
-- when an admin approves a reapplication (`application_id`); `medical_report_document_id`
-- is the new medical report submitted with it. (`source_request_id` is set on cycles
-- created before reapplications existed, when a reattempt request could start a cycle.)
--   ACTIVE    -> attempts may still be recorded
--   EXHAUSTED -> all three attempts failed: the account is locked until a reapplication
--   PASSED    -> the student passed in this cycle
-- The number of attempts used is the number of licence_exam_attempts rows of the cycle.
-- Cycles are never changed or deleted: the history of earlier cycles stays for review.
-- The UNIQUE keys mean a student cannot get two cycles with the same number, one approved
-- request can never create two cycles, and one application starts one cycle at most.
CREATE TABLE IF NOT EXISTS exam_attempt_cycles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  cycle_number SMALLINT UNSIGNED NOT NULL,
  source_request_id INT NULL,
  application_id INT NULL,
  medical_report_document_id INT NULL,
  status ENUM('ACTIVE', 'EXHAUSTED', 'PASSED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exam_attempt_cycles_number (user_id, cycle_number),
  UNIQUE KEY uq_exam_attempt_cycles_source (source_request_id),
  UNIQUE KEY uq_exam_attempt_cycles_application (application_id),
  CONSTRAINT fk_exam_attempt_cycles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_attempt_cycles_application FOREIGN KEY (application_id)
    REFERENCES registration_applications (id) ON DELETE SET NULL,
  CONSTRAINT fk_exam_attempt_cycles_medical_report FOREIGN KEY (medical_report_document_id)
    REFERENCES application_documents (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row for every time a student sat the physical examination: written when an admin
-- records the result of an approved exam date request, never before. Requesting a date or
-- having a request rejected writes nothing here, so it uses no attempt.
--   UNIQUE (exam_date_request_id): a booking is counted as one attempt at most
--   UNIQUE (cycle_id, attempt_number): attempt 1, 2 and 3 of a cycle each exist once
-- `exam_date` is copied from the request's approved date. A recorded result is final.
-- A FAILED first or second attempt of a cycle must be followed by an approved
-- exam_reattempt_requests row (the reattempt fee) before the student may request another
-- date. A FAILED third attempt costs no fee: it exhausts the cycle and locks the account.
-- `reattempt_fee` is that obligation: the fee in force (system_settings) when the failure
-- was recorded, NULL when no fee is owed. A later change of the setting never alters it.
CREATE TABLE IF NOT EXISTS licence_exam_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  cycle_id INT NOT NULL,
  attempt_number TINYINT UNSIGNED NOT NULL,
  exam_date_request_id INT NOT NULL,
  exam_date DATE NOT NULL,
  result ENUM('PASSED', 'FAILED') NOT NULL,
  reattempt_fee INT UNSIGNED NULL,
  recorded_by INT NULL,
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_licence_exam_attempts_request (exam_date_request_id),
  UNIQUE KEY uq_licence_exam_attempts_number (cycle_id, attempt_number),
  KEY idx_licence_exam_attempts_user (user_id, recorded_at),
  CONSTRAINT fk_licence_exam_attempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_licence_exam_attempts_cycle FOREIGN KEY (cycle_id)
    REFERENCES exam_attempt_cycles (id) ON DELETE CASCADE,
  CONSTRAINT fk_licence_exam_attempts_request FOREIGN KEY (exam_date_request_id)
    REFERENCES exam_date_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_licence_exam_attempts_recorded_by FOREIGN KEY (recorded_by)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The reattempt fee a student owes after a first or second failed examination of a cycle,
-- with its proof of payment. An admin checks it:
--   PENDING -> APPROVED: the student may request an examination date again
--   PENDING -> REJECTED (with a reason): nothing is unlocked; the student may submit again.
-- The student submits it from their account, with the receipt as a document of this
-- table. A third failure costs no fee (the account is locked and a new registration
-- application is required). Rows from before that rule were paid for a third failure with
-- a reapplication (`reapplication_id`): they are approved or rejected together with it.
-- (`medical_report_required` and `medical_report_status` belong to rows from before
-- reapplications existed, when a third failure was settled here with a medical report.)
-- Every failed attempt has its own payment: `failed_attempt_id` is the attempt this row
-- pays for, and `cycle_id` is that attempt's cycle.
--   `approved` is 1 once APPROVED and NULL otherwise, so UNIQUE (failed_attempt_id, approved)
--   allows any number of rejected submissions for a failure but only one approved payment.
--   `pending` is 1 while PENDING and NULL afterwards: one pending submission per student.
-- `payment_status` and `medical_report_status` say which of the two the admin accepted
-- (`medical_report_status` means nothing when no medical report was required).
-- `fee_amount` is set by the server (whole Sri Lankan rupees), never by the browser.
CREATE TABLE IF NOT EXISTS exam_reattempt_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  student_name VARCHAR(100) NOT NULL,
  driving_school_id VARCHAR(50) NOT NULL,
  cycle_id INT NOT NULL,
  failed_attempt_id INT NOT NULL,
  medical_report_required TINYINT(1) NOT NULL DEFAULT 1,
  reapplication_id INT NULL,
  fee_amount INT UNSIGNED NOT NULL,
  payment_method ENUM('bank-transfer', 'visit-branch') NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  medical_report_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  payment_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  pending TINYINT NULL DEFAULT 1,
  approved TINYINT NULL,
  rejection_reason VARCHAR(300) NULL,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exam_reattempt_requests_one_pending (user_id, pending),
  UNIQUE KEY uq_exam_reattempt_requests_one_approved (failed_attempt_id, approved),
  KEY idx_exam_reattempt_requests_status (status, created_at),
  KEY idx_exam_reattempt_requests_user (user_id, created_at),
  CONSTRAINT fk_exam_reattempt_requests_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_reattempt_requests_cycle FOREIGN KEY (cycle_id)
    REFERENCES exam_attempt_cycles (id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_reattempt_requests_attempt FOREIGN KEY (failed_attempt_id)
    REFERENCES licence_exam_attempts (id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_reattempt_requests_reviewed_by FOREIGN KEY (reviewed_by)
    REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_exam_reattempt_requests_reapplication FOREIGN KEY (reapplication_id)
    REFERENCES registration_applications (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The files of a reattempt request: the payment receipt and, when required, the new
-- medical report. Only metadata is stored here; the file itself is on disk under the
-- uploads directory as `stored_name` (a random name chosen by the server).
CREATE TABLE IF NOT EXISTS exam_reattempt_request_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL,
  document_type ENUM('medical_report', 'payment_receipt') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(100) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exam_reattempt_request_documents_stored_name (stored_name),
  UNIQUE KEY uq_exam_reattempt_request_documents_type (request_id, document_type),
  CONSTRAINT fk_exam_reattempt_request_documents_request FOREIGN KEY (request_id)
    REFERENCES exam_reattempt_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications shown under the bell and on the Notifications pages. One row per
-- recipient (`user_id`), so every user has their own read state: a message for the admins
-- is stored once for each admin account. `read_at` is NULL until the recipient reads it.
-- `type` says what the notification is about. `exam_date_request_id` or
-- `exam_reattempt_request_id` / `registration_application_id` links it to what it concerns (both NULL for notification
-- types that have no request).
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(600) NOT NULL,
  exam_date_request_id INT NULL,
  exam_reattempt_request_id INT NULL,
  registration_application_id INT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user (user_id, created_at),
  KEY idx_notifications_user_unread (user_id, read_at),
  KEY idx_notifications_request (exam_date_request_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_exam_date_request FOREIGN KEY (exam_date_request_id)
    REFERENCES exam_date_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_exam_reattempt_request FOREIGN KEY (exam_reattempt_request_id)
    REFERENCES exam_reattempt_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_registration_application FOREIGN KEY (registration_application_id)
    REFERENCES registration_applications (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
