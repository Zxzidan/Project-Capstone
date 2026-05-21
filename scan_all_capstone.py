import os

root = r"c:\Users\Dandi\Desktop\OneDrive\FILE BACKUP\PROJECT CAPSTONE"
print(f"Scanning ALL files in {root} (no ignores!)...")
found = []
for dirpath, dirnames, filenames in os.walk(root):
    for filename in filenames:
        full_path = os.path.join(dirpath, filename)
        lower_name = filename.lower()
        
        # We want to look for anything that looks like model, shard, scanner, or is a .bin file
        if "model.json" in lower_name or "shard" in lower_name or "scanner" in lower_name or "finova-ai" in lower_name or filename.endswith(".bin"):
            try:
                size = os.path.getsize(full_path)
                print(f"Found: {full_path} ({size} bytes)")
                found.append(full_path)
            except Exception as e:
                print(f"Error reading {full_path}: {e}")

print(f"Scan complete. Total found: {len(found)}")
