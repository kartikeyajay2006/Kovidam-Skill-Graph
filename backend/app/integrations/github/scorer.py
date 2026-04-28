def score_repository(analysis_data: dict, role: str = "job") -> dict:
    """
    Calculates normalized scores (0.0 to 1.0) for repository metrics and 
    computes an overall Contribution Score based on the role profile weighting.
    """
    # 1. Code Ownership (0.0 - 1.0)
    retention_audit = analysis_data.get("target_user_code_retention_audit", {})
    code_ownership_score = 0.0
    if "surviving_percentage" in retention_audit:
        pct_str = str(retention_audit["surviving_percentage"]).replace("%", "")
        try:
            code_ownership_score = float(pct_str) / 100.0
        except ValueError:
            pass
            
    # 2. PR Depth (0.0 - 1.0)
    pr_stats = analysis_data.get("target_user_pr_stats", {})
    total_prs = pr_stats.get("total_merged_prs", 0)
    prs = pr_stats.get("prs", [])
    pr_depth_score = 0.0
    
    if total_prs > 0:
        # Evaluate depth by average lines changed per PR (from the detailed subset)
        total_lines = sum(pr.get("additions", 0) + pr.get("deletions", 0) for pr in prs)
        avg_lines = total_lines / len(prs) if prs else 0
        
        # Scoring logic: 5+ PRs and good avg size -> high score
        volume_score = min(total_prs / 5.0, 1.0) # Up to 1.0 for 5+ PRs
        size_score = min(avg_lines / 200.0, 1.0) # Sweet spot around 200 lines per PR
        pr_depth_score = (volume_score * 0.6) + (size_score * 0.4)
        
    # 3. Repo Quality (0.0 - 1.0)
    tech_stack = analysis_data.get("identified_tech_stack_dependencies", [])
    total_repo_lines = retention_audit.get("total_project_lines", 0)
    
    tech_score = min(len(tech_stack) / 10.0, 1.0) # Great if they have 10+ dependencies
    size_score = min(total_repo_lines / 5000.0, 1.0) # Solid if over 5k lines
    repo_quality_score = (tech_score * 0.5) + (size_score * 0.5)
    
    # 4. Reality (0.0 - 1.0)
    # Three orthogonal signals:
    #
    # ENTROPY (40%): Shannon entropy of the daily commit distribution.
    #   H = -sum(p_i * log2(p_i))   normalized by log2(active_days).
    #   H_norm = 0  ← all commits on one day (worst)
    #   H_norm = 1  ← commits perfectly uniform across all days (best)
    #
    # LIFESPAN (40%): Calendar days between first and last commit.
    #   score = min(lifespan_days / 30, 1.0)
    #   A project spanning 30+ days gets full marks.
    #
    # BURST FACTOR (20%): How much of the project was pushed on the single busiest day.
    #   burst = 1 - (max_single_day / total_commits)
    #   All code on one day → burst = 0.  Evenly spread → burst → 1.
    #
    # Final: reality = 0.4*entropy + 0.4*lifespan + 0.2*burst
    import math
    from collections import defaultdict
    from datetime import datetime

    commits = analysis_data.get("target_user_recent_commits", [])
    reality_score = 0.0
    if commits:
        commits_by_day = defaultdict(int)
        for c in commits:
            date_str = c.get("date", "")
            if date_str:
                day = date_str.split("T")[0]
                commits_by_day[day] += 1

        num_commits = len(commits)
        active_days = len(commits_by_day)

        if active_days > 0 and num_commits > 0:
            # --- Entropy ---
            if active_days == 1:
                entropy_score = 0.0  # All on one day by definition
            else:
                probs = [count / num_commits for count in commits_by_day.values()]
                raw_h = -sum(p * math.log2(p) for p in probs if p > 0)
                max_h = math.log2(active_days)
                entropy_score = raw_h / max_h  # Normalized 0→1

            # --- Lifespan ---
            sorted_days = sorted(commits_by_day.keys())
            try:
                first = datetime.strptime(sorted_days[0], "%Y-%m-%d")
                last  = datetime.strptime(sorted_days[-1], "%Y-%m-%d")
                lifespan_days = (last - first).days
            except ValueError:
                lifespan_days = 0
            lifespan_score = min(lifespan_days / 30.0, 1.0)

            # --- Burst Factor ---
            max_single_day = max(commits_by_day.values())
            burst_factor = 1.0 - (max_single_day / num_commits)

            # --- Combined ---
            reality_score = (entropy_score * 0.4) + (lifespan_score * 0.4) + (burst_factor * 0.2)

        
    # 5. Collaborator (0.0 - 1.0)
    user_role = analysis_data.get("target_user_role", "")
    
    collaborator_score = 0.0
    if user_role == "Owner":
        collaborator_score = 1.0
    elif user_role == "Direct Collaborator":
        collaborator_score = 0.8
    elif user_role == "External Open-Source Contributor":
        collaborator_score = 0.9 # Good signal
    else:
        collaborator_score = 0.1
        
    # Apply weights based on role
    if role.lower() == "internship":
        weights = {
            "code_ownership": 0.4,
            "pr_depth": 0.1,
            "repo_quality": 0.15,
            "reality": 0.25,
            "collaborator": 0.1
        }
    else: # Default Job
        weights = {
            "code_ownership": 0.3,
            "pr_depth": 0.3,
            "repo_quality": 0.2,
            "reality": 0.2,
            "collaborator": 0.1
        }
        
    final_score = (
        (code_ownership_score * weights["code_ownership"]) +
        (pr_depth_score * weights["pr_depth"]) +
        (repo_quality_score * weights["repo_quality"]) +
        (reality_score * weights["reality"]) +
        (collaborator_score * weights["collaborator"])
    )
    
    # Cap at 1.0 just in case
    final_score = min(final_score, 1.0)
    
    # Format scores for output
    return {
        "overall_contribution_score": round(final_score, 4),
        "evaluation_role_profile": role.lower(),
        "score_breakdown_normalized": {
            "code_ownership": round(code_ownership_score, 4),
            "pr_depth": round(pr_depth_score, 4),
            "repo_quality": round(repo_quality_score, 4),
            "reality": round(reality_score, 4),
            "collaborator": round(collaborator_score, 4)
        },
        "applied_weights": weights
    }
