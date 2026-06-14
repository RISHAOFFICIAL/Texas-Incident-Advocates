import os
import sqlite3

class LibSQLConnectionShim:
    def __init__(self, client):
        self.client = client
    def cursor(self):
        return LibSQLCursorShim(self.client)
    def commit(self):
        pass
    def close(self):
        self.client.close()

class LibSQLCursorShim:
    def __init__(self, client):
        self.client = client
        self.rowcount = 0
    def execute(self, sql, params=None):
        if params is not None:
            if isinstance(params, tuple):
                params = list(params)
        try:
            self.result = self.client.execute(sql, params)
            self.rowcount = getattr(self.result, 'rows_affected', 0)
        except Exception as e:
            err_msg = str(e).lower()
            if "unique" in err_msg or "constraint" in err_msg:
                raise sqlite3.IntegrityError(str(e))
            raise e
        return self

    def fetchall(self):
        return [tuple(row) for row in self.result]

    def fetchone(self):
        rows = self.fetchall()
        return rows[0] if rows else None

def get_connection(db_path):
    url = os.getenv("TURSO_DATABASE_URL")
    token = os.getenv("TURSO_AUTH_TOKEN")
    if url:
        print(f"[DATABASE] Connecting to remote Turso database: {url}")
        try:
            import libsql_client
            client = libsql_client.create_client_sync(url=url, auth_token=token)
            return LibSQLConnectionShim(client)
        except ImportError:
            print("[DATABASE] libsql-client is not installed. Falling back to local SQLite.")
            return sqlite3.connect(db_path)
    else:
        print(f"[DATABASE] Connecting to local SQLite database: {db_path}")
        return sqlite3.connect(db_path)
