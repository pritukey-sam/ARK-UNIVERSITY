import ast
import os

def check_file(filepath):
    print(f"Checking {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read())
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            defined_vars = set()
            for arg in node.args.args:
                defined_vars.add(arg.arg)
            
            # Find all assignments in this function
            for subnode in ast.walk(node):
                if isinstance(subnode, ast.Assign):
                    for target in subnode.targets:
                        if isinstance(target, ast.Name):
                            defined_vars.add(target.id)
                        elif isinstance(target, ast.Tuple):
                            for elt in target.elts:
                                if isinstance(elt, ast.Name):
                                    defined_vars.add(elt.id)
                elif isinstance(subnode, ast.With):
                    for item in subnode.items:
                        if isinstance(item.optional_vars, ast.Name):
                            defined_vars.add(item.optional_vars.id)
                elif isinstance(subnode, ast.For):
                    if isinstance(subnode.target, ast.Name):
                        defined_vars.add(subnode.target.id)
            
            # Check usages
            for subnode in ast.walk(node):
                if isinstance(subnode, ast.Name) and isinstance(subnode.ctx, ast.Load):
                    if subnode.id == 'company_id' and subnode.id not in defined_vars:
                        print(f"  [ERROR] Function {node.name}: 'company_id' used but not defined.")

check_file('backend/routes.py')
check_file('backend/routers/courses.py')
check_file('backend/routers/dashboard.py')
check_file('backend/routers/assignments.py')
check_file('backend/routers/user.py')
check_file('backend/routers/progress.py')
check_file('backend/routers/super_admin.py')
check_file('backend/auth.py')
