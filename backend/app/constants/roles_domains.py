"""
Roles and target domain definitions. Extensive mappings for zero-shot text classification.
"""

ROLE_FAMILY_KEYWORDS = {
    "backend": {
        "backend", "api", "microservice", "microservices", "distributed", "database", "sql",
        "postgresql", "mysql", "fastapi", "django", "flask", "spring", "spring boot", "nodejs",
        "express", "golang", "ruby on rails", "laravel", "net core", "c#", "java", "python",
        "graphql", "grpc", "protobuf", "redis", "kafka", "rabbitmq", "rest", "soap", "apollo",
        "hibernate", "entity framework", "jdbc", "orm", "nosql", "mongodb", "cassandra",
        "serverless", "aws lambda", "azure functions", "google cloud functions", "celery", "sidekiq",
        "nestjs", "gin", "echo", "actix", "rocket", "spring webflux", "play framework", "quarkus"
    },
    "frontend": {
        "frontend", "ui", "ux", "react", "nextjs", "angular", "vue", "typescript", "javascript",
        "web", "css", "html", "sass", "less", "tailwind", "bootstrap", "material ui", "chakra ui",
        "webpack", "vite", "babel", "redux", "mobx", "zustand", "rxjs", "svelte", "ember",
        "dom", "spa", "pwa", "webassembly", "wasm", "styled components", "framer motion", "storybook",
        "nuxt", "gatsby", "remix", "solidjs", "alpinejs", "lit", "htmx", "postcss", "stylus",
        "turbopack", "rollup", "esbuild", "parcel", "ant design", "radix ui", "headless ui"
    },
    "mobile": {
        "mobile", "ios", "android", "flutter", "react native", "swift", "kotlin", "objective c",
        "jetpack compose", "swiftui", "dart", "xcode", "android studio", "app store", "google play",
        "cocoapods", "gradle", "fastlane", "mobile app", "capacitor", "ionic", "cordova",
        "xamarin", "maui", "kmp", "kotlin multiplatform", "fastlane", "bitrise", "firebase crashlytics",
        "room", "coredata", "realm", "combine", "rxswift", "rxjava", "coroutines", "compose"
    },
    "data_engineering": {
        "data engineer", "data engineering", "pipeline", "etl", "elt", "data warehouse", "data lake",
        "spark", "hadoop", "airflow", "dbt", "snowflake", "bigquery", "redshift", "kafka", "flink",
        "presto", "trino", "hive", "sqoop", "beam", "data modeling", "databricks", "luigi", "prefect",
        "dagster", "mage", "fivetran", "airbyte", "meltano", "kafka streams", "ksqldb", "delta lake",
        "apache hudi", "apache iceberg", "starburst", "athena", "glue", "emr", "ssis", "talend", "informatica"
    },
    "machine_learning": {
        "ml", "machine learning", "deep learning", "llm", "nlp", "computer vision", "kaggle",
        "tensorflow", "pytorch", "scikit", "xgboost", "rag", "genai", "ai", "data science",
        "pandas", "numpy", "mlops", "kubeflow", "sagemaker", "mlflow", "transformers", "huggingface",
        "neural network", "cnn", "rnn", "lstm", "reinforcement learning", "cv", "generative ai",
        "langchain", "llamaindex", "vllm", "ollama", "qlora", "lora", "diffusion", "stable diffusion",
        "midjourney", "yolo", "opencv", "dlib", "nltk", "spacy", "gensim", "fasttext", "keras", "jax", "polars"
    },
    "devops_sre": {
        "devops", "infra", "infrastructure", "kubernetes", "docker", "aws", "gcp", "azure",
        "ci/cd", "terraform", "observability", "sre", "cloud", "ansible", "chef", "puppet",
        "jenkins", "github actions", "gitlab ci", "argo", "prometheus", "grafana", "elk", "datadog",
        "splunk", "site reliability", "linux", "bash", "shell script", "helm", "istio", "envoy", "service mesh",
        "argocd", "flux", "pulumi", "cloudformation", "packer", "vagrant", "opentelemetry", "jaeger", "zipkin",
        "new relic", "dynatrace", "pagerduty", "victorops", "crossplane", "kustomize", "vault", "consul"
    },
    "security": {
        "security", "cyber", "threat", "vulnerability", "pentest", "soc", "incident",
        "forensics", "iam", "siem", "cryptography", "owasp", "burp suite", "wireshark",
        "nmap", "metasploit", "zero trust", "endpoint protection", "network security",
        "application security", "appsec", "devsecops", "malware", "auth", "oauth", "jwt",
        "saml", "sso", "okta", "auth0", "keycloak", "rbac", "abac", "soc2", "iso27001", "hipaa",
        "pci-dss", "edr", "mdm", "sast", "dast", "sonarqube", "checkmarx", "fortify", "crowdstrike", "splunk es"
    },
    "qa_sdet": {
        "qa", "quality assurance", "sdet", "testing", "automation", "selenium", "cypress",
        "puppeteer", "playwright", "jest", "mocha", "junit", "pytest", "appium", "testng",
        "manual testing", "load testing", "jmeter", "k6", "gatling", "cucumber", "bdd", "tdd", "postman",
        "robot framework", "specflow", "karate", "rest-assured", "xunit", "nunit", "testcafe", "webdriverio",
        "espresso", "xcuitest", "detox", "locust", "artillery", "wiremock", "mountebank", "testcontainers"
    },
    "web3": {
        "web3", "blockchain", "crypto", "smart contract", "solidity", "rust", "ethereum",
        "bitcoin", "defi", "nft", "dapp", "ipfs", "hardhat", "truffle", "ethers.js", "web3.js",
        "polygon", "solana", "binance smart chain", "zk", "zero knowledge", "consensus", "tokenomics",
        "foundry", "brownie", "vyper", "cairo", "starknet", "zksync", "arbitrum", "optimism", "layer2",
        "amm", "dex", "cefi", "wallets", "metamask", "walletconnect", "web3modal", "wagmi", "viem"
    },
    "game_dev": {
        "game", "gaming", "unity", "unreal", "c++", "c#", "gameplay", "graphics", "opengl",
        "vulkan", "directx", "shader", "multiplayer", "networking", "physics", "rendering",
        "godot", "cryengine", "hlsl", "glsl", "cg", "photon", "mirror", "unreal blueprint",
        "maya", "blender", "zbrush", "substance painter", "animation", "rigging", "vfx", "ui/ux", "spine3d"
    },
    "embedded_systems": {
        "embedded", "firmware", "c", "c++", "rtos", "microcontroller", "stm32", "arduino", "raspberry pi",
        "iot", "internet of things", "hardware", "pcb", "verilog", "vhdl", "fpga", "soc", "spi", "i2c", "uart",
        "freertos", "zephyr", "mbed", "esp32", "esp8266", "arm cortex", "pic", "avr", "can bus", "lin bus",
        "modbus", "ble", "bluetooth low energy", "zigbee", "lorawan", "mqtt", "coap", "kicad", "altium"
    }
}

TARGET_DOMAIN_KEYWORDS = {
    "fintech": {"payment", "payments", "banking", "risk", "trading", "fintech", "wealthtech", "insurtech", "lending", "credit", "blockchain", "crypto", "defi", "stripe", "plaid", "hft", "quant", "algon", "ledger", "kyc", "aml", "bsa", "fraud", "underwriting", "neobank", "embedded finance", "bnpl", "pos", "gateway", "clearing"},
    "ai": {"ai", "ml", "llm", "genai", "rag", "machine learning", "deep learning", "nlp", "computer vision", "artificial intelligence", "chatgpt", "openai", "transformers", "foundation model", "prompt engineering", "alignment", "rlhf", "fine-tuning", "parameter-efficient", "embeddings", "vector db", "agents"},
    "data_infrastructure": {"data", "analytics", "pipeline", "warehouse", "bi", "big data", "etl", "data lake", "dashboard", "reporting", "olap", "oltp", "streaming", "batch processing", "mdm", "data governance", "data catalog", "lineage", "lakehouse", "cdc", "change data capture", "event sourcing"},
    "security": {"security", "cyber", "threat", "vulnerability", "defense", "encryption", "iam", "access control", "compliance", "soc2", "gdpr", "hipaa", "audit", "infosec", "zero trust", "edr", "xdr", "mdr", "siem", "soar", "pentest", "red team", "blue team", "purple team", "cryptography", "pki", "casb"},
    "cloud_infrastructure": {"cloud", "aws", "gcp", "azure", "distributed", "saas", "paas", "iaas", "virtualization", "serverless", "multi-tenant", "compute", "storage", "networking", "cdn", "hybrid cloud", "edge computing", "service mesh", "load balancer", "api gateway", "vpc", "vpn", "sdn"},
    "healthtech": {"health", "healthcare", "hipaa", "ehr", "emr", "telemedicine", "medical", "biotech", "genomics", "pharma", "clinical", "medtech", "patient", "hl7", "fhir", "dicom", "pacs", "telehealth", "wearables", "digital therapeutics", "population health", "revenue cycle management", "rcm"},
    "edtech": {"education", "edtech", "learning", "lms", "student", "university", "school", "course", "tutoring", "curriculum", "e-learning", "classroom", "mooc", "sis", "student information system", "instructional design", "gamification", "adaptive learning", "assessment"},
    "ecommerce": {"ecommerce", "retail", "marketplace", "shopping", "cart", "inventory", "supply chain", "logistics", "delivery", "d2c", "b2b", "b2c", "pos", "merchandising", "checkout", "oms", "order management", "pim", "product information management", "wms", "warehouse management", "dropshipping", "subscription"},
    "gaming": {"gaming", "game", "unity", "unreal", "multiplayer", "mmo", "esports", "ar", "vr", "mixed reality", "rendering", "console", "pc gaming", "mobile game", "metaverse", "web3 gaming", "p2e", "play to earn", "cloud gaming", "matchmaking", "game engine", "level design"},
    "social": {"social", "network", "community", "messaging", "chat", "feed", "creator", "media", "content", "influencer", "dating", "streaming", "video", "ugc", "user generated content", "moderation", "social graph", "viral", "engagement", "creator economy", "audio room", "voip"},
    "real_estate": {"real estate", "proptech", "property", "leasing", "mortgage", "housing", "brokerage", "tenant", "landlord", "cre", "commercial real estate", "property management", "title", "escrow", "appraisal", "reit", "co-working", "smart building", "facilities management"},
    "travel_mobility": {"travel", "flight", "hotel", "booking", "mobility", "transportation", "ride sharing", "autonomous", "ev", "fleet", "logistics", "routing", "ota", "online travel agency", "gds", "global distribution system", "hospitality", "micromobility", "scooter", "last mile", "tms", "freight"}
}