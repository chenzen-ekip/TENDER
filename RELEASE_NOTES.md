# 🚀 Tender Copilot - Release Notes (v1.0.0)

**Date :** 20 Décembre 2024
**Statut :** Production Ready (MVP)

Le système Tender Copilot a évolué d'une simple écoute de marché vers un véritable assistant de réponse automatisé.

## ✨ Nouvelles Fonctionnalités (Phase 3)

### 1. 🤖 L'Orchestrateur (DCE Capture)
- **Scraping Intelligent** : Récupération automatique des URL de téléchargement sur les profils acheteurs (via `puppeteer-core`).
- **Tri IA** : Analyse et catégorisation des fichiers du ZIP en 3 classes :
  - 📂 **ADMINISTRATIF** (RC, CCAP, DC1...)
  - 🏗️ **TECHNIQUE** (CCTP, Plans, DPGF...)
  - 💰 **FINANCIER** (BPU, DQE...)
- **Stockage** : Gestion locale des fichiers pour un accès rapide.

### 2. 🧠 Analyse Deep Dive
- L'IA lit désormais le **Règlement de Consultation (RC)** en profondeur.
- **Extraction Structurée** :
  - ⚖️ Pondération des critères (Prix/Technique).
  - 📋 Liste exacte des pièces à fournir.
  - 📅 Dates clés et contacts.

### 3. ✍️ Le Rédacteur (Response Generator)
- **Génération One-Click** de documents Word (.docx) :
  - **Lettre de Candidature** : Pré-remplie avec les infos client (SIRET, CA) et les exigences du marché.
  - **Mémoire Technique** : Une trame vide mais structurée selon le plan spécifique du CCTP détecté par l'IA.

### 4. 🖥️ Nouvelle Interface "Opportunité"
- **Barre d'actions** : Bouton unique pour lancer tout le processus.
- **Feedback Temps Réel** : Barre de progression et statuts clairs.
- **Téléchargements** : Accès direct aux brouillons générés.

---

## 🛠️ Tech Stack Updates
- **Backend** : Next.js Server Actions (`captureDCE`, `generateDraftResponse`).
- **IA** : Mix `gpt-4o-mini` (Tri rapide) et `gpt-4o` (Analyse précise).
- **Doc Gen** : `docx` library pour la création de fichiers Word.
- **Infra** : Optimisation Lambda (Puppeteer-core).

## ⚠️ Known Issues
- **Windows Dev** : `prisma generate` peut nécessiter un redémarrage manuel du serveur de dev dû au file locking.
- **Scraper** : Certains profils acheteurs complexes avec Auth peuvent nécessiter une future mise à jour (Phase 4).
