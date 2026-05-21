import os

root = r"C:\\"
ignore_roots = ["Windows", "Program Files", "Program Files (x86)", "ProgramData", "System Volume Information", "$RECYCLE.BIN", "Users", "Documents and Settings"]

print("Scanning root of C: drive...")
found = []
try:
    for item in os.listdir(root):
        if item in ignore_roots:
            continue
        full_path = os.path.join(root, item)
        if os.path.isdir(full_path):
            # Scan this directory recursively
            print(f"Scanning directory: {full_path}")
            for dirpath, dirnames, filenames in os.walk(full_path):
                # Prune common large dirs
                dirnames[:] = [d for d in dirnames if not any(p in d for p in ["node_modules", ".git", ".gradle", "Package Cache"])]
                
                for filename in filenames:
                    fn_lower = filename.lower()
                    if "model.json" in fn_lower or "shard" in fn_lower or "scanner" in fn_lower or "finova" in fn_lower:
                        match_path = os.path.join(dirpath, filename)
                        print(f"Found match: {match_path}")
                        found.append(match_path)
except Exception as e:
    print(f"Error during scan: {e}")

print(f"Scan complete. Total found: {len(found)}")
