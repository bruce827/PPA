# Module: TenderWriter

## Description

This module provides a complete, end-to-end solution for automatically generating professional tender documents based on technical requirements and scoring criteria.

## Components

-   **Agent:** `agents/TenderWritingAgent.md`
    -   The master coordinator for the entire workflow.
-   **Workflow:** `workflows/GenerateTenderDocument.md`
    -   Defines the 3-phase process: Outline, Content, and Asset Generation.
-   **Tasks:**
    -   `tasks/GenerateOutlineTask.md`: Creates the structured outline.
    -   `tasks/GenerateContentTask.md`: Generates the main text content concurrently.
    -   `tasks/AssetGenerationTask.md`: Interactively generates images from placeholders.

## Directory Structure

-   `/input`: Place your `tech.md` and `score.md` files here.
-   `/output`: All generated files will be placed here.
    -   `/output/outline.json`: The machine-readable document structure.
    -   `/output/outline.md`: The human-readable document structure.
    -   `/output/content/`: Contains the individually generated Markdown files for each section.
    -   `/output/assets/`: Contains the generated image assets.
    -   `/output/content.md`: The final, consolidated tender document.

## How to Use

1.  Place your technical requirements in `input/tech.md` and scoring criteria in `input/score.md`.
2.  Invoke the `TenderWritingAgent` to start the `GenerateTenderDocument` workflow.
3.  The agent will automatically generate the outline and the text content.
4.  After content generation is complete, you can issue commands to the agent to generate the image assets from the placeholders (e.g., "generate `image_id`").

---
*This module was constructed by the Bmad Builder.*
