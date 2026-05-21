import os

root = r"C:\Users\Dandi\AppData"
ignore_patterns = ["node_modules", ".git", ".gradle", "Package Cache", "Microsoft", "Local Settings", "Temp"]

print(f"Scanning {root} for target files...")
found = []
try:
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune ignore patterns
        dirnames[:] = [d for d in dirnames if not any(p.lower() in d.lower() or p.lower() in os.path.join(dirpath, d).lower() for p in ignore_patterns)]
        
        for filename in filenames:
            lower_name = filename.lower()
            if "model.json" in lower_name or "shard" in lower_name or "scanner" in lower_name or "finova" in lower_name:
                full_path = os.path.join(dirpath, filename)
                if any(p.lower() in full_path.lower() for p in ignore_patterns):
                    continue
                try:
                    size = os.path.getsize(full_path)
                    print(f"Found: {full_path} ({size} bytes)")
                    found.append((full_path, size))
                except Exception as e:
                    print(f"Found (error reading size): {full_path} - {e}")
except Exception as e:
    print(f"Error during scan: {e}")

print(f"Scan complete. Total found: {len(found)}")
