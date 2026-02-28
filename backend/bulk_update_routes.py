import os
import re
import glob

routes_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'routes')

# Roles definitions mapped to their new sets
ROLE_SETS = {
    'all_except_system': ['Super_admin', 'management', 'shop_manager'],
    'invoices': ['Super_admin', 'management', 'shop_manager', 'driver'],
    'system_only': ['Super_admin', 'management'],
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Route mappings to new role sets:
    filename = os.path.basename(filepath)
    if filename == 'invoices.py':
        new_roles = ROLE_SETS['invoices']
    elif filename in ['unit_price.py', 'item_list.py', 'auth.py']:
        new_roles = ROLE_SETS['system_only']
    else:
        new_roles = ROLE_SETS['all_except_system']

    # 1. Update @role_required decorators
    # Pattern to match @role_required([...])
    pattern = r"@role_required\(\[(.*?)\]\)"
    
    def replacer(match):
        # Format the new list of roles as string
        roles_str = ", ".join(f"'{role}'" for role in new_roles)
        return f"@role_required([{roles_str}])"

    content = re.sub(pattern, replacer, content)

    # 2. Update current_user.role.name checks
    # Replace current_user.role.name != 'super_admin' with not is_super_user(current_user)
    # Wait, is_super_user handles the checks. We need to import it if modified.
    # Actually, we can just replace `current_user.role.name != 'super_admin'` with `current_user.role.name not in ['Super_admin', 'management']`
    
    content = content.replace("current_user.role.name != 'super_admin'", "current_user.role.name not in ['Super_admin', 'management']")

    with open(filepath, 'w') as f:
        f.write(content)

    print(f"Processed {filename}")


if __name__ == '__main__':
    for filepath in glob.glob(os.path.join(routes_dir, '*.py')):
        process_file(filepath)
