---
name: incident
description: Lance l'enquête de l'agent incident sur un problème de production ZIK (salon qui plante, musique qui ne joue pas, site lent, alerte, plainte d'un client) et rapporte chronologie, cause probable et actions. Utilise ce skill dès qu'un problème en prod est signalé, même vaguement (« ça a planté hier soir chez un client »).
argument-hint: "[symptôme, heure, client ou salon]"
context: fork
agent: incident
background: false
allowed-tools: Bash(git log *) Bash(date *)
---

Enquête sur cet incident de production ZIK : $ARGUMENTS

- Maintenant, à Paris : !`TZ=Europe/Paris date '+%A %d/%m/%Y %H:%M' 2>/dev/null || true`
- Derniers commits de master : !`git log origin/master -10 --format='%h %ad %s' --date=format:'%d/%m %H:%M' 2>/dev/null || true`

Projet Railway « ZIK - Blind Tests », environnement `[PROD] - Production`, service `ZIK`. Projet Supabase de prod : `ZIK` (`fbeubmwhxytniohodlgr`), en lecture seule.

Suis ta méthode et rends le rapport au format prévu. Aucune action en prod.
