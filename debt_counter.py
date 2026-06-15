import os

def check_file_lines(directory):
    files_300 = []
    files_500 = []
    
    for root, _, files in os.walk(directory):
        if 'node_modules' in root or '.next' in root or '__pycache__' in root or '.git' in root:
            continue
        for file in files:
            if not file.endswith(('.ts', '.tsx', '.py')):
                continue
                
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    lines = sum(1 for _ in f)
                    if lines > 500:
                        files_500.append((path, lines))
                    elif lines > 300:
                        files_300.append((path, lines))
            except Exception:
                pass
                
    return files_300, files_500

print("Frontend:")
f_300, f_500 = check_file_lines('d:/Thundersoft/Autism_V2/frontend')
print("> 300 lines:", f_300)
print("> 500 lines:", f_500)

print("\nBackend:")
b_300, b_500 = check_file_lines('d:/Thundersoft/Autism_V2/web_backend')
print("> 300 lines:", b_300)
print("> 500 lines:", b_500)
