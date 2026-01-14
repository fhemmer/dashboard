# Convenience script to run cloc with project-specific exclusions
cloc . --exclude-dir=node_modules,.next,coverage,dist,reference --not-match-f="package-lock.json|coverage-output.txt|coverage-output.txt.bak" @args
