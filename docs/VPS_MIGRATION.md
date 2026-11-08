# Migrating ChekUp247 to a new VPS

Uses `scripts/backup-full.sh` (old server) and `scripts/restore-full.sh` (new server).

## What lives where (and therefore what must be moved)

| Data | Location on the VPS | Included in `backup-full.sh` |
|---|---|---|
| Operational DB | Docker volume `operational_pg_data` | yes (`pg_dump`) |
| Patient DB | Docker volume `patient_pg_data` | yes (`pg_dump`) |
| Uploaded documents / prescriptions | MinIO volume `minio_data` | yes |
| Job queues | Redis volume `redis_data` | yes |
| TLS certificates | Caddy volume `caddy_data` | yes |
| Secrets & config | `/opt/chekup247/.env.production` (+ `.env` if used) | yes |
| Code, Caddyfile, compose files | Git repo | no — re-cloned |
| Docker images | `ghcr.io` | no — re-pulled |

> The `.env.production` secrets (`JWT_SECRET`, DB passwords, Paystack/Daily/Brevo keys…) must be carried over
> unchanged, otherwise existing sessions and encrypted data stop working.

## Procedure

### 0. Prepare (a day before)
- Lower the **TTL of the A records** (chekup247.com, www, doctor, admin, api, storage) to 300s so cutover is quick.
- Provision the new VPS (Ubuntu 22.04/24.04, same or larger disk than the old one).

### 1. Prepare the new VPS
```bash
git clone https://github.com/bluebridgetechnology/chekup247.git /opt/chekup247
cd /opt/chekup247
sudo bash scripts/setup-vps.sh
docker login ghcr.io -u <github-user>   # only if images are private (use the GHCR_PAT)
```

### 2. Rehearsal backup (old VPS, no downtime)
```bash
cd /opt/chekup247 && sudo bash scripts/backup-full.sh
```
Copy to the new server and restore (step 4) to confirm everything works while production stays live.
Test with a hosts-file entry pointing the domains at the new IP.

### 3. Final backup (old VPS, short downtime)
`--quiesce` stops the API during the backup so the databases and MinIO are consistent with each other.
```bash
cd /opt/chekup247 && sudo bash scripts/backup-full.sh --quiesce
```
Transfer (run on the old VPS, or pull from the new one):
```bash
rsync -avP --partial /var/backups/chekup247-migration/chekup247-backup-*.tar* root@NEW_VPS_IP:/root/
```

### 4. Restore (new VPS)
```bash
cd /opt/chekup247
sudo bash scripts/restore-full.sh /root/chekup247-backup-<timestamp>.tar
```
Options: `--no-certs` (let Caddy request fresh certificates), `--force` (overwrite DBs that already contain tables).

### 5. Verify before switching DNS
Add to your laptop's hosts file: `NEW_IP chekup247.com doctor.chekup247.com admin.chekup247.com api.chekup247.com storage.chekup247.com`
- Log in as a doctor and a patient, open an existing patient chart and an uploaded document/prescription.
- `docker compose -f docker-compose.prod.yml ps` — all containers healthy.
- `docker logs chekup-api --tail 100` — no DB/Redis/MinIO errors.

### 6. Cut over
1. Update the A records to the new IP.
2. Update the GitHub Actions secret **`VPS_HOST`** (and `VPS_SSH_KEY` / `VPS_USER` / `VPS_SSH_PORT` if they differ) so
   deploys go to the new server. Add the new server's public key to the secret's key pair.
3. Run a deploy from GitHub (`workflow_dispatch`) to confirm the pipeline reaches the new VPS.
4. Check `docker logs chekup-caddy` — certificates should be valid (restored, or newly issued once DNS resolves).

### 7. Decommission
Keep the old VPS stopped but intact for a few days as a rollback. Then:
- delete the backup archives from **both** servers (`shred -u` / `rm`) — they contain patient data and secrets;
- destroy the old VPS and restore the DNS TTLs.

## Rollback
Point the A records back at the old VPS and `docker compose -f docker-compose.prod.yml start api` there
(the `--quiesce` backup stops the API, and it is restarted automatically at the end of the backup).
Any data written on the new server after cutover would need exporting before rolling back.

## Notes
- Backups are **not encrypted at rest**. They are mode `600`; transfer them only over SSH.
- `scripts/backup-db.sh` (existing) is a DB-only cron-style backup; it defaults to port 5432 on the host, but in
  production the databases are published on `127.0.0.1:5434` (operational) and `127.0.0.1:5433` (patient).
  For routine scheduled backups, run `backup-full.sh` from cron (e.g. nightly) and copy the result off-server.
- `DB_SYNCHRONIZE=true` in `.env.production` lets TypeORM auto-alter tables on API start. Since the restore brings
  the schema with it, consider setting it to `false` after a successful migration.
