# PRAHARI

**Predictive Intelligence Engine for Cyber-Fraud Cash-Out Interception**

> **Smart India Hackathon 2026** | **Problem Statement ID:** 26184

PRAHARI is a continuous-time, graph-based predictive analytics pipeline that converts a cyber-fraud complaint into a live, explainable prediction of *which money-mule path is active, where the cash-out is likely to happen, and when intervention is most valuable*.

## 🚨 The Golden Hour Deficit
Fraudsters route stolen funds rapidly across multiple layers of mule accounts and banks before withdrawing it as physical cash. Current response systems are reactive, identifying accounts after transactions settle. PRAHARI aims to shift this to **pre-withdrawal prevention** by forecasting the next cash-out location in real-time.

## 🔑 Key Features
- **Dynamic Ingestion:** Ingest NCRP complaints and transaction streams in real-time.
- **Topological Mapping:** Build a multi-hop temporal graph connecting accounts, VPAs, devices, and terminals.
- **Mule Identification:** Self-supervised detection of newly activated mule accounts using GCPAL-inspired modeling.
- **Spatial-temporal Projection:** Continuous-time forecasting of cash-out likelihood using Group Attention Neural Hawkes Processes (GAttNHP).
- **Automated Mitigation:** Generates H3 spatial cell alerts, time-to-withdrawal intervals, and risk-tiered actionable alerts.
- **Privacy-Preserving:** Federated learning design allowing banks to collaborate on fraud detection without centralizing raw ledgers.

## 🏗️ Repository Structure
- `/docs`: Contains detailed project briefs, architectural designs, and AI context instructions.
- `/src`: Minimal codebase structure for the backend and frontend components.

## 🚀 Getting Started
(Detailed setup instructions for the backend and frontend to be added as development progresses.)

Please check out [`architecture.md`](architecture.md) for an in-depth system design overview, and [`claude.md`](claude.md) for AI-assisted development instructions.
