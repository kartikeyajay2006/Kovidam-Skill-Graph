"""
Keywords taxonomies for NLP parsing. Expands into exact variants of standard signals.
"""

EXPERIENCE_KEYWORDS = [
    # General Roles
    "software engineer", "developer", "sde", "swe", "sre", "sdet", "engineer", "architect",
    "programmer", "coder", "hacker", "member of technical staff", "mts", "smts", "lmts", "pmts",
    "technical lead", "tech lead", "engineering manager", "cto", "vp of engineering",
    "director of engineering", "head of engineering", "staff engineer", "principal engineer",
    "distinguished engineer", "fellow", "chief architect", "qa analyst", "systems analyst",
    # Specific Stack Roles
    "full stack", "fullstack", "full-stack", "backend", "back end", "back-end",
    "frontend", "front end", "front-end", "mobile", "ios", "android", "flutter", "react native",
    "data engineer", "data scientist", "machine learning engineer", "ml engineer", "ai engineer",
    "devops", "cloud engineer", "infrastructure engineer", "platform engineer", "security engineer",
    "qa engineer", "quality assurance", "test engineer", "automation engineer", "site reliability engineer",
    "release engineer", "systems engineer", "network engineer", "embedded engineer", "firmware engineer",
    # Contract/Temporal Variants
    "intern", "internship", "co-op", "apprentice", "apprenticeship", "fellow", "fellowship",
    "contractor", "freelancer", "consultant", "work experience", "employment", "professional experience",
    "industrial training", "industrial attachment", "student developer", "trainee", "part-time", "full-time",
    "freelance", "founder", "co-founder"
]

LEADERSHIP_KEYWORDS = [
    "led", "owned", "mentored", "managed", "architected", "drove", "spearheaded",
    "designed end-to-end", "initiated", "coordinated", "oversaw", "directed",
    "championed", "navigated", "pioneered", "guided", "steered", "facilitated",
    "fostered", "cultivated", "orchestrated", "established", "founded", "created",
    "cross-functional", "stakeholder management", "roadmapping", "scoping",
    "technical direction", "vision", "code review", "code reviews", "onboarding",
    "hiring", "interviews", "performance review", "agile ceremonies", "scrum master",
    "product management", "evangelized", "negotiated", "delegated", "aligned",
    "empowered", "resolved conflicts", "budgeted", "strategic planning", "tech debt"
]

IMPACT_KEYWORDS = [
    "reduced", "improved", "increased", "optimized", "scaled", "decreased",
    "latency", "throughput", "uptime", "reliability", "performance", "cost",
    "savings", "revenue", "conversion", "retention", "engagement", "efficiency",
    "velocity", "availability", "budget", "roi", "resolved", "mitigated",
    "automated", "streamlined", "accelerated", "consolidated", "maximized",
    "minimized", "eliminated", "delivered", "shipped", "launched", "deployed",
    "10x", "percent", "%", "million", "billion", "kpi", "okr", "bottleneck",
    "slashed", "boosted", "tripled", "doubled", "generated", "saved", "prevented",
    "secured", "upgraded", "migrated", "modernized"
]

OWNERSHIP_KEYWORDS = [
    "production", "deployed", "on-call", "sla", "slo", "microservices",
    "ci/cd", "kubernetes", "distributed system", "monitoring", "observability",
    "incident", "post-mortem", "root cause", "rca", "pagerduty", "datadog",
    "infrastructure as code", "iac", "terraform", "ansible", "docker",
    "system architecture", "high availability", "fault tolerance", "load balancing",
    "auto-scaling", "disaster recovery", "failover", "zero downtime", "blue-green",
    "canary", "feature flags", "ab testing", "a/b testing", "telemetry", "tracing",
    "elk", "splunk", "grafana", "prometheus", "sre", "oncall", "sev1", "sev2",
    "runbook", "playbook", "capacity planning", "provisioning"
]

INTERNSHIP_CREDIBILITY_KEYWORDS = [
    "internship", "intern", "research intern", "summer intern", "winter intern",
    "ppo", "pre-placement offer", "return offer", "co-op", "apprentice",
    "student researcher", "fellow", "stipend", "industrial training", "industrial attachment",
    "visiting student", "research assistant"
]

ACHIEVEMENT_KEYWORDS = [
    # Global Programs
    "google summer of code", "gsoc", "mlh fellowship", "major league hacking",
    "outreachy", "linux foundation", "cncf", "apache software foundation",
    "y combinator", "yc", "techstars", "500 startups", "sequoia surge",
    # Competitive Programming
    "icpc", "ieeextreme", "codeforces", "codechef", "leetcode", "hackerrank",
    "topcoder", "atcoder", "kickstart", "hashcode", "code jam", "facebook hacker cup",
    "meta hacker cup", "candidate master", "master", "grandmaster", "international grandmaster",
    "rating", "div 1", "div1", "global rank", "air ", "all india rank", "pupil", "expert",
    # Data Science
    "kaggle master", "kaggle grandmaster", "kaggle expert", "kaggle competitions",
    "kdd cup", "datathon",
    # Hackathons
    "hackathon winner", "first place", "1st place", "runner up", "finalist",
    "ethglobal", "smart india hackathon", "sih", "ethindia", "devpost", "hackmit",
    "pennapps", "treehacks", "calhacks",
    # Awards & Publications
    "patent", "published", "ieee", "acm", "neurips", "cvpr", "icml", "iclr", "emnlp",
    "outstanding", "valedictorian", "summa cum laude", "magna cum laude", "dean's list",
    "scholar", "scholarship", "open source contributor", "core maintainer", "best paper",
    "gold medalist", "president's gold medal"
]

PROJECT_COMPLEXITY_KEYWORDS = [
    # Architecture
    "scalable", "scale", "distributed", "multi-tenant", "multi agent", "orchestration",
    "real-time", "streaming", "pipeline", "microservice", "microservices", "kubernetes",
    "event-driven", "concurrency", "optimization", "low latency", "high throughput",
    "monolith", "decoupled", "asynchronous", "sync", "async", "thread-safe",
    "lock-free", "non-blocking", "event loop", "message queue", "pub/sub", "webhook",
    "serverless", "edge computing", "caching", "cdn", "sharding", "replication",
    "partitioning", "indexing", "consistency tuning", "cap theorem", "fault tolerant",
    "idempotent", "stateless", "stateful",
    # Specific Patterns
    "mvc", "mvvm", "clean architecture", "hexagonal architecture", "domain driven design",
    "ddd", "cqrs", "event sourcing", "saga pattern", "circuit breaker", "rate limiting",
    "graphql", "grpc", "protobuf", "restful", "sob", "soap", "websockets", "webrtc",
    "strangler fig", "bff", "backend for frontend", "api gateway", "service mesh"
]
