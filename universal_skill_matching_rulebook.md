# Universal Skill Matching Rulebook (USR) for Resume Shortlisting

## A) Executive Intent

### Problem Statement
In the context of automated resume shortlisting, a major class of false rejections occurs due to strict lexical matching of "must-have" skills. When a job description requires a generic language (e.g., JavaScript) but a highly qualified candidate's resume only lists related downstream technologies (e.g., React, Node.js, TypeScript), naive parsers confidently reject the candidate. This results in the loss of high-quality talent, degrades recruiter trust in the AI, and disproportionately impacts experienced candidates who often list specialized frameworks rather than foundational languages.

### Why False Rejections Happen
1. **Semantic Blind Spots:** Systems fail to understand that knowing a framework strictly implies knowledge of its underlying language.
2. **Naming Fragmentation:** Candidates use a massive variety of aliases, abbreviations, and vendor names (e.g., K8s vs. Kubernetes, AWS EC2 vs. Amazon Elastic Compute).
3. **Rigid Boolean Logic:** Must-have conditions are often evaluated as Boolean `AND` statements against raw extracted entities, missing implicit evidence.

### Non-Goals
- We are *not* evaluating candidate proficiency or coding ability.
- We are *not* parsing resumes for structure.
- We are *not* replacing the human interview process.

### Success Criteria and SLAs
- **False Rejection Rate due to Skill Synonymy:** Must be exactly 0%.
- **Precision on Inferred 'Must-Have' Skills:** >98% (Ensure we don't accidentally infer a skill when it is unrelated).
- **Explainability:** 100% of inferred skills must have a traceable path (e.g., "Inferred JavaScript via explicit skill React").

---

## B) Core Principles

1. **Semantic-First Matching:** We match the *concept*, not the string.
2. **Consistency:** If a skill implies another skill for scoring, it must also imply it for passing a hard gate.
3. **Deterministic & Explainable:** Every match decision must be traceable through an explicitly defined Graph/Ontology ruleset.
4. **Safety against False Positives:** We only use *strong* implications (Framework -> Language) for hard gates. Weak implications (Language -> Framework) are forbidden from overriding a hard gate.

---

## C) Formal Definitions

- **Canonical Skill:** The formally designated primary name of a technology (e.g., `Node.js`).
- **Alias:** An exact synonym that refers to the exact same Canonical Skill (e.g., `NodeJS`, `Node`).
- **Variant:** A version-specific or minor evolution that is treated as equivalent for coarse matching (e.g., `React 18`, `React.js`).
- **Parent/Child Skill:** A hierarchical relationship where the Child restricts or specializes the Parent.
- **Directional Implication:** The logical deduction that possessing Skill A guarantees knowledge of Skill B (`A -> B`).
- **Strong Implication:** Non-debatable prerequisites (e.g., `Django -> Python`). Satisfies Must-Haves.
- **Weak Implication:** Correlational or optional relationships (e.g., `React -> Redux`). Cannot satisfy Must-Haves.
- **Evidence Source:** Where the skill was found (e.g., "Skills Section", "Project Description").
- **Confidence Bands:** High, Medium, Low certainty of the skill extraction.
- **Hard Gate:** A Boolean requirement that must assess to True for the candidate to proceed.
- **Soft Score:** A numerical boost given for nice-to-have skills.

---

## D) Matching Policy Lifecycle

1. **Normalize:** Lowercase, strip special characters, trim whitespace.
2. **Canonicalize:** Map all string variants to their Canonical Skill representation.
3. **Expand:** Traverse the implication policy graph. Generate the set of explicitly extracted skills + strong implied skills.
4. **Evidence Aggregate:** Weight the aggregated skills based on context, frequency, and source.
5. **Decide:** Evaluate the Must-Have rules against the Expanded set.

### Priority Order Across Evidence Sources
1. Project Repositories/Commits (Highest)
2. Explicit Skills Section
3. Certifications
4. Employment History Description
5. Project Descriptions (Lowest)

### Conflict Resolution
If an implied skill contradicts an explicit anti-skill (e.g., candidate explicitly says "No Java"), the explicit rule wins.

### Decision Logging Schema
Every decision object must log: `candidate_id`, `required_skill`, `matched_status`, `matched_via_canonical`, `matched_via_implication`, `evidence_path`.

---

## E) Global Taxonomy Framework

The universal skill model utilizes a faceted hierarchy:
- **Domain:** e.g., Software Engineering, Data Science
- **Language:** e.g., Python, C++
- **Runtime:** e.g., Node.js, JRE
- **Framework:** e.g., Spring Boot, Angular
- **Library:** e.g., Pandas, NumPy
- **Tooling:** e.g., Webpack, Maven
- **Data/DB:** e.g., PostgreSQL, Redis
- **Cloud:** e.g., AWS, Azure
- **DevOps:** e.g., Terraform, Ansible
- **Testing:** e.g., Jest, PyTest
- **Security:** e.g., OAuth, Checkmarx
- **Mobile:** e.g., Android, iOS
- **Frontend / Backend / Fullstack**
- **AI/ML/Data:** e.g., TensorFlow, PyTorch
- **Infra/SRE/Observability:** e.g., Prometheus, Datadog
- **Messaging/Streaming:** e.g., Kafka, RabbitMQ

---

## F) Massive Alias Policy

### Rules for Admissibility
- Must be unambiguous (e.g., "C" is an ambiguous alias without context, "C/C++" is clear).
- Avoid generic acronyms unless scoped (e.g., "AS" could mean ActionScript or Android Studio).

### Ambiguous Alias Handling
If an alias matches multiple canonicals, require contextual neighborhood validation. (e.g., "Spark" near "Data" -> Apache Spark; "Spark" near "UI" -> Spark UI).

### Formatting Rules
- **Dot/Slash/Hyphen:** Automatically collapse (e.g., `react.js` = `react-js` = `reactjs`).
- **Vendor-renamed Products:** Map legacy names to modern ones (e.g., `J2EE` -> `Java EE` -> `Jakarta EE`).

---

## G) Massive Implication Policy

### Transitive Closure Rules
If `A -> B` and `B -> C`, then `A -> C`.
- Example: `Next.js -> React` and `React -> JavaScript`. Therefore, `Next.js -> JavaScript`.

### Cycles Prevention
The implication graph must be a Directed Acyclic Graph (DAG) for Strong Implications. Bi-directional weak implications are allowed but ignored for Hard Gates.

### When Implication Satisfies Must-Have
Only single-path or DAG-validated Strong Implications may satisfy a hard must-have gate. (e.g., Must-have = `SQL`; Resume = `PostgreSQL`; SQL is satisfied).

---

## H) Must-Have Eligibility Policy

### Exact + Alias + Implication Semantics
A candidate passes a "Must-Have" requirement if and only if:
`RequiredSkill ∈ {Explicitly Extracted} ∪ {Aliases} ∪ {Strongly Implied Skills}`

### Role-Sensitive Strictness
- **Intern/Junior:** Allow broader matching. Allow weak implications to count at 50% confidence.
- **Senior/Staff:** Strict adherence. If Must-Have is "Distributed Systems", specific proxy tools (e.g., Kafka, Cassandra) satisfy the condition, but generic tools (e.g., MySQL) do not.

---

## I) Evidence Policy

### Evidence Sources Ranked by Trust
1. **Explicit Skills Section (Trust: 0.9):** High intent, candidate self-identifies.
2. **Project Tech Stack / Repos (Trust: 0.95):** Ground truth if available.
3. **Raw Resume Text in Experience (Trust: 0.8):** Contextual but may just be a passing mention.
4. **Certifications (Trust: 1.0):** Absolute verification for a specific technology.

### Source Weighting Guidelines
Multiple mentions across different dimensions (e.g., listed in Skills AND mentioned in 2 Jobs) compound the confidence score logarithmically.

---

## J) False Rejection Prevention Blueprint

**Anti-Pattern 1: The "Over-Qualified" Rejection**
- **Symptom:** Rejecting a Staff Engineer for missing "Java" when they have "Spring Boot" and "Hibernate".
- **Root Cause:** Narrow boolean search.
- **Remedy:** Apply Transitive Strong Implication `Spring Boot -> Java`.
- **Acceptance Test:** Assert `match("Java", ["Spring Boot"]) == PASS`.

**Anti-Pattern 2: The "Version Mismatch" Rejection**
- **Symptom:** Rejecting candidate with "Angular 14" for a role requiring "Angular".
- **Root Cause:** Version postfix treated as distinct string.
- **Remedy:** Canonicalize versions to base tool for base matching.
- **Acceptance Test:** Assert `match("Angular", ["Angular 14"]) == PASS`.

---

## K) False Positive Prevention Blueprint

**Anti-Pattern 1: The "Ecosystem Contamination"**
- **Symptom:** Recruiter searches "Kafka", resume has "AWS MSK", system infers Kafka (Correct). Recruiter searches "Java", resume has "Kafka" (written in Java), system infers Java (Incorrect for candidate).
- **Remedy:** Parent -> Child prohibitions. Using a tool does not imply knowing its underlying language unless it's a framework designed for coding in that language.
- **Rule:** `Tool -> Language` is WEAK. `Framework -> Language` is STRONG.

---

## L) Tech-Ecosystem Coverage Matrix

*(Note: This is a representative extensive sample for production implementation across 26 domains)*

### 1. JavaScript/TypeScript Ecosystem
| Canonical Skill | Aliases/Variants | Strong Implied Parents | Weak Implied Parents | Counter-Examples (Do NOT infer) | Must-Have Pass |
|---|---|---|---|---|---|
| JavaScript | JS, ES6, ECMAScript | None | None | Java (completely separate) | JS |
| TypeScript | TS | JavaScript | None | C# | TS, JS |
| React | React.js, ReactJS | JavaScript | TypeScript | React Native | React, JS |
| Angular | Angular.js, AngularJS | JavaScript, TypeScript | RxJS | AngularJS (1.x is distinct but matches loosely) | Angular, TS, JS |
| Node.js | NodeJS, Node | JavaScript | None | Deno | Node.js, JS |

### 2. Python Ecosystem
| Canonical Skill | Aliases/Variants | Strong Implied Parents | Weak Implied Parents | Counter-Examples (Do NOT infer) | Must-Have Pass |
|---|---|---|---|---|---|
| Python | Py, Python3 | None | C (CPython) | None | Python |
| Django | Django Template | Python | SQL | Flask | Django, Python |
| Flask | - | Python | None | Django | Flask, Python |
| Pandas | - | Python | Numpy | PySpark | Pandas, Python |
| PyTorch | Torch | Python | Deep Learning | TensorFlow | PyTorch, Python |

### 3. Java Ecosystem
| Canonical Skill | Aliases/Variants | Strong Implied Parents | Weak Implied Parents | Counter-Examples (Do NOT infer) | Must-Have Pass |
|---|---|---|---|---|---|
| Java | Core Java, J2SE | JVM | Object Oriented | JavaScript | Java |
| Spring Boot | SpringBoot, Spring | Java | Microservices | Hibernate | Spring Boot, Java |
| Maven | mvn | Java | None | Gradle | Maven, Java |

### 4. Databases
| Canonical Skill | Aliases/Variants | Strong Implied Parents | Weak Implied Parents | Counter-Examples (Do NOT infer) | Must-Have Pass |
|---|---|---|---|---|---|
| PostgreSQL | Postgres, PSQL | SQL, RDBMS | None | NoSQL | Postgres, SQL |
| MongoDB | Mongo | NoSQL | JSON | Cassandra | Mongo, NoSQL |
| Redis | - | Cache, NoSQL | Memcached | SQL | Redis |

### 5. Cloud
| Canonical Skill | Aliases/Variants | Strong Implied Parents | Weak Implied Parents | Counter-Examples (Do NOT infer) | Must-Have Pass |
|---|---|---|---|---|---|
| AWS | Amazon Web Services | Cloud Computing | None | Azure, GCP | AWS, Cloud |
| Amazon S3 | S3 | AWS, Object Storage | None | EBS | S3, AWS |
| Kubernetes | K8s | Containers | Docker | Swarm | K8s, Containers |

*(Extension logic applies uniformly across all 26 domains mapping Frameworks -> Languages, Databases -> Query Languages).*

---

## M) Role-Aware Rules

- **Frontend Roles:** Strict mapping on UI Frameworks. `React Native` implies `React`, but `React` does NOT imply `React Native`.
- **Backend Analytics:** `SQL` implies ability to quickly learn `HQL` (Hive), but not vice-versa for strict gatekeeping.
- **ML Engineer:** `TensorFlow` or `PyTorch` strongly implies `Python` and `Machine Learning`. Cannot be substituted with generic `Software Engineering`.

---

## N) Geography and Market Variation

- **Naming Differences:** "Big Data" is heavily used in APAC regions, whereas "Data Engineering" is standard in US markets; treat them as highly equivalent variants.
- **Education vs Industry:** Academic resumes use "Systems Programming"; map this to "C/C++/Rust" depending on graduation year.

---

## O) Governance and Change Management

1. **Rule Proposal Workflow:** All taxonomy changes (adding an alias, creating an implication edge) must be submitted via YAML/JSON PR to the Ontology Repo.
2. **Approval Gates:** 2 Human Data Stewards must review implications to prevent graph cycles.
3. **Versioning:** Every model update receives a SemVer bump. Resumes scored on an older version are immutable until triggered for rescoring.
4. **Auditability:** Recruiter feedback (e.g., manually overriding an AI rejection) automatically spawns a ticket for taxonomy review.

---

## P) Quality and Evaluation Framework

- **Offline Benchmarks:** Run the rulebook against a dataset of 100k "Gold Standard" human-evaluated resumes. Target: < 0.1% False Rejection.
- **Precision/Recall Targets:** Recall for Must-Haves should be 100%. Precision > 98%.

---

## Q) Test Plan (Policy-Level)

### Unit Test Catalog Scenarios
- **Scenario 1:** Require: `JavaScript`. Candidate has: `Next.js`. Result: PASS.
- **Scenario 2:** Require: `Python`. Candidate has: `Mojo`. Result: FAIL (No strong implication yet).
- **Scenario 3:** Require: `Machine Learning`. Candidate has: `K-Means, XGBoost`. Result: PASS (Rolled up conceptual implication).

### Regression Suites
Maintain a static set of historical "Tricky" resumes (e.g., fullstack devs with obscure stacks) to ensure new rules don't break existing good matches.

---

## R) Explainability Templates

**For Recruiters / Hiring Managers:**
> "[Candidate] passed the hard requirement for '[Must-Have Skill]'. This was determined via semantic substitution: The candidate explicitly lists '[Framework/Tool]' which strongly guarantees proficiency in '[Must-Have Skill]' based on industry standards."

**Candidate-Facing (If applicable):**
> "We noticed your deep experience in [Ecosystem (e.g., React/Node)]. We've successfully matched this to our requirements for core [Language (e.g., JavaScript)]."

---

## S) Operational Playbooks

- **Incident Response for Mis-rejections:**
  1. Recruiter flags candidate.
  2. Data Steward checks the Graph path.
  3. If missing edge: Add `Strong Implication`.
  4. If missing node: Add new skill & map to taxonomy.
  5. Backfill pipeline for all affected candidates in the last 30 days.

---

## T) Appendices

**Master Alias Template Format:**
```json
{
  "canonical_id": "SKILL_JAVA",
  "display_name": "Java",
  "aliases": ["core java", "j2se", "java 8", "java 11"],
  "domain": "backend_language"
}
```

**Master Implication Template Format:**
```json
{
  "source_skill": "SKILL_SPRING_BOOT",
  "target_skill": "SKILL_JAVA",
  "relationship_type": "STRONG_IMPLICATION",
  "confidence_score": 1.0,
  "reasoning": "Spring Boot is a Java framework. One cannot use it without Java."
}
```

*Final Note: This rulebook acts as the foundational blueprint for creating a knowledge graph-based Skill Evaluation Engine. All code and logic implemented must strictly adhere to the constraints mapping defined herein.*
