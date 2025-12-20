# Configuration du Cron Job

## Fréquence recommandée : **Toutes les 12 heures**

### Pourquoi 12h ?
- Fenêtre de récupération : **2 jours**
- Volume par exécution : **~500 marchés** (5 batches × 100)
- Temps d'exécution : **~15-20 secondes**
- ✅ **Compatible avec plan Vercel gratuit** (timeout 10s avec edge functions, 60s avec pro)

### Configuration sur Vercel

**Option 1: Vercel Cron (recommandé)**

Ajoutez dans `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sourcing",
      "schedule": "0 */12 * * *"
    }
  ]
}
```

**Schedule breakdown:**
- `0 */12 * * *` = Toutes les 12 heures (à 00:00 et 12:00 UTC)
- Alternative `0 6,18 * * *` = À 6h00 et 18:00 UTC (7h & 19h heure française)

**Option 2: Cron-job.org (externe)**

1. Créez un compte sur https://cron-job.org
2. Ajoutez un job avec :
   - URL : `https://votre-app.vercel.app/api/cron/daily-sourcing`
   - Fréquence : Toutes les 12 heures
   - Header : `Authorization: Bearer ${CRON_SECRET}` (si activé)

**Option 3: GitHub Actions**

Créez `.github/workflows/cron.yml` :

```yaml
name: Tender Sourcing Cron

on:
  schedule:
    - cron: '0 */12 * * *'  # Toutes les 12h
  workflow_dispatch:  # Permet déclenchement manuel

jobs:
  trigger-sourcing:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cron job
        run: |
          curl -X GET https://votre-app.vercel.app/api/cron/daily-sourcing \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Métriques attendues

Avec cette configuration :
- **Exécutions** : 2× par jour
- **Marchés scannés** : ~1000/jour (500 × 2)
- **Couverture temporelle** : 2 jours glissants
- **Garantie** : ✅ Aucun marché raté si publié dans les dernières 48h

## Monitoring

Vérifiez les logs Vercel après chaque exécution pour confirmer :
```json
{
  "success": true,
  "stats": {
    "sourcing": 2+,  // Marchés détectés
    "analysis": 2+,  // Analyses AI complétées  
    "notifications": 2+,  // Emails envoyés
    "errors": 0
  }
}
```
