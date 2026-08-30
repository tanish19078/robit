# AI Agent Context (Claude / Antigravity)

Welcome to the PRAHARI project repository! This document provides context to help AI agents understand the codebase, the domain, and the goals when generating code or answering queries.

## 🎯 Project Mission
PRAHARI is a predictive intelligence engine built for the Smart India Hackathon 2026 (Problem Statement 26184). Its goal is to intercept cyber-fraud cash-outs by tracking stolen money through multi-hop mule networks and forecasting the exact spatial cell (H3) and time window for withdrawal.

## 📚 Domain Context
- **NCRP / 1930 / I4C:** National Cybercrime Reporting Portal. The source of our fraud complaints.
- **Mule Accounts:** Intermediary accounts used by fraudsters to quickly route and split funds.
- **Cash-out Points:** ATMs, micro-ATMs, and POS terminals where digital funds are converted to physical, untraceable cash.
- **The Golden Hour:** The crucial ~30-minute window post-complaint where the money is still in digital transit.

## 🛠️ Technology Stack Rules
When implementing or modifying code, prefer the following stack:
1. **Frontend:** React, Deck.gl, Mapbox GL (for H3 visualization).
2. **Gateway API:** Node.js, Express, WebSocket (for real-time dashboard events).
3. **ML Backend API:** Python, FastAPI.
4. **Machine Learning:** PyTorch, PyTorch Geometric (for Temporal Graphs and GCPAL), Hawkes Processes for forecasting.
5. **Data Streaming:** Kafka or Redis Streams.
6. **Database:** PostgreSQL.

## 🧑‍💻 Coding Guidelines
- **Modularity:** Keep ML services strictly separate from Gateway/Frontend logic. Connect them via API or Message Queue.
- **Simulations:** Since real financial data is sensitive, all prototype implementations should utilize synthetic data generators (e.g., AMLSim). Explicitly mark simulations in code.
- **No Blocking Defaults:** The system is for decision-support. Do not write autonomous execution code that automatically freezes accounts without human-in-the-loop review.
- **Explainability:** Ensure all AI outputs (predictions, risk scores) return robust evidence payloads for analysts.
