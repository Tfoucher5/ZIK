---
name: migration
description: Écrit et applique une migration Supabase pour ZIK (nouvelle table, colonne, index, politique RLS, fonction SQL, déplacement de schéma) selon les règles du projet, et la teste sur la base de staging. Utilise ce skill dès qu'une tâche demande de changer la structure de la base, même une seule colonne, au lieu d'écrire du SQL à la main ou de modifier la base directement.
argument-hint: "[changement de schéma voulu]"
allowed-tools: Bash(ls *) Bash(git status *)
---

# Migration Supabase

Changement demandé : $ARGUMENTS

Dernières migrations du dépôt : !`ls -1 supabase/migrations 2>/dev/null | tail -8 || true`

Les règles de la base sont dans le skill `zik-supabase` : charge-le si ce n'est pas déjà fait. Les gabarits SQL sont dans `.claude/skills/zik-supabase/references/templates.sql`.

## Étapes

1. **Regarder la vraie base, sur le staging.** Structure actuelle des tables concernées (MCP Supabase `list_tables` avec `verbose: true` sur le projet de staging), politiques existantes, et conseillers de sécurité et de performance (`get_advisors`) pour avoir un « avant ».
2. **Écrire le fichier** `supabase/migrations/<AAAAMMJJHHMMSS>_<sujet>.sql` (horodatage UTC du moment, sujet en snake_case), avec :
   - en tête, en commentaire : ce que fait la migration, pourquoi (item du plan), et comment la défaire ;
   - la table dans le schéma de son domaine, RLS activé, droits explicites pour `anon`, `authenticated` et `service_role` ;
   - un index par clé étrangère (un `create index concurrently` va dans sa propre migration) ;
   - toute fonction en `security invoker`, ou en `security definer` avec `set search_path = ''`, noms qualifiés, vérification de l'appelant et `revoke execute` adapté.
3. **Relire contre la checklist** :
   - [ ] RLS activé sur chaque nouvelle table
   - [ ] `(select auth.uid())` partout, jamais `auth.uid()` nu
   - [ ] aucune fonction appelable par `anon` sans raison écrite en commentaire
   - [ ] chaque clé étrangère indexée
   - [ ] migration idempotente quand c'est possible (`if not exists`)
   - [ ] aucune donnée de prod supprimée sans sauvegarde prévue
4. **Appliquer sur le staging**, après confirmation de Théo (MCP `apply_migration` sur le projet de staging, jamais sur `ZIK` en prod). Puis relis les conseillers : tout nouvel avertissement se corrige dans la même migration. Une fois la migration appliquée, fusionne sa PR **avant toute autre** : tant que son fichier n'est pas dans `develop`, le job `migrations` échoue sur chaque autre fusion et Railway `[DEV]` ne déploie pas.
5. **Code qui suit.** Liste les fichiers à adapter : nom de schéma (`getAdminClient().schema("salon")`), types, requêtes. Si le code et la migration doivent partir ensemble, ils vont dans la même PR.
6. **Tests.** Si la migration change ce que le code lit ou écrit, les tests du service concerné sont mis à jour (client Supabase simulé).

La prod reçoit la migration par la CI au merge sur `master`. Ne propose jamais de l'appliquer à la main.
