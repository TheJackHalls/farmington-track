\# Farmington Track \& Field Website



\## Purpose

A modern, fast team website that makes it easy to find athlete marks, meet results, leaderboards, and coach announcements.



\## MVP (must ship first)

\- Public pages: Home, Announcements, Results (meet list + meet page), Leaderboards, Athlete page

\- Data stored as JSON in /data and served statically (GitHub Pages)

\- Admin Import (MVP): parse (A) AthleticNet CSV upload and (B) RunnerCard “All Overall Results” pasted text, show preview + flagged items, export updated /data as a downloadable ZIP

\- School record updates require explicit approval (never auto-update)



\## Non-goals (NOT in MVP)

\- OAuth/login, GitHub PR creation, direct commits

\- Full-meet ingestion for non-Farmington teams

\- Relay lineup by athlete

\- State record automation



\## Stack (locked)

Astro + TypeScript + Tailwind. No backend.



\## Data Sources

\- AthleticNet/Athletic.net CSV exports

\- RunnerCard pasted “All Overall Results” text



