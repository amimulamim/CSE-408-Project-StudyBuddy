import json

# Load JSON data from an external file
with open("A1_G4_StudyBuddy_final.json", "r") as file:
    data = json.load(file)

# Function to convert JSON data to structured LaTeX Beamer format
def generate_beamer(json_data):
    beamer_content = r"""
    \documentclass{beamer}
    \usepackage{hyperref}
    \title{Use Cases and Test Cases Presentation}
    \author{}
    \date{}
    \begin{document}
    \frame{\titlepage}
    """

    for entry in json_data:
        # Extract Use Case information
        usecase = entry.get('usecase', {})
        usecase_name = usecase.get('name', 'Unnamed Use Case')

        # Title Slide for Each Use Case
        beamer_content += f"""
        \\section{{{usecase_name}}}
        \\begin{{frame}}{{Overview and Steps for {usecase_name}}}
        \\centering
        \\LARGE \\textbf{{Use Case Overview: {usecase_name}}}
        \\end{{frame}}
        """

        # Consolidated Slide for Scenario, Preconditions, Actors, and Steps
        beamer_content += f"""
        \\begin{{frame}}{{Overview and Steps for {usecase_name}}}
        \\textbf{{Scenario:}} {usecase.get('scenario', 'N/A')} \\\\
        \\textbf{{Preconditions:}} {usecase.get('preconditions', 'N/A')} \\\\
        \\textbf{{Actors:}} {usecase.get('actors', 'N/A')} \\\\
        \\textbf{{Steps:}}
        \\begin{{enumerate}}
        """
        for step in usecase.get('steps', []):
            beamer_content += f"\\item {step}\n"
        beamer_content += "\\end{enumerate}\n"
        beamer_content += "\\end{frame}\n"

        # Slide for Test Cases - formatted table
        beamer_content += f"""
        \\begin{{frame}}[allowframebreaks]{{Test Cases for {usecase_name}}}
        \\begin{{tabular}}{{|p{{0.4\\textwidth}}|p{{0.5\\textwidth}}|}}
        \\hline
        \\textbf{{Test Case Name}} & \\textbf{{Description}} \\\\
        \\hline
        """
        for testcase in entry.get('testcases', []):
            beamer_content += f"{testcase.get('name', 'Unnamed')} & {testcase.get('description', 'No description')} \\\\\n\\hline\n"
        
        beamer_content += "\\end{tabular}\n\\end{frame}\n"

    beamer_content += "\\end{document}"
    return beamer_content

# Write LaTeX Beamer content to a file
beamer_output = generate_beamer(data)
with open("output_beamer.tex", "w") as beamer_file:
    beamer_file.write(beamer_output)

print("Enhanced Beamer presentation generated: output_beamer.tex")
