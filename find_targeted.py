import os

search_roots = [
    r"C:\Users\Dandi\Downloads",
    r"c:\Users\Dandi\Desktop\OneDrive\FILE BACKUP"
]

print("Searching specifically for model.json, group1-shard, and scanner...")
for root in search_roots:
    if not os.path.exists(root):
        continue
    for dirpath, dirnames, filenames in os.walk(root):
        # Let's not ignore anything in these specific user directories!
        for filename in filenames:
            fn_lower = filename.lower()
            if "model.json" in fn_lower or "shard" in fn_lower or "scanner" in fn_lower:
                print(f"MATCH: {os.path.join(dirpath, filename)} ({os.path.getsize(os.path.join(dirpath, filename))} bytes)")
