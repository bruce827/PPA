# Task: GenerateOutlineTask

## Description

This task is responsible for the first phase of the `GenerateTenderDocument` workflow: analyzing the input documents and generating a structured outline.

## Inputs

-   `tech.md`: A Markdown file containing the technical requirements. Located in the `/input` directory.
-   `score.md`: A Markdown file containing the scoring criteria. Located in the `/input` directory.

## Process

1.  **Load Inputs:** The `TenderWritingAgent` reads the content of `tech.md` and `score.md`.
2.  **Construct Prompt:** The agent constructs a detailed prompt for the LLM, instructing it to act as a "Tender Document Preparation Expert". The prompt will include the content of the two input files and the strict JSON output format requirement.
3.  **Invoke LLM:** The agent calls the LLM with the constructed prompt.
4.  **Validate Output:** The agent receives the JSON output from the LLM and validates it against the required schema (i.e., `body_paragraphs` array with the correct nested structure). If validation fails, the process can be retried or an error can be raised.
5.  **Generate Markdown Outline:** The agent parses the validated JSON and generates a human-readable `outline.md` version of the outline.

## Outputs

-   `outline.json`: A JSON file containing the structured 3-level outline. Saved to the `/output` directory.
-   `outline.md`: A Markdown file for the human-readable outline. Saved to the `/output` directory.
