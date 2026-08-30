# PRAHARI

## Predictive Analytics Framework for Cybercrime Cash-Withdrawal Forecasting

**Hackathon:** Smart India Hackathon 2026  
**Project type:** AI/ML, financial cybercrime prevention, real-time decision support

> PRAHARI is an end-to-end predictive cybercrime response system that forecasts where and when stolen money is likely to be withdrawn, giving banks and law-enforcement agencies time to intervene during the critical post-incident window.

---

## Executive Summary

Online fraud does not end when money leaves a victim's account. Fraudsters rapidly route the funds through several accounts, devices, virtual payment addresses, and banks before converting the money into physical cash through ATMs or micro-ATM/POS points.

Current response systems are largely reactive: a complaint is processed, accounts are identified, and a lien or debit freeze is attempted after transaction records become available. By that time, the money may already have been withdrawn.

PRAHARI adds a predictive layer to this workflow. It combines:

1. Real-time complaint and transaction ingestion.
2. Dynamic multi-hop transaction-graph tracing.
3. Self-supervised detection of previously unknown money-mule accounts.
4. Continuous-time prediction of likely cash-withdrawal locations.
5. Probabilistic estimation of the time-to-withdrawal window.
6. Automated alerts for banks, cyber cells, and nearby field officers.

The goal is to move intervention from **post-withdrawal investigation** to **pre-withdrawal prevention**.

---

## 1. Problem Statement

### 1.1 Background

The National Cybercrime Reporting Portal (NCRP), operated under the Indian Cyber Crime Coordination Centre (I4C), provides a centralized channel for citizens to report cybercrime. The Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS) connects citizens, law-enforcement agencies, banks, and financial institutions.

The operational scale creates a difficult response problem:

| Indicator | Reported scale in the proposal |
| --- | ---: |
| Approximate complaints received daily | 8,000 |
| NCRP complaints recorded between FY 2023–24 and FY 2025–26 | 5.38 million+ |
| Financial fraud amount involved | More than ₹56,087 crore |

### 1.2 The fraudster's playbook

After a victim reports a fraud, the stolen amount is commonly:

1. Transferred from the victim account to a first-layer beneficiary account.
2. Split and routed through second- and third-layer mule accounts.
3. Moved across banks using UPI, IMPS, or other rapid payment channels.
4. Withdrawn as cash from an ATM, micro-ATM, or local POS merchant.

These accounts are known as **money-mule accounts** because they temporarily carry or move illicit funds for the larger fraud network.

### 1.3 The Golden Hour deficit

The most important response window is the period immediately after the fraud is reported. In the proposed operating model, the funds may pass through three to five layers within approximately 30 minutes.

The main bottlenecks are:

- Transaction routing is multi-hop and difficult to trace manually.
- New mule accounts may not appear in existing blacklists.
- The exact cash-out terminal is unknown until after withdrawal.
- Existing rules often describe past activity instead of forecasting the next event.
- Physical cash withdrawal makes recovery extremely difficult or impossible.

### 1.4 Objective

PRAHARI will predict:

| Question | PRAHARI output |
| --- | --- |
| **Where?** | A ranked list of likely ATM, micro-ATM, or POS hotspots represented by H3 spatial cells |
| **When?** | A calibrated time-to-withdrawal interval, such as 15–45 minutes |
| **Who?** | Suspicious accounts, devices, VPAs, and transaction-network nodes |
| **What action?** | Bank lien requests, step-up authentication, LEA alerts, and patrol dispatch |

---

## 2. Proposed Solution

PRAHARI is a continuous-time, graph-based predictive analytics pipeline. It turns a newly reported complaint into an actionable risk forecast:

~~~mermaid
flowchart TD
    A["Citizen complaint via NCRP / 1930"] --> B["Real-time ingestion"]
    B --> C["Dynamic transaction graph"]
    C --> D["Self-supervised mule detection"]
    D --> E["Neural Hawkes forecast over H3 cells"]
    E --> F{"Risk above threshold?"}
    F -->|Yes| G["Bank interdiction and ATM step-up"]
    F -->|Yes| H["LEA heatmap alert and patrol dispatch"]
    F -->|No| I["Continue background monitoring"]
    G --> J["I4C registry enrichment"]
    H --> J
~~~

### Core idea

Instead of waiting for a confirmed withdrawal, the system learns the relationship between:

- The structure of the transaction graph.
- The timing and amount of recent transfers.
- The identity and behavior of involved accounts and devices.
- The geography of nearby cash-out terminals.
- Earlier withdrawal events in the same network.

It then produces a ranked prediction and confidence interval that can be acted upon by authorized institutions.

---

## 3. Technical Methodology

| Stage | Operational function | Technical engine |
| --- | --- | --- |
| **1. Dynamic ingestion** | Ingest NCRP complaint webhooks, ISO 20022/UPI transaction streams, and I4C suspect-registry signals. | Apache Kafka, Apache Flink, PySpark |
| **2. Topological mapping** | Build a multi-hop temporal graph connecting accounts, VPAs, devices, transactions, and terminals. | Heterogeneous Temporal Graph Transformer (HTGT), PyTorch Geometric |
| **3. Mule identification** | Detect unlabelled or newly activated mule accounts without depending only on historical fraud labels. | Graph Contrastive Pre-training for Anti-Money Laundering (GCPAL) |
| **4. Spatial-temporal projection** | Estimate how recent events increase the likelihood of a future withdrawal. | Group Attention Neural Hawkes Process (GAttNHP) |
| **5. Spatial binning** | Convert terminal coordinates into consistent, high-resolution geographic cells. | Uber H3, GeoPandas |
| **6. Automated mitigation** | Convert high-risk predictions into bank, terminal, dashboard, and patrol actions. | Webhook router, risk engine, React dashboard, CAD/API integrations |

### 3.1 Dynamic graph representation

Each transaction is represented as a time-stamped edge in a heterogeneous graph:

- **Nodes:** bank accounts, VPAs, mobile numbers, devices, IP addresses, ATMs, POS terminals, and locations.
- **Edges:** transfers, shared devices, shared identifiers, common beneficiaries, and cash withdrawals.
- **Attributes:** amount, timestamp, channel, bank, account age, velocity, device information, and geospatial context.

The graph is updated as new events arrive so that the system can follow funds across Layer-1, Layer-2, and Layer-N accounts.

### 3.2 Self-supervised mule detection

Historical labels are incomplete because new mule accounts are activated frequently. GCPAL creates multiple augmented views of the same transaction graph:

- A structurally perturbed graph.
- A temporally perturbed graph.
- A K-nearest-neighbour attribute graph.

Accounts that remain structurally and behaviorally similar across these views receive similar embeddings. Suspicious nodes can then be ranked using their embedding, transaction velocity, graph position, and proximity to known-risk entities.

### 3.3 Continuous-time withdrawal forecasting

The Hawkes-process component models withdrawals as events whose probability changes over time. A recent transfer, a previous cash-out, or a burst of activity can temporarily increase the intensity of a future withdrawal.

The model produces:

- A spatial risk surface.
- A ranked list of likely terminals or H3 cells.
- A time-to-withdrawal distribution.
- A confidence score for each alert.

### 3.4 Privacy-preserving collaboration

Banks should be able to improve a shared fraud-detection model without exposing raw customer ledgers. PRAHARI therefore includes a federated-learning design in which:

- Each institution trains locally on its own records.
- Updates are clipped and protected with differential privacy.
- Secure aggregation prevents other parties from inspecting individual updates.
- Homomorphic encryption or secure multi-party computation can be used for sensitive aggregation.

---

## 4. Mathematical Formulations

The equations below use Unicode and plain-text notation so they remain readable in Markdown viewers that do not support LaTeX or MathJax.

### 4.1 GCPAL contrastive loss

For an account **u**, let **hᵤ⁽¹⁾** and **hᵤ⁽²⁾** be embeddings generated from two augmented graph views. The contrastive objective is:

~~~text
L_GCPAL = −log(
  exp(sim(hᵤ⁽¹⁾, hᵤ⁽²⁾) / τ)
  ─────────────────────────────────────────────────────────────
  Σᵥ∈V exp(sim(hᵤ⁽¹⁾, hᵥ⁽²⁾) / τ)
)
~~~

where:

- **sim(·, ·)** is a similarity function, typically cosine similarity.
- **τ** is a temperature parameter.
- **V** is the set of graph nodes used as comparison candidates.

### 4.2 Continuous-time spatial intensity

The conditional intensity of a withdrawal at location **x**, time **t**, and terminal type **k** is modeled as:

~~~text
λₖ(t, x | Hₜ) = f(
  μₖ(x)
  + Σᵢ: tᵢ < t [
      αₖ,ₖᵢ · κ_spatial(x − xᵢ) · e^(−βₖ,ₖᵢ(t − tᵢ))
    ]
  + W_attn · h_history(t)
)
~~~

where:

- **μₖ(x)** is the baseline spatial risk density.
- **κ_spatial** is a spatial decay kernel.
- **αₖ,ₖᵢ** controls cross-terminal excitation.
- **βₖ,ₖᵢ** controls temporal decay.
- **h_history(t)** is the hidden representation of recent event history.
- **f** maps the result to a non-negative intensity.

An example Gaussian spatial kernel is:

~~~text
κ_spatial(x − xᵢ) = 1 / (2πσ²) · e^(−||x − xᵢ||² / (2σ²))
~~~

### 4.3 Differentially private update

For a local gradient update **gₖ(w)**, gradient clipping and Gaussian noise can be applied as:

~~~text
g̃ₖ(w) = gₖ(w) / max(1, ||gₖ(w)||₂ / C) + N(0, σ²C²I)
~~~

Here, **C** is the clipping threshold and **σ** controls the noise scale.

---

## 5. Research Foundations

The proposed architecture combines ideas from temporal point processes, graph representation learning, financial-crime analytics, and privacy-preserving machine learning.

| Research direction | Relevance to PRAHARI |
| --- | --- |
| **Group Attention Neural Hawkes Process (GAttNHP)** | Models continuous-time event sequences on temporal graphs and supports attention-based event-history representations. The proposal references arXiv:2607.14733 (2026). |
| **Graph Contrastive Pre-training for Anti-Money Laundering (GCPAL)** | Addresses label scarcity by learning account representations from augmented transaction-graph views. |
| **Federated financial fraud detection** | Combines federated learning, secure aggregation, homomorphic encryption, and differential privacy so institutions can collaborate without centralizing raw ledgers. |
| **Temporal relational analysis of criminal networks** | Supports dynamic graph modeling for following money movement through changing criminal or laundering networks. |
| **Neural point processes and quantile regression** | Provide the basis for continuous-time forecasting and calibrated time-to-event intervals. |

Before a final academic or hackathon submission, the team should verify the exact bibliographic metadata, authors, publication venue, and implementation availability for each cited work.

---

## 6. What Makes PRAHARI Unique

| Evaluation area | Conventional approach | PRAHARI approach | Practical advantage |
| --- | --- | --- | --- |
| **Spatial intelligence** | Historical density maps or static rules. | Continuous-time Hawkes intensity over geographic cells. | Forecasts where the next cash-out is likely to happen. |
| **Mule detection** | Existing blacklists and supervised labels. | Self-supervised graph contrastive learning. | Can surface newly activated or previously unlabelled mule accounts. |
| **Transaction reasoning** | Single-account or single-transfer checks. | Heterogeneous multi-hop temporal graph. | Captures the full movement path across accounts, banks, devices, and terminals. |
| **Time prediction** | Point estimates or manual heuristics. | Non-crossing quantile regression. | Produces calibrated and ordered time windows rather than a single brittle timestamp. |
| **Spatial resolution** | District, city, or pincode level. | Uber H3 resolution 8/9 cells. | Focuses alerts on small, operationally useful geographic areas. |
| **Data privacy** | Centralized raw banking data. | Federated learning with DP, SMPC, and HE options. | Allows collaboration while reducing exposure of sensitive records. |
| **Operational integration** | Isolated dashboard prototype. | Webhook-driven actions for banks, dashboards, and field response. | Connects prediction to a concrete intervention workflow. |

The core differentiator is the combination of **graph topology**, **continuous-time prediction**, **fine-grained geography**, and **automated response** in one workflow.

---

## 7. Technology Stack

| Component | Proposed technologies | Role |
| --- | --- | --- |
| **Data streaming** | Apache Kafka, Apache Flink, PySpark | Ingest and process high-throughput complaint and transaction events. |
| **Graph storage** | Memgraph, PyTorch Geometric GraphStore | Store and query multi-hop account and entity relationships. |
| **Graph ML** | PyTorch Geometric, DGL | Build HTGT encoders and GCPAL embeddings. |
| **Hawkes engine** | PyTorch, SciPy, custom C++ bindings where needed | Train and evaluate GAttNHP and time-prediction heads. |
| **Federated privacy** | Flower, PySyft, TenSEAL | Coordinate local training, secure aggregation, encryption, and DP. |
| **Geospatial processing** | Uber H3, h3-py, GeoPandas | Map terminal coordinates to H3 cells and generate spatial features. |
| **Backend/API** | FastAPI, Python, gRPC | Expose asynchronous ML and alerting services. |
| **Application gateway** | Node.js, Express, REST, WebSockets | Handle webhooks, dashboard sessions, and integration-facing services. |
| **Frontend dashboard** | React.js, Deck.gl, Mapbox GL | Display predictive heatmaps, graph context, alerts, and filters. |
| **Database** | PostgreSQL, PostGIS | Store terminal registries, cases, audit records, and geospatial data. |
| **Caching and queues** | Redis | Cache active alerts, risk scores, and short-lived event state. |
| **Deployment** | Docker, Linux, CI/CD pipeline | Package services and reproduce the prototype environment. |

### Prototype data boundary

The prototype should use:

- IBM Synthetic AMLSim or an equivalent synthetic transaction dataset.
- OpenStreetMap data for ATM, bank, branch, and merchant coordinates.
- Simulated NCRP, bank, NPCI, I4C, and police-CAD webhooks.

Production deployment would require formal authorization, data-sharing agreements, security reviews, auditability, and institution-specific integration contracts.

---

## 8. End-to-End Operational Workflow

| Step | System phase | Executing component | Action |
| ---: | --- | --- | --- |
| **1** | Incident trigger | Citizen, NCRP, 1930 Helpline | A victim files a cybercrime complaint and provides transaction details. |
| **2** | API dispatch | NCRP webhook listener | The complaint, victim account, VPA, timestamp, amount, and available identifiers are forwarded to PRAHARI. |
| **3** | Stream processing | Kafka/Flink pipeline | Events are normalized, deduplicated, timestamped, and added to the live processing stream. |
| **4** | Graph tracing | PyG/HTGT engine | The engine expands the transaction path across Layer-1, Layer-2, and Layer-N beneficiary accounts. |
| **5** | Mule detection | GCPAL module | Account and entity embeddings are compared with known-risk patterns and peer structures. |
| **6** | Hotspot forecasting | GAttNHP engine | The system estimates withdrawal intensity **λₖ(t, x)** across H3 cells. |
| **7** | Arrival estimation | NCQ regression head | The system calculates a probabilistic time-to-withdrawal window, for example **Δt ∈ [15 min, 45 min]**. |
| **8** | Risk evaluation | Decision engine | The alert is escalated when predicted intensity exceeds the configured threshold **Θ_threshold**. |
| **9A** | Bank interdiction | CBS webhook router | Authorized destination institutions receive requests to place liens, freeze funds, or apply account controls. |
| **9B** | Terminal shielding | NPCI/switch integration | The relevant transaction path or terminal cluster can be assigned step-up authentication, subject to authorization and policy. |
| **10A** | LEA alert | React GIS dashboard | Cyber cells and authorized users see the predicted hotspots, confidence, time window, and graph evidence. |
| **10B** | Field dispatch | Police CAD/mobile integration | Nearby response units receive an encrypted alert containing the target H3 cell and predicted time window. |
| **11** | On-ground action | Field response units | Officers monitor or respond to the predicted terminal cluster during the forecast window. |
| **12** | Registry synchronization | I4C integration | Confirmed entities, devices, terminal IDs, and case evidence enrich the appropriate suspect registry. |

### Decision logic

- **Below threshold:** Continue monitoring and update the graph as new events arrive.
- **Above threshold:** Create an auditable alert, notify authorized systems, and begin the appropriate intervention workflow.
- **After resolution:** Record the outcome as feedback for evaluation and future model improvement.

---

## 9. System Architecture

~~~mermaid
flowchart LR
    A["NCRP, bank, I4C feeds"] --> B["Kafka / Flink"]
    B --> C["Graph and feature layer"]
    C --> D["GCPAL + HTGT"]
    D --> E["GAttNHP + NCQ"]
    E --> F["Risk API and dashboard"]
    F --> G["Banks, NPCI, LEAs"]
~~~

### Main layers

1. **Input layer:** Complaint, transaction, registry, device, and terminal data.
2. **Streaming layer:** Event ingestion, validation, ordering, and enrichment.
3. **Intelligence layer:** Temporal graph construction, mule detection, and withdrawal forecasting.
4. **Decision layer:** Thresholding, confidence calibration, evidence packaging, and audit logging.
5. **Action layer:** Banking controls, terminal controls, dashboards, and field alerts.
6. **Feedback layer:** Confirmed outcomes, false positives, recovery results, and model monitoring.

---

## 10. Implementation Roadmap

### Phase 1: Ingestion pipeline and synthetic benchmark

- Set up Kafka and stream-processing services.
- Ingest AMLSim or equivalent synthetic transaction logs.
- Collect ATM, micro-ATM, branch, and POS coordinates from OpenStreetMap.
- Convert terminal coordinates into H3 resolution 8 and 9 cells.
- Define a reproducible event schema for complaints, transfers, and withdrawals.

### Phase 2: Temporal graph engine and GCPAL

- Build heterogeneous graph data structures with PyTorch Geometric.
- Implement HTGT representations for multi-hop transfer sequences.
- Generate structural, temporal, and KNN graph augmentations.
- Train GCPAL embeddings to rank suspicious Layer-1, Layer-2, and Layer-N nodes.

### Phase 3: Neural Hawkes forecasting

- Implement the GAttNHP module in PyTorch.
- Encode continuous event history and temporal excitation decay.
- Add the NCQ regression head for ordered time-to-withdrawal intervals.
- Validate spatial-intensity predictions against synthetic cash-out events.

### Phase 4: Federated privacy stack

- Create decentralized training nodes with Flower or PySyft.
- Add gradient clipping and differential-privacy noise.
- Prototype secure aggregation with TenSEAL and/or SMPC.
- Compare accuracy and latency with a non-federated baseline.
- Target less than 2% performance variance from the centralized baseline.

### Phase 5: Dashboard and multi-agency integrations

- Build the React, Deck.gl, and Mapbox GIS dashboard.
- Provide historical-density and predictive-intensity map modes.
- Add FastAPI and Node.js services for simulated CBS, NPCI, I4C, and CAD webhooks.
- Generate an evidence package containing the graph path, model score, forecast window, and audit trail.

### Phase 6: Integration and deployment readiness

- Run end-to-end latency tests.
- Optimize stream processing, graph queries, and model inference.
- Validate performance on a held-out benchmark split.
- Prepare the interactive demo, architecture presentation, and technical documentation.

---

## 11. Evaluation Plan and Success Targets

| Metric | Prototype target |
| --- | --- |
| Complaint-to-alert latency | Less than 2 seconds for the simulated streaming path |
| Spatial prediction | More than 85% accuracy within the target H3 resolution-8 cell |
| Time-window calibration | Reliable coverage of the actual withdrawal event within the predicted interval |
| Mule-account ranking | Strong precision in the top-k suspicious-node list |
| Federated performance retention | Less than 2% variance from the non-federated baseline |
| Alert usefulness | Every high-risk alert contains a location, time window, confidence, and explanation |
| Auditability | Every automated action is linked to the originating case and model version |

The evaluation must report false positives, false negatives, calibration, latency, and the effect of class imbalance. Accuracy alone is not sufficient for a high-impact fraud-response system.

---

## 12. Potential Challenges and Mitigations

| Challenge | Risk | Mitigation |
| --- | --- | --- |
| **Limited labelled fraud data** | New mule accounts may not resemble historical labels. | Use GCPAL self-supervised learning, anomaly ranking, and analyst feedback. |
| **Cross-bank data silos** | A single institution may not see the complete fund path. | Use federated learning, secure aggregation, and privacy-preserving feature exchange. |
| **High false-positive cost** | Innocent accounts or busy ATM clusters may be flagged. | Use calibrated confidence, tiered intervention, human approval, and explainable evidence. |
| **Strict response latency** | Delayed inference can miss the withdrawal window. | Use streaming features, graph-window limits, caching, and asynchronous services. |
| **Sparse or inaccurate terminal data** | Incorrect coordinates reduce hotspot precision. | Maintain a verified terminal registry and fuse multiple geospatial sources. |
| **Concept drift** | Fraud patterns, devices, and cash-out locations change. | Monitor drift, retrain periodically, and feed confirmed outcomes back into the system. |
| **Integration and authorization** | Real CBS/NPCI/CAD actions need institutional approval. | Demonstrate the prototype with simulated webhooks and document production controls. |
| **Privacy and security** | Financial and identity data are highly sensitive. | Minimize data, encrypt in transit and at rest, enforce access control, and retain audit logs. |

---

## 13. Expected Impact

PRAHARI is designed to help stakeholders:

- Reduce the time between complaint registration and actionable intervention.
- Prioritize the most suspicious accounts and transaction paths.
- Identify likely cash-out locations before the withdrawal occurs.
- Coordinate banks, cyber cells, and field officers through a shared risk view.
- Reduce dependence on static blacklists and manual investigation.
- Create an evidence-backed, auditable response trail for every alert.

The system does not replace investigators or institutional decision-makers. It provides them with an earlier, more precise, and explainable prediction of where intervention may prevent irreversible cash liquidation.

---

## Conclusion

PRAHARI transforms cyber-fraud response from a reactive account-freezing process into a predictive, coordinated intervention system. Its novelty lies in connecting multi-hop transaction-graph analysis, self-supervised mule detection, continuous-time spatial forecasting, privacy-preserving collaboration, and real-world response workflows.

The prototype can be demonstrated safely with synthetic transactions, public geospatial data, and simulated institutional APIs, while the architecture remains extensible toward authorized production integrations.
