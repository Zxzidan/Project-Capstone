import os

search_roots = [
    r"c:\Users\Dandi\Desktop",
    r"c:\Users\Dandi\Downloads",
    r"c:\Users\Dandi\Documents",
    r"c:\Users\Dandi\Desktop\OneDrive",
]

target_names = {"model.json", "group1-shard1.bin", "scanner.html", "project-finova"}

print("Searching for files...")
found = []
for root in search_roots:
    if not os.path.exists(root):
        continue
    for dirpath, dirnames, filenames in os.walk(root):
        # Avoid traversing deep into node_modules or system folders
        if any(p in dirpath for p in ["node_modules", "AppData", "Local Settings", "Microsoft", "Package Cache", ".git"]):
            continue
        
        # Check folder name
        if os.path.basename(dirpath) in target_names:
            print(f"Found folder: {dirpath}")
            found.append(dirpath)
            
        for filename in filenames:
            if filename in target_names or "group1-shard" in filename or "scanner" in filename:
                full_path = os.path.join(dirpath, filename)
                print(f"Found file: {full_path}")
                found.append(full_path)

print(f"Done searching. Total found: {len(found)}")
