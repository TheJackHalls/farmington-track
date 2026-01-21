\# Data Model (MVP)



\## Canonical event keys

100,200,400,800,1600,3200,110H,100H,300H,4x100,4x200,4x400,4x800,LJ,TJ,HJ,PV,SP,DT,JT



\## Required files in /data

\- event\_meta.json

\- meets.json

\- athletes.json

\- performances.json

\- records\_school.json



\## Rules

\- Prelims/finals stored as separate performances

\- PR/leaderboards use best mark logic

\- DNS/DNF/NM/FOUL do not count for PR/records

\- Wind > +2.0 => not record-legal (still stored)



