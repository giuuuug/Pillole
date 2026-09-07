"""
Popola il database con 100 utenti fittizi (ma verosimili) e una pillola
pubblica a testa, per evitare che la feed sia vuota ai primi visitatori
reali.

Dati sorgente: seed_fake_users.json, nella stessa cartella — generato e
approvato tramite un artefatto di revisione (vedi CLAUDE.md, changelog).
Non rigenera i dati: li inserisce cosi' come sono stati approvati.

Uso:
    python scripts/seed_fake_users.py

Richiede DATABASE_URL (o NETLIFY_DATABASE_URL) in .env nella root del
progetto — la stessa variabile usata da scripts/seed.ts e dalle migrazioni
Drizzle. Si connette via psycopg2 (Postgres via TCP), come drizzle-kit:
Neon e' Postgres pienamente compatibile anche per un client Python (vedi
CLAUDE.md "Perche' due driver diversi per lo stesso database").

Questi utenti NON hanno una riga in "account": non possono fare login,
servono solo ad autorare pillole pubbliche. emailVerified=true + username
valorizzato bastano perche' canPublish() (src/lib/server/guards.ts) le
consideri pubblicabili.
"""

import json
import sys
import uuid
from pathlib import Path

from dotenv import dotenv_values

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:
    sys.exit(
        "Manca psycopg2. Installa con: python -m pip install psycopg2-binary"
    )

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = Path(__file__).resolve().parent / "seed_fake_users.json"


def get_database_url() -> str:
    env = dotenv_values(ROOT / ".env")
    url = env.get("DATABASE_URL") or env.get("NETLIFY_DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL non trovata in .env")
    return url


def main() -> None:
    people = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    if len(people) != 100:
        sys.exit(f"Attesi 100 record in {DATA_FILE.name}, trovati {len(people)}")

    conn = psycopg2.connect(get_database_url())
    conn.autocommit = False
    cur = conn.cursor()

    try:
        cur.execute('SELECT count(*) FROM "user";')
        existing = cur.fetchone()[0]
        if existing > 0:
            sys.exit(
                f'La tabella "user" ha gia\' {existing} righe. '
                "Questo script presuppone un database vuoto (vedi CLAUDE.md, "
                "pulizia del 2026-09-06). Svuotala prima di rilanciarlo, se e' "
                "davvero quello che vuoi fare."
            )

        cur.execute("SELECT id FROM category;")
        valid_categories = {row[0] for row in cur.fetchall()}

        inserted_users = 0
        inserted_pills = 0

        for person in people:
            if person["category"] not in valid_categories:
                sys.exit(f"Categoria sconosciuta: {person['category']}")

            user_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO "user"
                    (id, name, email, email_verified, username, display_username,
                     first_name, last_name, birth_date, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    person["name"],
                    person["email"],
                    True,  # email_verified: richiesto da canPublish()
                    person["username"],
                    person["username"],
                    person["firstName"],
                    person["lastName"],
                    person["birthDate"],
                    person["createdAt"],
                    person["createdAt"],
                ),
            )
            inserted_users += 1

            pill_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO pill
                    (id, author_id, category_id, title, body, format, sources,
                     is_public, published_at, save_count, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    pill_id,
                    user_id,
                    person["category"],
                    person["title"],
                    person["body"],
                    "text",
                    Json([]),
                    True,  # is_public
                    person["publishedAt"],
                    person["saveCount"],
                    person["publishedAt"],
                    person["publishedAt"],
                ),
            )
            inserted_pills += 1

        conn.commit()
        print(f"Inseriti {inserted_users} utenti e {inserted_pills} pillole pubbliche.")

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
