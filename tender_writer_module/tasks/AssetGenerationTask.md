# Task: AssetGenerationTask

## Description

This task handles the final, interactive phase of the workflow: converting the `[!IMAGE]` placeholders in the generated text into actual image assets.

## Trigger

This task is initiated by a direct user command (e.g., "generate assets") after the `GenerateContentTask` is complete.

## Inputs

-   The directory of Markdown files located in `/output/content/`. These files contain the `[!IMAGE]` placeholders.

## Process

1.  **Scan for Placeholders:** The `TenderWritingAgent` recursively scans all `.md` files within the `/output/content/` directory. It searches for the `> [!IMAGE]` block and parses the `id`, `type`, and `prompt` for each one found.

2.  **Present to User:** The agent compiles a list of all found image `id`s and presents it to the user as a "To-Do list" of images to be generated.

3.  **Interactive Generation Loop:** The agent enters a loop, waiting for user commands.
    -   The user issues a command, e.g., "generate `arch_diagram_01`".
    -   The agent finds the corresponding placeholder details (type and prompt).
    -   **Invoke Generator:** Based on the `type`:
        -   If `mermaid`, it uses a Mermaid rendering library/tool to convert the prompt script into an SVG or PNG file.
        -   If `svg` or `html`, it may call another specialized LLM or tool capable of generating that type of content.
    -   **Save Asset:** The generated image is saved to the `/output/assets/` directory, named after its `id` (e.g., `arch_diagram_01.svg`).

4.  **Update Markdown Files:** Once an image is successfully generated and saved, the agent performs a search-and-replace operation on the relevant `.md` file(s) in `/output/content/`. It replaces the `[!IMAGE]` block with the corresponding Markdown image link (e.g., `![Architecture Diagram](./assets/arch_diagram_01.svg)`). It also updates the main `content.md` file.

5.  The loop continues until the user decides to exit.

## Outputs

-   **Image Files:** A collection of image assets (e.g., `.svg`, `.png`) in the `/output/assets/` directory.
-   **Updated Documents:** The Markdown files in `/output/content/` and the main `/output/content.md` are updated with links to the newly generated images, replacing the placeholders.
