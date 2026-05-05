"""
Hard constraints and guards for skill token quality.
These constants keep matching robust against noise, generic words, and malformed input.
"""

SKILL_TOKEN_MIN_LEN = 2
SKILL_TOKEN_MAX_LEN = 48

# Short tokens that are valid technical skills despite length.
SKILL_SHORT_TOKEN_ALLOWLIST = {
    "c",
    "go",
    "r",
    "js",
    "ts",
    "ai",
    "ml",
    "nlp",
    "sql",
}

# Tokens that are too generic to improve semantic ranking quality.
SEMANTIC_GENERIC_TOKENS = {
    "api",
    "backend",
    "cloud",
    "database",
    "mobile",
    "nosql",
    "sql",
    "testing",
    "web",
}

# Single-letter tokens are ambiguous in free prose and require explicit phrasing.
AMBIGUOUS_SINGLE_CHAR_SKILLS = {"c", "r"}

# Generic non-skill terms frequently seen in job forms and resume prose.
SKILL_STOPWORDS = {
    "developer",
    "engineer",
    "intern",
    "internship",
    "fresher",
    "experience",
    "project",
    "projects",
    "team",
    "good",
    "great",
    "strong",
    "basic",
    "advanced",
    "etc",
    "others",
    "other",
    "technology",
    "technologies",
    "tools",
    "framework",
    "frameworks",
    "backend",
    "frontend",
    "fullstack",
    "passionate",
    "enthusiast",
    "hardworking",
    "dedicated",
    "responsible",
    "self motivated",
    "quick learner",
}
