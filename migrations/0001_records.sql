CREATE TABLE records (
  owner_id TEXT NOT NULL,
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (owner_id, collection, id)
);
CREATE INDEX records_by_owner_collection ON records(owner_id, collection);
