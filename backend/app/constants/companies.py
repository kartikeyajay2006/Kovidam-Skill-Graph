"""
COMPANY_SIGNAL_TIERS: Hundreds of categorized companies for resume signal extraction.
"""

COMPANY_SIGNAL_TIERS = {
    # ----------------------------------------------------
    # Tier-1: 1.00 Signal 
    # The highest bar engineering organizations in the world.
    # ----------------------------------------------------
    1.00: [
        # Big Tech / "FAANGMULA" + Mega Caps
        "google", "alphabet", "microsoft", "amazon", "aws", "meta", "facebook", "apple", "netflix", "nvidia",
        
        # Elite AI & Foundation Model Labs
        "openai", "deepmind", "anthropic", "cohere", "mistral ai", "mistral", "xai", "hugging face", "scale ai", "midjourney", 
        "inflection ai", "adept ai", "runway", "perplexity", "perplexity ai", "character.ai", "elevenlabs", "pika labs", 
        "groq", "cerebras", "together ai", "samba nova", "ai21", "ai21 labs", "genesis therapeutics", "coreweave",
        "essential ai", "poolside", "moonshot ai", "zhipu", "01.ai", "baichuan", "suno", "udio", "luma ai", "imagn", "descript",

        # Elite B2B / Infrastructure / FinTech
        "stripe", "databricks", "snowflake", "airbnb", "uber", "lyft", "pinterest", "snap", "snapchat",
        "brex", "plaid", "ramp", "checkout.com", "adyen", "block", "square", "cash app", "rippling", "gusto",
        "palantir", "roblox", "discord", "epic games", "doordash", "instacart", "flexport", "ginkgo bioworks",
        "retell ai", "vanta", "secureframe", "drata", "checkr",

        # Elite Proprietary Trading & Quants (Highest Bar)
        "two sigma", "jane street", "citadel", "citadel securities", "optiver", "hrt", "hudson river trading", 
        "jump trading", "drw", "rentec", "renaissance technologies", "tower research", "wolverine trading", 
        "susquehanna", "sig", "point72", "mlp", "millennium", "de shaw", "d.e. shaw", "akuna capital", "imc trading",
        "worldquant", "aqr", "five rings", "vatic investments", "cubist", "radix", "balyasny", "marshall wace", "xtx markets",
        "headlands tech", "old mission", "belvedere trading", "flow traders",

        # Open Source / Developer Tools / Cloud Core
        "vercel", "hashicorp", "docker", "netlify", "tailscale", "supabase", "cloudflare", "fastly", "figma", 
        "github", "gitlab", "planetscale", "neon", "cockroach labs", "confluent", "temporal", "fly.io", "railway", 
        "render", "linear", "replit", "apollo graphql", "postman", "datadog", "elastic", "mongodb", "redis", "grafana",
        "astronomer", "dbt labs", "fivetran", "pinecone", "milvus", "weaviate", "qdrant", "anthropic", "langchain", "llamaindex",
        "hasura", "chroma", "ngrok", "sentry", "pulumi", "clickhouse", "duckdb", "motherduck", "modal", "baseten", "anyscale",

        # Hardware / Robotics / Advanced Tech
        "tesla", "spacex", "waymo", "cruise", "anduril", "zoox", "boston dynamics", "neuralink", "aurora", "skydio", "shield ai",
        "blue origin", "relativity space", "rocket lab", "planet labs", "epirus", "rebellion defense", "hawkeye 360",
        "form energy", "commonwealth fusion", "helion", " Redwood Materials"
    ],

    # ----------------------------------------------------
    # Tier-2: 0.78 Signal 
    # Globally respected product tech, SaaS giants, decacorns, crypto.
    # ----------------------------------------------------
    0.78: [
        # Enterprise Software & Legacy Heavyweights
        "adobe", "oracle", "salesforce", "atlassian", "twilio", "intuit", "servicenow", "shopify", 
        "ibm", "intel", "sap", "linkedin", "cisco", "bloomberg", "vmware", "red hat", "splunk", "workday", 
        "zoom", "hubspot", "okta", "crowdstrike", "zscaler", "fortinet", "palo alto networks", "nutanix", 
        "box", "dropbox", "canva", "miro", "notion", "airtable", "monday.com", "smartsheet", "asana", "zendesk",
        "docusign", "ringcentral", "f5", "juniper networks", "arista", "equinix", "coupa", "veeva", "toast", 
        "procore", "appian", "pega", "pegasystems", "guidewire", "qualtrics", "medallia", "sprinklr", "braze",
        "akamai", "new relic", "appdynamics", "dynatrace", "mulesoft", "tableau", "looker", "snowflake", "cloudera",
        "rubrik", "cohesity", "pure storage", "netapp", "commvault", "veeam", "illumio", "netskope",

        # Cyber Security Unicorns
        "wiz", "lacework", "snyk", "orca security", "tenable", "qualys", "rapid7", "cyberark", "proofpoint", 
        "mimecast", "sailpoint", "ping identity", "auth0", "sentinelone", "trend micro", "sophos", "arctic wolf", "darktrace",

        # High-Growth SaaS / YC Top Companies
        "webflow", "framer", "mutiny", "glean", "segment", "amplitude", "mixpanel", "heap", "pendo", "posthog", 
        "retool", "appsmith", "zapier", "make", "n8n", "gong", "outreach", "salesloft", "clari", "highspot", 
        "seismic", "lattice", "culture amp", "15five", "navan", "tripactions", "marqeta", "gem", "greenhouse", "lever",
        "iterable", "kustomer", "intercom", "front", "dialpad", "aircall", "gorgias", "podium", "sendbird",
        "algolia", "typeform", "contentful", "sanity", "strapi", "ghost", "webull", "eToro", "koyeb",
        "deel", "papaya global", "remote.com", "oyster", "workato", "tray.io", "celigo", "mural", "lucidchart", "invision",

        # Crypto & Web3 Giants
        "coinbase", "binance", "kraken", "chainlink", "polygon", "consensys", "ripple", "optimism", "arbitrum", 
        "circle", "gemini", "opensea", "alchemy", "solana", "avalanche", "aptos", "sui", "dapper labs", "ledger", "phantom",
        "uniswap", "aave", "makerdao", "lido", "flashbots", "fireblocks", "paxos", "anchorage", "copper", "starkware", "zksync",
        "scroll", "base", "layerzero", "celestia", "wormhole", "pyth", "helium", "stepn", "axie infinity", "yuga labs",

        # Mega B2C / Social / Media / E-commerce 
        "spotify", "x", "twitter", "reddit", "delivery hero", "grab", "gojek", "sea group", "shopee", 
        "mercado libre", "rakuten", "alibaba", "tencent", "bytedance", "tiktok", "baidu", "coupang", "jd.com", "meituan",
        "bukalapak", "tokopedia", "pinduoduo", "netease", "kuaishou", "bilibili", "didi", "shein", "temu", "wish", "etsy", 
        "wayfair", "chewy", "zillow", "redfin", "compass", "opendoor", "peloton", "strava", "duolingo", "tinder", "match group",
        "bumble", "hinge", "roblox", "niantic", "supercell", "king", "zynga", "playtika", "scopely", "jam city",
        "onlyfans", "patreon", "cameo", "masterclass", "coursera", "udemy", "skillshare", "canopy", "hulu", "paramount+", "disney+",

        # Hardware & Semi-Conductors
        "amd", "qualcomm", "broadcom", "arm", "texas instruments", "micron", "tsmc", "asml", "nxp", "analog devices", 
        "marvell", "microchip", "onsemi", "lam research", "applied materials", "kla", "globalfoundries", "western digital", "seagate",
        "mediatek", "renesas", "infineon", "stmicroelectronics", "sk hynix", "kioxia", "wdc",

        # Modern FinTech & Neobanks
        "sofi", "affirm", "chime", "robinhood", "monzo", "revolut", "n26", "klarna", "nubank", "wealthfront", 
        "betterment", "carta", "mercury", "novo", "pipe", "clearco", "stax", "dlocal", "rapyd", "thunes", "marqeta", 
        "flywire", "bill.com", "avidxchange", "tipalti", "divvy", "payfit", "gocardless", "mollie", "checkout", "pleao",
        "upgrade", "current", "varos", "credit karma", "nerdwallet", "mint", "personetics", "forter", "signifyd", "sift"
    ],

    # ----------------------------------------------------
    # Tier-3: 0.62 Signal
    # Top regional unicorns, major banks investing in tech, retail giants.
    # ----------------------------------------------------
    0.62: [
        # Top Tier Indian Tech / APAC Decacorns
        "flipkart", "swiggy", "zomato", "razorpay", "phonepe", "paytm", "cred", "meesho", "oyo", 
        "freshworks", "zoho", "upstox", "groww", "postman", "zerodha", "dream11", "ola", "ola electric", 
        "makemytrip", "pb fintech", "policybazaar", "nykaa", "lenskart", "unacademy", "byjus", 
        "zepto", "blinkit", "cleartax", "sharechat", "bharatpe", "spinny", "urban company", "cars24",
        "browserstack", "mindtickle", "druva", "inmobi", "glance", "amagi", "chargebee", "darwinbox", 
        "lead school", "vedantu", "upgrad", "eruditus", "pharmeasy", "1mg", "curefit", "cult.fit", "healthkart", 
        "pine labs", "mobikwik", "slice", "jupiter", "fi", "rupeek", "khata book", "okcredit", "udaan", "moglix",
        "blackbuck", "rivigo", "delhivery", "xpressbees", "dunzo", "shadowfax", "shiprocket", "billdesk", "ccavenue",
        "gojek", "traveloka", "tokopedia", "bukalapak", "carousell", "ninja van", "lalamove", "klook", "propertyguru",
        "myntra", "jabong", "snapdeal", "shopclues", "purplle", "firstcry", "livspace", "pepperfry", "urban ladder",

        # LATAM & Africa Tech
        "rappi", "kavak", "creditas", "uala", "clip", "quintoandar", "logitex", "dlocal", "stone", "pagseguro",
        "flutterwave", "paystack", "andela", "chipper cash", "wave", "opay", "kuda", "jumia", "mpesa", "safaricom",

        # Top Tier European Tech
        "skyscanner", "transferwise", "wise", "deliveroo", "just eat", "zalando", "hellofresh", "king", "supercell",
        "spotify", "klarna", "revolut", "monzo", "n26", "checkout.com", "adyen", "trustpilot", "darktrace", "criteo", 
        "swappie", "vinted", "tier mobility", "voi", "bolt", "wolt", "celonis", "personio", "contentful", "collibra", "alan", "doctolib", "swile", "mirakl",
        "pigment", "shift technology", "payhawk", "spendesk", "qonto", "trade republic", "scalapay", "getir", "gorillas",

        # Mega Banks & TradFi Tech 
        "jpmorgan", "jpmorgan chase", "goldman sachs", "morgan stanley", "citi", "bank of america", "bofa",
        "capital one", "american express", "amex", "discover", "visa", "mastercard", "paypal",
        "barclays", "credit suisse", "ubs", "hsbc", "wells fargo", "fidelity", "vanguard", "blackrock",
        "state street", "bny mellon", "deutsche bank", "santander", "bnp paribas", "societe generale", "nomura",
        "standard chartered", "royal bank of canada", "rbc", "td bank", "scotiabank", "bmo", "cibc", "us bank", 
        "pnc", "truist", "charles schwab", "td ameritrade", "e-trade", "bloomberg", "janes", "sp global", "moodys", "fitch",
        "allianz", "axa", "zurich", "metlife", "prudential", "new york life", "state farm", "geico", "progressive",

        # Retail, Media, & Logistics Tech Arms
        "walmart", "walmart global tech", "walmart labs", "target", "home depot", "best buy", "costco", "fedex", 
        "ups", "maersk", "dhl", "kroger", "walgreens", "cvs", "cvs health", "lowe's", "ikea", "h&m", "zara",
        "macys", "nordstrom", "sephora", "ulta", "starbucks", "mcdonalds", "dominos", "yum brands", "coca-cola", "pepsico",
        "disney", "warner bros", "discovery", "fox", "nbcuniversal", "comcast", "sony pictures", "paramount", "viacomcbs",
        "nike", "adidas", "under armour", "lululemon", "gap", "levi strauss", "vfc"
    ],

    # ----------------------------------------------------
    # Tier-4: 0.45 Signal
    # Service integrators, consulting, non-tech mega corps, telecos.
    # ----------------------------------------------------
    0.45: [
        # IT Services (WITcH) & Global System Integrators
        "infosys", "tcs", "tata consultancy services", "wipro", "hcl", "hcltech", "accenture", "cognizant", 
        "capgemini", "tech mahindra", "mindtree", "l&t infotech", "lti", "ltimindtree", "hexaware",
        "persistent systems", "kpit", "tata elxsi", "cyient", "birlasoft", "zensa", "mphasis", "ntt data",
        "ibm consulting", "dxc technology", "atos", "sopra steria", "cgi", "fujitsu", "nec", "hitachi", 
        "wipro pariperi", "zensar", "sonata software", "niit technologies", "coforge", "mastek", "eclerx",

        # Global Consulting (General tech consulting roles)
        "deloitte", "pwc", "ey", "kpmg", "mckinsey", "bain", "bcg", "booz allen hamilton", "slalom",
        "oliver wyman", "roland berger", "kearney", "lek consulting", "bdo", "grant thornton", "rsm", "crowe",
        "alvarez & marsal", "fticonsulting", "huron", "navigant", "guidehouse", "cgi group", "gbs", "zS associates",

        # Outsourcing / BPO / Staffing
        "epam", "globant", "endava", "luxoft", "ibex", "conduent", "concentrix", "genpact", "wns", "exl", "taskus",
        "teleperformance", "alorica", "sutherland", "ttec", "afni", "sykes", "css corp", "hinduja global solutions", "hgs",
        "infosys bpm", "tcs bps", "wipro do", "aerotek", "teksystems", "randstad", "adecco", "manpowergroup", "kelly services",

        # Legacy non-tech transitioning to software & Heavy Industry
        "ford", "gm", "general motors", "boeing", "ge", "general electric", "siemens", "bosch", "caterpillar", "john deere", 
        "philips", "honeywell", "lockheed martin", "raytheon", "northrop grumman", "general dynamics", "bae systems",
        "3m", "dupont", "dow", "basf", "bayer", "johnson & johnson", "pfizer", "merck", "novartis", "roche", "gsk", 
        "astrazeneca", "sanofi", "abbvie", "eli lilly", "amgen", "gilead", "biogen", "medtronic", "stryker", "abbott",
        "bp", "shell", "exxonmobil", "chevron", "totalenergies", "conocophillips", "slb", "halliburton", "baker hughes",
        "volkswagen", "toyota", "honda", "nissan", "hyundai", "kia", "stellantis", "bmw", "mercedes-benz", "volvo",
        "rivian", "lucid", "nio", "xpeng", "li auto", "polestar", "fisker", "vinfast",

        # Telecom Giants & Utilities
        "at&t", "verizon", "t-mobile", "vodafone", "bt", "telefonica", "orange", "jio", "reliance jio", "airtel", "vi", 
        "comcast", "charter", "spectrum", "dish", "bell", "rogers", "telus", "singtel", "optus", "telstra", "ntt docomo", 
        "softbank", "kddi", "china mobile", "china telecom", "china unicom", "nextera energy", "duke energy", "dominion"
    ],

    # ----------------------------------------------------
    # Tier-5: 0.30 Signal
    # Smaller agencies, generic SMBs, local non-tech, generic contractors.
    # ----------------------------------------------------
    0.30: [
        "fiverr", "upwork", "freelancer", "toptal", "bairesdev", "crossover", "andela", "x-team", "gun.io",
        "revature", "cognixia", "simplilearn", "general assembly", "local IT shop", "unknown agency", "boutique consulting",
        "local state farm agent", "local real estate", "mom and pop", "small b2b service", "random design house",
        "custom software development", "digital marketing agency", "seo agency", "web dev agency", "wordpress shop",
        "local hospital network", "regional credit union", "local school district", "county government", "state government",
        "small manufacturing plant", "local retail chain", "franchise owner", "family owned business", "independent contractor"
    ]
}
