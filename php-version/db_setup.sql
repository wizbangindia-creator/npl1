-- =============================================================
--  NPL1 (Shivshaktiloto) — MySQL schema for Hostinger shared hosting
--  Import this via phpMyAdmin ONCE after creating your database.
-- =============================================================

CREATE TABLE IF NOT EXISTS admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(191) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS slots (
  date    DATE NOT NULL,
  hour    TINYINT UNSIGNED NOT NULL,
  minute  TINYINT UNSIGNED NOT NULL,
  a       CHAR(2) NOT NULL,
  b       CHAR(2) NOT NULL,
  c       CHAR(2) NOT NULL,
  PRIMARY KEY (date, hour, minute)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS super_draws (
  date       DATE PRIMARY KEY,
  number     CHAR(2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
