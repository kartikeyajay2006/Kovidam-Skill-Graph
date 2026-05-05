"""
SKILL_IMPLICATIONS: Directed Acyclic Graph (DAG) mapping downstream skills/frameworks back to their root parents.
This map ensures that if a user asks for 'Python', candidates with 'FastAPI' pass the check.
DO NOT create cycles. The engine recursively queries this.
"""

SKILL_IMPLICATIONS = {
    # -----------------------
    # JavaScript & TypeScript Core
    # -----------------------
    "typescript": {"javascript"},
    "es6": {"javascript"},
    "es7": {"javascript"},
    "es8": {"javascript"},
    
    # React Ecosystem
    "react": {"javascript"},
    "reactjs": {"javascript"},
    "nextjs": {"javascript", "react"},
    "gatsby": {"javascript", "react"},
    "remix": {"javascript", "react"},
    "react native": {"javascript", "react", "mobile"},
    "redux": {"javascript", "react"},
    "mobx": {"javascript"},
    "zustand": {"javascript", "react"},
    "recoil": {"javascript", "react"},
    "react query": {"javascript", "react"},
    "framer motion": {"javascript", "react"},
    "styled components": {"javascript", "react", "css"},
    
    # Vue Ecosystem
    "vue": {"javascript"},
    "nuxt": {"javascript", "vue"},
    "vuetify": {"javascript", "vue", "css"},
    "vuex": {"javascript", "vue"},
    "pinia": {"javascript", "vue"},
    "quasar": {"javascript", "vue"},
    
    # Angular Ecosystem
    "angular": {"javascript", "typescript"},
    "rxjs": {"javascript"},
    "ngrx": {"javascript", "angular"},
    "ionic": {"javascript", "angular", "mobile"},
    
    # Svelte & Others
    "svelte": {"javascript"},
    "sveltekit": {"javascript", "svelte"},
    "solidjs": {"javascript"},
    "alpinejs": {"javascript"},
    "lit": {"javascript"},
    
    # Backend Node.js
    "nodejs": {"javascript"},
    "express": {"javascript", "nodejs"},
    "nestjs": {"javascript", "typescript", "nodejs"},
    "fastify": {"javascript", "nodejs"},
    "koa": {"javascript", "nodejs"},
    "meteor": {"javascript", "nodejs"},
    "sails.js": {"javascript", "nodejs"},
    "deno": {"javascript", "typescript"},
    "bun": {"javascript", "typescript"},
    
    # JS Testing
    "jest": {"javascript", "testing"},
    "cypress": {"javascript", "testing"},
    "mocha": {"javascript", "testing"},
    "chai": {"javascript", "testing"},
    "puppeteer": {"javascript", "testing"},
    "playwright": {"javascript", "testing"},
    "vitest": {"javascript", "testing"},
    "jasmine": {"javascript", "testing"},
    
    # Build Tools
    "webpack": {"javascript"},
    "vite": {"javascript"},
    "babel": {"javascript"},
    "rollup": {"javascript"},
    "esbuild": {"javascript"},
    "parcel": {"javascript"},
    
    # -----------------------
    # Python Ecosystem
    # -----------------------
    # Web
    "fastapi": {"python", "api"},
    "django": {"python"},
    "django rest framework": {"python", "django", "api"},
    "flask": {"python", "api"},
    "pyramid": {"python"},
    "tornado": {"python"},
    "sanic": {"python"},
    "litestar": {"python", "api"},
    
    # Data & ML
    "pandas": {"python", "data science"},
    "numpy": {"python", "data science"},
    "scipy": {"python", "data science"},
    "scikit learn": {"python", "machine learning"},
    "matplotlib": {"python", "data science"},
    "seaborn": {"python", "data science"},
    "plotly": {"python", "data science"},
    "pytorch": {"python", "machine learning", "deep learning"},
    "tensorflow": {"python", "machine learning", "deep learning"},
    "keras": {"python", "tensorflow", "deep learning"},
    "huggingface": {"python", "machine learning", "nlp"},
    "nltk": {"python", "natural language processing", "nlp"},
    "spacy": {"python", "natural language processing", "nlp"},
    "opencv": {"python", "computer vision"},
    "langchain": {"python", "llm", "ai"},
    "llamaindex": {"python", "llm", "ai"},
    "xgboost": {"python", "machine learning"},
    "lightgbm": {"python", "machine learning"},
    "polars": {"python", "data science"},
    
    # Infra & Concurrency
    "celery": {"python", "distributed system"},
    "airflow": {"python", "data engineering", "orchestration"},
    "pyspark": {"python", "spark", "big data"},
    "sqlalchemy": {"python", "sql", "orm"},
    "alembic": {"python", "sql"},
    "pytest": {"python", "testing"},
    "boto3": {"python", "amazon web services", "cloud"},
    "dask": {"python", "data science"},
    "ray": {"python", "distributed system", "machine learning"},
    
    # -----------------------
    # Java & Kotlin Ecosystem
    # -----------------------
    "kotlin": {"java"}, 
    "spring boot": {"java", "spring", "backend"},
    "spring": {"java", "backend"},
    "spring data": {"java", "spring", "sql"},
    "spring security": {"java", "spring", "security"},
    "spring webflux": {"java", "spring", "reactive"},
    "hibernate": {"java", "sql", "orm"},
    "jpa": {"java", "sql", "orm"},
    "maven": {"java", "build tool"},
    "gradle": {"java", "build tool"},
    "junit": {"java", "testing"},
    "mockito": {"java", "testing"},
    "tomcat": {"java", "server"},
    "kafka streams": {"java", "apache kafka", "streaming"},
    "android sdk": {"java", "kotlin", "mobile", "android"},
    "jetpack compose": {"kotlin", "mobile", "android"},
    "quarkus": {"java", "cloud native"},
    "micronaut": {"java", "cloud native"},
    "scala": {"java", "jvm"},
    "akka": {"scala", "java", "distributed system"},
    "play framework": {"scala", "java", "backend"},
    
    # -----------------------
    # C# & .NET Ecosystem
    # -----------------------
    "dotnet": {"csharp", "backend"},
    "asp.net": {"csharp", "dotnet", "web"},
    "asp.net core": {"csharp", "dotnet", "web"},
    "entity framework": {"csharp", "sql", "dotnet", "orm"},
    "xamarin": {"csharp", "mobile"},
    "maui": {"csharp", "mobile", "dotnet"},
    "wcf": {"csharp", "dotnet", "legacy"},
    "wpf": {"csharp", "dotnet", "desktop"},
    "blazor": {"csharp", "dotnet", "web"},
    "nunit": {"csharp", "testing"},
    "xunit": {"csharp", "testing"},
    "mstest": {"csharp", "testing"},
    "mediatr": {"csharp", "cqrs"},
    "automapper": {"csharp"},
    
    # -----------------------
    # Golang Ecosystem
    # -----------------------
    "gin": {"golang", "api"},
    "echo": {"golang", "api"},
    "fiber": {"golang", "api"},
    "beego": {"golang", "web"},
    "gorm": {"golang", "sql", "orm"},
    "go-kit": {"golang", "microservices"},
    "grpc-go": {"golang", "grpc"},
    "cobra": {"golang", "cli"},
    
    # -----------------------
    # Rust Ecosystem
    # -----------------------
    "actix": {"rust", "backend"},
    "actix-web": {"rust", "backend", "web"},
    "tokio": {"rust", "async"},
    "rocket": {"rust", "web"},
    "diesel": {"rust", "sql", "orm"},
    "sqlx": {"rust", "sql"},
    "serde": {"rust", "serialization"},
    "tauri": {"rust", "desktop"},
    
    # -----------------------
    # PHP Ecosystem
    # -----------------------
    "laravel": {"php", "backend"},
    "symfony": {"php", "backend"},
    "codeigniter": {"php", "backend"},
    "yii2": {"php", "backend"},
    "phpunit": {"php", "testing"},
    "composer": {"php", "package manager"},
    "wordpress": {"php", "cms"},
    "magento": {"php", "ecommerce"},
    "drupal": {"php", "cms"},
    
    # -----------------------
    # Ruby Ecosystem
    # -----------------------
    "ruby on rails": {"ruby", "backend", "web"},
    "sinatra": {"ruby", "web"},
    "rspec": {"ruby", "testing"},
    "sidekiq": {"ruby", "background jobs"},
    "capistrano": {"ruby", "deployment"},
    "rubocop": {"ruby", "linter"},
    "active record": {"ruby", "sql", "orm"},
    
    # -----------------------
    # Mobile Specifics
    # -----------------------
    "swiftui": {"swift", "mobile", "ios"},
    "combine": {"swift", "mobile", "ios"},
    "objective c": {"mobile", "ios"},
    "rxswift": {"swift", "mobile", "ios"},
    "flutter": {"dart", "mobile", "cross platform"},
    "cordova": {"javascript", "mobile", "cross platform"},
    "react native": {"javascript", "react", "mobile", "cross platform"},
    "ionic": {"javascript", "mobile", "cross platform"},
    "kmp": {"kotlin", "mobile", "cross platform"},
    "fastlane": {"mobile", "ci/cd"},
    
    # -----------------------
    # Databases & Caching
    # -----------------------
    "postgresql": {"sql", "database", "rdbms"},
    "mysql": {"sql", "database", "rdbms"},
    "sqlite": {"sql", "database", "rdbms"},
    "sql server": {"sql", "database", "rdbms"},
    "tsql": {"sql server", "sql"},
    "plsql": {"oracle db", "sql"},
    "oracle db": {"sql", "database", "rdbms"},
    "mongodb": {"nosql", "database", "document db"},
    "cassandra": {"nosql", "database", "wide column db"},
    "dynamodb": {"nosql", "database", "amazon web services", "key value db"},
    "cosmosdb": {"nosql", "database", "microsoft azure"},
    "firebase": {"nosql", "database", "google cloud platform"},
    "firestore": {"nosql", "database", "google cloud platform"},
    "redis": {"nosql", "caching", "key value db"},
    "memcached": {"nosql", "caching", "key value db"},
    "elastic search": {"nosql", "search"},
    "solr": {"nosql", "search"},
    "neo4j": {"graph database", "database", "nosql"},
    "prisma": {"sql", "typescript", "orm"},
    "cockroachdb": {"sql", "database", "distributed sql"},
    "timescaledb": {"postgresql", "time series db"},
    "influxdb": {"time series db"},
    "clickhouse": {"sql", "olap", "data warehouse"},
    
    # -----------------------
    # Message Brokers
    # -----------------------
    "apache kafka": {"distributed system", "streaming", "messaging"},
    "rabbit mq": {"distributed system", "messaging", "amqp"},
    "active mq": {"distributed system", "messaging", "jms"},
    "amazon sqs": {"amazon web services", "distributed system", "messaging"},
    "amazon sns": {"amazon web services", "distributed system", "pubsub"},
    "google pub/sub": {"google cloud platform", "distributed system", "messaging"},
    "pulsar": {"distributed system", "streaming", "messaging"},
    "nats": {"distributed system", "messaging"},
    
    # -----------------------
    # DevOps, Cloud & Infra
    # -----------------------
    # AWS
    "amazon web services": {"cloud"},
    "amazon ec2": {"amazon web services", "compute"},
    "amazon s3": {"amazon web services", "storage"},
    "amazon rds": {"amazon web services", "sql", "database"},
    "amazon eks": {"kubernetes", "amazon web services", "containerization"},
    "amazon ecs": {"docker", "amazon web services", "containerization"},
    "lambda": {"amazon web services", "serverless", "compute"},
    "cloudformation": {"amazon web services", "infrastructure as code"},
    "route53": {"amazon web services", "networking"},
    "dynamodb": {"amazon web services", "nosql", "database"},
    "aws fargate": {"amazon web services", "containerization", "serverless"},
    "aws glue": {"amazon web services", "etl", "data engineering"},
    "amazon athena": {"amazon web services", "sql", "big data"},
    "amazon redshift": {"amazon web services", "data warehouse", "sql"},
    
    # GCP
    "google cloud platform": {"cloud"},
    "google kubernetes engine": {"kubernetes", "google cloud platform", "containerization"},
    "google compute engine": {"google cloud platform", "compute"},
    "bigquery": {"google cloud platform", "data warehouse", "sql", "big data"},
    "firebase": {"google cloud platform", "baas"},
    "google cloud run": {"google cloud platform", "serverless", "containerization"},
    "google cloud functions": {"google cloud platform", "serverless"},
    "google cloud storage": {"google cloud platform", "storage"},
    
    # Azure
    "microsoft azure": {"cloud"},
    "azure kubernetes service": {"kubernetes", "microsoft azure", "containerization"},
    "azure functions": {"microsoft azure", "serverless"},
    "azure devops": {"microsoft azure", "ci/cd"},
    "azure blob storage": {"microsoft azure", "storage"},
    "azure cosmos db": {"microsoft azure", "nosql", "database"},
    
    # Tools
    "kubernetes": {"docker", "containerization", "orchestration", "devops"},
    "helm": {"kubernetes", "devops"},
    "istio": {"kubernetes", "service mesh", "devops"},
    "envoy": {"service mesh", "networking"},
    "docker compose": {"docker", "containerization", "devops"},
    "podman": {"containerization", "devops"},
    "terraform": {"infrastructure as code", "devops", "cloud"},
    "ansible": {"infrastructure as code", "devops", "configuration management"},
    "puppet": {"infrastructure as code", "devops", "configuration management"},
    "chef": {"infrastructure as code", "devops", "configuration management"},
    "github actions": {"ci/cd", "devops"},
    "gitlab ci": {"ci/cd", "devops"},
    "jenkins": {"ci/cd", "devops"},
    "circleci": {"ci/cd", "devops"},
    "travis ci": {"ci/cd", "devops"},
    "bitbucket pipelines": {"ci/cd", "devops"},
    "argocd": {"kubernetes", "ci/cd", "gitops"},
    "pulumi": {"infrastructure as code", "devops", "cloud"},
    "packer": {"devops", "infrastructure as code"},
    
    # Observability
    "grafana": {"observability", "metrics", "dashboarding"},
    "prometheus": {"observability", "metrics", "monitoring"},
    "datadog": {"observability", "monitoring", "tracing", "logging"},
    "splunk": {"observability", "logging", "siem"},
    "elk": {"elastic search", "logstash", "kibana", "logging", "observability"},
    "jaeger": {"observability", "tracing"},
    "zipkin": {"observability", "tracing"},
    "new relic": {"observability", "apm"},
    "dynatrace": {"observability", "apm"},
    "opentelemetry": {"observability", "tracing", "metrics"},
    
    # -----------------------
    # Big Data & Data Engineering
    # -----------------------
    "spark": {"big data", "distributed computing"},
    "apache spark": {"big data", "distributed computing"},
    "hadoop": {"big data", "distributed computing"},
    "hive": {"big data", "sql", "data warehouse"},
    "presto": {"big data", "sql", "data warehouse"},
    "trino": {"big data", "sql", "data warehouse"},
    "snowflake": {"data warehouse", "sql", "cloud"},
    "redshift": {"data warehouse", "sql", "amazon web services", "cloud"},
    "dbt": {"data engineering", "sql", "elt"},
    "airflow": {"data engineering", "python", "orchestration"},
    "luigi": {"data engineering", "python", "orchestration"},
    "prefect": {"data engineering", "python", "orchestration"},
    "dagster": {"data engineering", "python", "orchestration"},
    "fivetran": {"data engineering", "etl", "pipeline"},
    "flink": {"big data", "streaming"},
    "apache beam": {"big data", "streaming", "batch processing"},
    "databricks": {"apache spark", "big data", "cloud", "machine learning"},
    
    # -----------------------
    # Web3 & Crypto
    # -----------------------
    "hardhat": {"solidity", "ethereum", "web3", "smart contract"},
    "truffle": {"solidity", "ethereum", "web3", "smart contract"},
    "ethers.js": {"javascript", "ethereum", "web3", "blockchain"},
    "web3.js": {"javascript", "ethereum", "web3", "blockchain"},
    "foundry": {"solidity", "ethereum", "web3", "smart contract"},
    "anchor": {"rust", "solana", "web3", "smart contract"},
    "ipfs": {"web3", "distributed system", "storage"},
    "solidity": {"ethereum", "web3", "smart contract"},
    "vyper": {"ethereum", "web3", "smart contract", "python"},
    "wagmi": {"react", "ethereum", "web3"},
    "viem": {"javascript", "ethereum", "web3"}
}