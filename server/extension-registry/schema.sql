PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE extensions (
    extension_id TEXT NOT NULL,
    name TEXT NOT NULL,
    authors TEXT NOT NULL,
    description TEXT NOT NULL,
    repository TEXT NOT NULL,
    downloads INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CONSTRAINT Extensions_PK PRIMARY KEY (extension_id)
);
CREATE TABLE extension_artifacts (
    artifact_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    extension_id TEXT NOT NULL,
    ver_major INTEGER NOT NULL,
    ver_minor INTEGER NOT NULL,
    ver_patch INTEGER NOT NULL,
    min_app_major INTEGER NOT NULL,
    min_app_minor INTEGER NOT NULL,
    min_app_patch INTEGER NOT NULL,
    published_at TEXT NOT NULL,
    artifact BLOB NOT NULL,
    ver_rank as (ver_major*1000000 + ver_minor*1000 + ver_patch),
    min_app_rank as (min_app_major*1000000 + min_app_minor*1000 + min_app_patch),
    CONSTRAINT extension_versions_extensions_FK FOREIGN KEY (extension_id) REFERENCES extensions(extension_id) ON DELETE CASCADE);
DELETE FROM sqlite_sequence;
