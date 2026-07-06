# Platform Operations & Runbooks

Operational runbooks for standard and emergency management tasks.

## Disaster Recovery Execution
If a complete region or database failure occurs, execute the following recovery steps:
1. Locate the latest backup archive tarball in `/var/backups/chaindeploy/`.
2. Run the restore script:
   ```bash
   ./infra/backup/restore.sh /var/backups/chaindeploy/backup-archive.tar.gz
   ```
3. Verify connection by querying database logs:
   ```bash
   docker logs chaindeploy-postgres
   ```

## Queue Overflows (BullMQ / Redis)
If the worker processing queue accumulates backlogs or hits limits:
1. Scale up builder/deployer replicas:
   ```bash
   kubectl scale deployment builder-prod -n chaindeploy-apps --replicas=5
   ```
2. Verify queue sizes inside the Grafana Overview dashboard.
