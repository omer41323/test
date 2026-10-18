# Fusion — Hebrew interactive learning guide

Static HTML/CSS/JavaScript application. Import this repository into Vercel; vercel.json supplies the output directory and validation command. No database or application server is required.

Run checks: `npm test`. Progress is stored in browser localStorage and does not automatically transfer between domains. The existing Sites login protection does not transfer with these static files; configure Vercel access protection before publishing if private access is required.

Learning references and icon provenance are included in dist/reference.js and icon-sources.json. This is an educational UI simulation, not a CAD engine.
