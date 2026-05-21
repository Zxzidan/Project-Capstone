import os

root = r"C:\Users\Dandi\.gemini"
print(f"Scanning {root} for target files...")
found = []
try:
    for dirpath, dirnames, filenames in os.walk(root):
        for filename in filenames:
            lower_name = filename.lower()
            if "model.json" in lower_name or "shard" in lower_name or "scanner" in lower_name or "finova" in lower_name:
                full_path = os.path.join(dirpath, filename)
                try:
                    size = os.path.getsize(full_path)
                    print(f"Found: {full_path} ({size} bytes)")
                    found.append((full_path, size))
                except Exception as e:
                    print(f"Found (error reading size): {full_path} - {e}")
except Exception as e:
    print(f"Error during scan: {e}")

print(f"Scan complete. Total found: {len(found)}")
