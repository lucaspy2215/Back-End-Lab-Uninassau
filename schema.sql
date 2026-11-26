CREATE DATABASE IF NOT EXISTS lab_agenda
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE lab_agenda;

CREATE TABLE IF NOT EXISTS pessoas (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  registration_number VARCHAR(20) NOT NULL,
  role ENUM('teacher', 'admin') NOT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  activation_token_hash VARCHAR(255) DEFAULT NULL,
  activation_expires_at DATETIME DEFAULT NULL,
  reset_token_hash VARCHAR(255) DEFAULT NULL,
  reset_expires_at DATETIME DEFAULT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_people_email (email),
  UNIQUE KEY uq_people_registration_number (registration_number)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS reservations (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  teacher VARCHAR(100) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  course VARCHAR(100) NOT NULL,
  lab VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  shift VARCHAR(10) NOT NULL,
  time_slot TINYINT NOT NULL,

  status ENUM(
    'pending',
    'active',
    'cancellation_requested',
    'completed',
    'cancelled',
    'rejected'
  ) NOT NULL DEFAULT 'pending',

  rejected_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,

  blocks_slot TINYINT
    GENERATED ALWAYS AS (
      CASE
        WHEN status IN (
          'active',
          'cancellation_requested',
          'completed'
        ) THEN 1
        ELSE NULL
      END
    ) STORED,

  PRIMARY KEY (id),

  UNIQUE KEY uq_lab_slot (
    lab,
    date,
    shift,
    time_slot,
    blocks_slot
  ),

  UNIQUE KEY uq_teacher_id_slot (
    user_id,
    date,
    shift,
    time_slot,
    blocks_slot
  ),

  KEY idx_reservations_user (user_id),

  CONSTRAINT fk_reservations_user
    FOREIGN KEY (user_id)
    REFERENCES pessoas (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
