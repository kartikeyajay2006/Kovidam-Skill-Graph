#!/usr/bin/env python3
"""Test script to verify experience extraction from resumes."""

import asyncio
import os
import sys
import json
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services.resume_parser import parse_resume_and_enrich

async def test_resume_extraction():
    """Test resume extraction with the updated parser."""
    # Find a test resume PDF (Varun's resume)
    test_resume_path = Path(__file__).parent / "backend" / "data" / "extracted_resumes"
    
    # Find a PDF file in the data directory or use one from the project
    pdf_files = list(Path(__file__).parent.glob("**/*.pdf"))
    
    if not pdf_files:
        print("No PDF files found. Please provide a resume PDF.")
        return
    
    resume_file = pdf_files[0]
    print(f"Testing with resume: {resume_file}")
    
    try:
        result = await parse_resume_and_enrich(str(resume_file), "internship")
        
        print("\n=== Resume Extraction Results ===\n")
        
        # Display the results
        print("Skills Section:")
        skills = result.get("skills_section", {})
        print(f"  Count: {skills.get('count', 0)}")
        print(f"  Items: {skills.get('items', [])[:5]}...")  # Show first 5
        
        print("\nProjects Section:")
        projects = result.get("projects_section", {})
        print(f"  Count: {projects.get('count', 0)}")
        for project in projects.get('items', []):
            print(f"  - {project.get('title', 'N/A')}")
        
        print("\nExperience Section (NEW):")
        experience = result.get("experience_section", {})
        print(f"  Count: {experience.get('count', 0)}")
        for exp in experience.get('items', []):
            print(f"  - {exp.get('position', 'N/A')} at {exp.get('company', 'N/A')}")
            print(f"    Duration: {exp.get('duration', 'N/A')}")
            print(f"    Description: {exp.get('description', 'N/A')[:80]}...")
        
        print("\nExtraction Metadata:")
        meta = result.get("structured_extraction_meta", {})
        print(f"  Provider: {meta.get('provider', 'N/A')}")
        print(f"  Status: {meta.get('status', 'N/A')}")
        print(f"  Chunks Processed: {meta.get('chunks_processed', 'N/A')}")
        print(f"  Chunks Succeeded: {meta.get('chunks_succeeded', 'N/A')}")
        
        # Save the full result as JSON for inspection
        output_file = Path(__file__).parent / "test_extraction_result.json"
        with open(output_file, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\nFull result saved to: {output_file}")
        
    except Exception as e:
        print(f"Error during extraction: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_resume_extraction())
