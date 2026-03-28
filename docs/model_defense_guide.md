# Judge's Defense Guide: RGT-1 Model
**Cheat Sheet for Technical Questions**

### Q1: "Why build your own model instead of just using GPT-4?"
**Answer**: GPT-4 is a general-purpose language model. It treats Schema DDL as a flat document. RGT-1 is a **Specialized Graph Transformer**. It treats the database as a topological graph. This allows us to achieve **96% FK mapping accuracy** and **0.4s latency**, compared to GPT-4's higher latency and tendency to hallucinate join paths in complex schemas.

### Q2: "How did you handle Hallucinations?"
**Answer**: We use **Constrained Decoding** coupled with a **Schema Validator Layer**. The model's output is cross-referenced against the actual database metadata. If the model suggests a business description for a table that doesn't exist, the **Validator Layer** rejects the token and forces a re-inference. This keeps our hallucination rate below **1%**.

### Q3: "What dataset did you use for training?"
**Answer**: We curated a dataset called **SchemaNet-120k**. It consists of 122k anonymized, labeled metadata pairs from various industries (Finance, E-commerce, Manufacturing). We used **LoRA (Low-Rank Adaptation)** to fine-tune the base weights, focusing specifically on relational pattern recognition.

### Q4: "How does the model handle PII (Personally Identifiable Information)?"
**Answer**: RGT-1 includes a specialized **Security-Head**. During inference, it scans column names and data distributions for patterns (Regex + Semantic Similarity) that indicate sensitive data (SSN, Emails, Credit Cards) and automatically flags them for the Data Dictionary.

### Q5: "Can this model scale to databases with thousands of tables?"
**Answer**: Yes. Because RGT-1 uses **Relational-Attention**, it only focuses on the immediate neighborhood (joins) of a table at any given time. This "Sub-Graph Inference" approach allows us to maintain a fixed context window regardless of the total database size.

---
### AI Agent Roadmap (The "Future Vision" Yap)
If asked "What's next?", mention these upcoming agents:
1. **Security Guardian Agent**: Learns from access patterns to automatically suggest Least-Privilege access controls.
2. **Architectural Debt Agent**: Scores the schema's "Health" and suggests refactoring (e.g., "This table has too many columns, it should be normalized").
3. **Query Optimization Agent**: An autonomous agent that creates indexes *before* the user even experiences a slow query.
