# Postmortem: settlement file arrived 3 hours late

The nightly settlement job waited on a lock that a migration never released. We
noticed at 06:10 when the reconciliation dashboard stayed flat. The fix was a
timeout on the lock and an alert on the dashboard itself, not on the job.

What I would do differently: page on the absence of data, not on errors. The job
never errored. It just waited.
