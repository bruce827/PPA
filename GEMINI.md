# Gemini Project Context: 软件项目评估系统 (PPA)

## 1. Project Overview

This is a full-stack web application named "PPA - Project Portfolio Assessment". Its primary purpose is to provide a systematic, online platform for evaluating the cost and risk of software projects, replacing traditional Excel-based methods.

The system features a step-by-step assessment wizard, dynamic parameter configuration, templating capabilities for reusability, a data visualization dashboard, and the ability to export reports to PDF and Excel.

The project is well-documented, with comprehensive Product Requirements (PRD) and Technical Specification documents located in the `/docs` directory.

## 2. Architecture & Technology

The project follows a classic frontend/backend separation architecture.

*   **Backend (`/server`):**
    *   **Runtime/Framework:** Node.js with Express.js.
    *   **Database:** SQLite3. The database file is `ppa.db`, and the schema is defined in `init-db.js`.
    *   **Key Libraries:** `sqlite3` for database access, `express-validator` for input validation, `pdfkit` for PDF generation, and `exceljs` for Excel generation.
    *   **API:** A RESTful API is exposed under the `/api` prefix. The routes are defined in `/server/routes` and include endpoints for projects, configuration, calculations, and the dashboard.

*   **Frontend (`/frontend/ppa_frontend`):**
    *   **Framework:** React, built upon the **UmiJS** framework (`@umijs/max`).
    *   **UI Library:** Ant Design Pro (`@ant-design/pro-components`) and Ant Design (`antd`).
    *   **Charts:** `@ant-design/charts` for data visualization.
    *   **Package Manager:** The `package.json` suggests `yarn` is used.

## 3. Building and Running

### Backend Server

1.  **Navigate to the directory:**
    ```bash
    cd server
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Initialize the database schema:**
    ```bash
    node init-db.js
    ```
4.  **Seed the database with initial data:**
    ```bash
    cd seed-data
    node seed-all.js
    cd ..
    ```
5.  **Start the server (runs on `http://localhost:3001`):**
    ```bash
    node index.js
    ```

### Frontend Application

1.  **Navigate to the directory:**
    ```bash
    cd frontend/ppa_frontend
    ```
2.  **Install dependencies:**
    ```bash
    yarn
    ```
3.  **Start the development server (runs on `http://localhost:8000`):**
    ```bash
    yarn start
    ```
    *(Note: `yarn start` is an alias for `npm run dev`, which runs `max dev`)*

## 4. Development Conventions

*   **Backend Structure:** The backend follows a standard Model-Service-Controller pattern, with separate directories for `routes`, `controllers`, `services`, and `models`.
*   **Database Initialization:** Database schema is managed via a single script (`init-db.js`). Seeding is handled by scripts in `seed-data`.
*   **Frontend Framework:** The use of `@umijs/max` (UmiJS) implies a convention-over-configuration approach for routing, plugins, and application lifecycle.
*   **Styling:** Ant Design components are used extensively, suggesting a consistent UI/UX based on that design system.
*   **Testing:** The backend includes `jest` and `supertest` for unit and integration testing, although the primary focus seems to be on the application code itself.
*   **Documentation:** The project places a high value on documentation, with detailed PRD and Tech Specs that should be consulted before making significant changes.
