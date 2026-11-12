# Medical reference library

Source: MedlinePlus, National Library of Medicine.

`medical-knowledge.json` contains English **health topic summaries**, titles,
aliases, original URLs, and import provenance from the official MedlinePlus XML
dataset: https://medlineplus.gov/xml.html

Health topic summaries are public domain under
https://medlineplus.gov/about/using/usingcontent/ . The importer does not copy
licensed drug monographs, A.D.A.M. encyclopedia articles, or images. NLM does
not endorse HealthBuddy. These references support educational answers; they
are not a complete clinical knowledge base or a diagnostic system.

Refresh manually with `python3 scripts/import-medlineplus.py`, review the data
diff, run `npm test`, and redeploy. The source URL and import date are recorded
in the JSON. Production uses the checked-in snapshot and does not download
the corpus on each request. Review and refresh regularly as guidance changes.

The server ranks relevant topics using title/alias weighting and BM25-style
term scoring. It sends up to three summaries to the AI alongside relevant website
guide. The interface labels them as related references, not proof that every
generated statement is supported. The existing medicines seed data is not
treated as independently verified clinical guidance.
