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
--   revoked: withdrawn before it was used
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
