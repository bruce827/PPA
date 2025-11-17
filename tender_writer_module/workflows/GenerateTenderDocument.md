# Workflow: GenerateTenderDocument

## Description

This workflow defines the end-to-end process for creating a complete tender document, orchestrated by the `TenderWritingAgent`.

---

### Phase 1: Outline Generation

-   **Trigger:** Workflow start.
-   **Input:** `tech.md`, `score.md` from the `/input` directory.
-   **Task:** `GenerateOutlineTask`.
-   **Action:**
    1.  The agent calls an LLM to analyze the input documents.
    2.  The LLM returns a 3-level (Chapter-Section-Subsection) outline.
-   **Output:**
    -   `outline.json` in the `/output` directory.
    -   `outline.md` in the `/output` directory.

---

### Phase 2: Content Generation

-   **Trigger:** Successful completion of Phase 1.
-   **Input:** `outline.json` from the `/output` directory.
-   **Task:** `GenerateContentTask`.
-   **Action:**
    1.  The agent parses `outline.json` to get all subsections.
    2.  It creates a concurrent job queue (max 15 workers, batch size 15, 200ms delay between batches).
    3.  For each subsection, it calls an LLM to generate content (>=5000 chars), instructing it to include `[!IMAGE]` placeholders where appropriate.
    4.  The generated content for each section is saved as a separate `.md` file in the `/output/content` directory.
    5.  All parts are assembled into a single `content.md` in the `/output` directory.
-   **Output:**
    -   Structured `.md` files in `/output/content/`.
    -   A complete `content.md` in `/output/`.

---

### Phase 3: Asset Generation

-   **Trigger:** User command after Phase 2 is complete.
-   **Input:** `.md` files in the `/output/content` directory.
-   **Task:** `AssetGenerationTask` (interactive).
-   **Action:**
    1.  The agent scans all `.md` files for `[!IMAGE]` placeholders.
    2.  It presents a list of found image IDs to the user.
    3.  The user selects an ID to generate.
    4.  The agent uses the appropriate tool/LLM based on the placeholder's `type` and `prompt`.
    5.  The generated image is saved to the `/output/assets` directory.
    6.  The corresponding placeholder in the `.md` file is replaced with a link to the generated image.
-   **Output:**
    -   Image files (e.g., `.svg`, `.png`) in `/output/assets/`.
    -   Updated `.md` files in `/output/content/` and `content.md`.
