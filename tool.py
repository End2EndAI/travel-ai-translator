import ast

def extract_imports(file_path):
    with open(file_path, 'r') as file:
        tree = ast.parse(file.read())
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                package_name = node.module.split('.')[0]
                imports.append(package_name)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    package_name = alias.name.split('.')[0]
                    imports.append(package_name)
    return imports

python_file_path = 'flask_app.py'
imports = extract_imports(python_file_path)


def filter_packages(packages, imports):
    required_packages = []
    for package in packages:
        package_name = package.split('==')[0]
        if package_name in imports:
            required_packages.append(package)
    return required_packages

with open('requirements.txt', 'r') as file:
    pip_list_output = file.read()

packages = [line.split(' ')[0] for line in pip_list_output.split('\n')[2:-1]]  # Replace pip_list_output with the actual output of 'pip list'
required_packages = filter_packages(packages, imports)


def write_requirements_txt(required_packages, output_file):
    with open(output_file, 'w') as file:
        file.write('\n'.join(required_packages))

output_file_path = 'requirements_tmp.txt'  # Replace with the desired output file path
write_requirements_txt(required_packages, output_file_path)
