const Database = require('better-sqlite3');
const db = new Database('roles.sqlite');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS timed_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    roleId TEXT NOT NULL,
    expirationDate INTEGER NOT NULL, -- Unix Timestamp
    UNIQUE(guildId, userId, roleId) -- 동일 유저에게 동일 역할 중복 추가 방지
  );
`);

module.exports = db;