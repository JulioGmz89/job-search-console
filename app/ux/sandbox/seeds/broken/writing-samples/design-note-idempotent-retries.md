# Design note: idempotent retries for payouts

Every payout request now carries a key the client generates. The service stores
the key with the outcome, and a retry with the same key returns the stored
outcome instead of paying twice. It costs one table and one index. It removed a
whole class of incident.
