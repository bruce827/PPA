# AGENTS.md

# Project Portfolio Assessment System - Development Guide

## Project Overview

PPA (Project Portfolio Assessment) is a web-based system that replaces traditional Excel-based project cost and risk assessment processes. It provides a systematic, online workflow for software project evaluation with AI-powered assistance.

**Core Capabilities:**

- Step-by-step assessment wizard for risk, workload, and cost evaluation
- Real-time calculation engine with rating factor algorithms
- Template-based project creation for efficiency
- AI-assisted risk assessment, module analysis, and workload evaluation
- PDF and Excel export with internal/external templates
- Dashboard for data visualization and trend analysis
- Web3D project assessment (specialized workflow)
- AI model and prompt template management

## Technology Stack

### Frontend (`frontend/ppa_frontend/`)

- **Framework**: UmiJS Max (v4.5.2) with React 18 & TypeScript 5.0+
- **UI Library**: Ant Design v5 + ProComponents
- **Data Visualization**: @ant-design/charts (G2-based)
- **Package Manager**: Yarn (v1.22.17+)
- **Build Tool**: Webpack (configured by Umi Max)
- **Code Quality**: Prettier + ESLint + Husky + lint-staged
- **State Management**: UmiJS `initialState` and `model`

### Backend (`server/`)

- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Database**: SQLite3 (file-based)
- **Testing**: Jest + Supertest
- **Documentation**: PDFKit + ExcelJS
- **AI Providers**: OpenAI, Doubao (豆包) with unified interface

## Key Configuration Files

### Frontend Configuration
- `frontend/ppa_frontend/.umirc.ts` - UmiJS routing and build configuration
- `frontend/ppa_frontend/tsconfig.json` - TypeScript configuration (extends Umi)
- `frontend/ppa_frontend/.prettierrc` - Code formatting rules with import organization
- `frontend/ppa_frontend/.eslintrc.js` - ESLint rules
- `frontend/ppa_frontend/package.json` - Dependencies and scripts

### Backend Configuration
- `server/package.json` - Dependencies and scripts
- `server/.env.example` - Environment variables template
- `server/config/database.js` - SQLite singleton connection management
- `server/config/server.js` - Server port and environment settings
- `server/init-db.js` - Database schema initialization

### Project-Level Configuration
- `.gitignore` - Git ignore patterns (includes logs, build artifacts, IDE files)
- `README.md` - Project overview and quick start
- `docs/PRD.md` - Product requirements and feature specifications

## Project Structure

```
PPA/
├── frontend/ppa_frontend/          # Frontend application
│   ├── .umirc.ts                   # UmiJS configuration (routing, proxy, build)
│   ├── tsconfig.json               # TypeScript configuration
│   ├── .prettierrc                 # Prettier formatting rules
│   ├── .eslintrc.js                # ESLint configuration
│   ├── package.json                # Frontend dependencies (Yarn)
│   ├── src/
│   │   ├── pages/                  # Page components (feature-based)
│   │   │   ├── Assessment/         # Standard project assessment wizard
│   │   │   │   ├── New.tsx         # New assessment form
│   │   │   │   ├── Detail.tsx      # Project detail view
│   │   │   │   ├── History.tsx     # Assessment history list
│   │   │   │   └── components/     # Assessment-specific components
│   │   │   │       ├── AIAssessmentModal.tsx
│   │   │   │       ├── RiskScoringForm.tsx
│   │   │   │       ├── WorkloadEstimation.tsx
│   │   │   │       └── ProjectModuleAnalyzer.tsx
│   │   │   ├── Web3D/              # Web3D project assessment
│   │   │   │   ├── New.tsx
│   │   │   │   ├── Detail.tsx
│   │   │   │   └── History.tsx
│   │   │   ├── Config/             # Parameter configuration
│   │   │   ├── Dashboard/          # Data visualization and analytics
│   │   │   ├── ModelConfig/        # AI model and prompt management
│   │   │   └── Monitoring/         # AI logs monitoring
│   │   ├── services/               # API service layers (organized by domain)
│   │   │   ├── api.ts              # API client configuration
│   │   │   ├── assessment/         # Assessment API calls
│   │   │   ├── config/             # Configuration API calls
│   │   │   ├── dashboard/          # Dashboard API calls
│   │   │   ├── aiModel/            # AI model management APIs
│   │   │   └── web3d/              # Web3D specific APIs
│   │   ├── components/             # Shared reusable components
│   │   ├── constants/              # Frontend constants
│   │   ├── utils/                  # Frontend utilities
│   │   ├── types/                  # TypeScript interfaces
│   │   ├── models/                 # Global state management
│   │   ├── access.ts               # Access control configuration
│   │   └── app.tsx                 # Application entry configuration
│   └── dist/                       # Production build output
├── server/                         # Backend API
│   ├── index.js                    # Application entry point
│   ├── init-db.js                  # Database initialization script
│   ├── package.json                # Backend dependencies (npm)
│   ├── ppa.db                      # SQLite database file
│   ├── .env.example                # Environment variables template
│   ├── config/                     # Configuration layer
│   │   ├── database.js             # SQLite singleton connection
│   │   └── server.js               # Server settings
│   ├── routes/                     # HTTP route definitions (modular)
│   │   ├── index.js                # Routes entry point
│   │   ├── ai.js                   # AI-related routes
│   │   ├── projects.js             # Project management routes
│   │   ├── calculation.js          # Real-time calculation routes
│   │   ├── config.js               # Configuration routes
│   │   ├── dashboard.js            # Dashboard data routes
│   │   └── health.js               # Health check routes
│   ├── controllers/                # Request handlers
│   │   ├── aiController.js
│   │   ├── projectController.js
│   │   ├── calculationController.js
│   │   └── configController.js
│   ├── services/                   # Business logic layer
│   │   ├── aiRiskAssessmentService.js
│   │   ├── aiModuleAnalysisService.js
│   │   ├── aiWorkloadEvaluationService.js
│   │   ├── calculationService.js   # Core calculation engine
│   │   ├── projectService.js
│   │   ├── exportService.js        # PDF/Excel generation
│   │   └── aiFileLogger.js         # AI call logging
│   ├── models/                     # Data access layer
│   │   ├── projectModel.js
│   │   ├── configModel.js
│   │   ├── aiModelModel.js
│   │   └── aiAssessmentLogModel.js
│   ├── providers/                  # AI provider integrations
│   │   └── ai/
│   │       ├── openaiProvider.js
│   │       └── doubaoProvider.js
│   ├── middleware/                 # Express middleware
│   │   └── errorHandler.js         # Global error handling
│   ├── migrations/                 # Database schema migrations
│   │   ├── 001_create_ai_model_configs.js
│   │   ├── 002_create_prompt_templates.js
│   │   ├── 003_create_ai_prompts_table.js
│   │   └── 004_web3d_assessment.js
│   ├── seed-data/                  # Initial data scripts
│   │   ├── seed-all.js             # Seed all data
│   │   ├── seed-roles.js
│   │   ├── seed-risk-items.js
│   │   └── seed-travel-costs.js
│   ├── tests/                      # Test suites
│   │   ├── *.test.js               # Unit and integration tests
│   │   └── calculationService.test.js
│   ├── utils/                      # Backend utilities
│   │   ├── constants.js
│   │   ├── rating.js               # Rating factor algorithm
│   │   └── errors.js               # Error definitions
│   └── logs/                       # Runtime logs (gitignored)
├── docs/                           # Documentation
│   ├── PRD.md                      # Main product requirements
│   ├── prd/                        # Detailed feature PRDs
│   │   ├── ai-risk-assessment-backend-step1.md
│   │   ├── calculation-logic-spec.md
│   │   ├── model-config-spec.md
│   │   └── web3d-assessment-spec.md
│   └── bugfix/                     # Bug fix documentation
│       ├── BACKEND-BUGFIX-CONSOLIDATED.md
│       ├── FRONTEND-BUGFIX-CONSOLIDATED.md
│       └── AI-LOGGING-NOTES.md
├── scripts/                        # Utility scripts (currently empty)
├── .github/                        # GitHub configuration
├── .gitignore                      # Git ignore patterns
├── README.md                       # Project overview
└── AGENTS.md                       # This file
```

## Build and Development Commands

### Prerequisites
- Node.js 16+ installed
- Yarn package manager installed globally (for frontend)
- npm installed (for backend)

### Frontend Development
```bash
cd frontend/ppa_frontend

# Install dependencies (uses Yarn only - critical!)
yarn install

# Start development server (http://localhost:8000)
yarn dev
# or
yarn start

# Build for production
yarn build

# Format code (Prettier with plugins)
yarn format

# Type checking (via TypeScript)
# Runs automatically during build
```

**Important**: Frontend MUST use Yarn, not npm. The project uses Yarn-specific features and lock file.

### Backend Development
```bash
cd server

# Install dependencies
npm install

# Initialize database tables (idempotent, safe to re-run)
node init-db.js

# Seed initial data (roles, travel costs, risk items)
cd seed-data
node seed-all.js

# Start API server (http://localhost:3001, default port)
node index.js

# Run tests
npm test

# Run specific test file
npm test calculationService.test.js
```

### Running Both Services
The frontend proxies API requests to the backend via UmiJS proxy configuration (see `.umirc.ts`). Both services must run in parallel:
- Frontend dev server: `http://localhost:8000`
- Backend API server: `http://localhost:3001`

### Production Build
```bash
# Frontend
cd frontend/ppa_frontend
yarn build  # Creates dist/ folder with static assets

# Backend  
cd server
npm install --production
node index.js  # Set PORT environment variable if needed
```

## Architecture Details

### Backend Three-Tier Architecture

1. **Controller Layer** (`/controllers`)
   - Receives HTTP requests and extracts parameters
   - Calls service layer for business logic
   - Formats responses (always `{success: boolean, data: any}`)
   - Logs request performance metrics with duration
   - Handles errors and passes to error middleware
   - Naming pattern: `{feature}Controller.js`

2. **Service Layer** (`/services`)
   - Implements core business logic
   - No direct database operations (uses models)
   - Calculation engine in `calculationService.js`
   - AI integration services for risk/module/workload assessment
   - Export service for PDF/Excel generation
   - Logging and performance tracking
   - Timeout handling for AI calls
   - Naming pattern: `{feature}Service.js`

3. **Model Layer** (`/models` and `/providers`)
   - **Data Models**: Direct database operations with SQLite
     - SQL query encapsulation
     - Data transformation before returning to services
     - Naming pattern: `{feature}Model.js`
   - **AI Providers**: External AI API integrations
     - OpenAI and Doubao (豆包) providers
     - Unified interface for different providers
     - Provider selection based on configuration
     - Naming pattern: `{provider}Provider.js`

Key architectural principles:
- **Single database connection**: Managed through singleton pattern in `config/database.js`
- **Global error handling**: Centralized middleware in `middleware/errorHandler.js`
- **Template reusing mechanism**: Projects and templates share `projects` table with `is_template` flag
- **Unit consistency**: Frontend uses "yuan" (元), backend outputs "ten-thousand yuan (万元)"
- **Response consistency**: All API responses wrapped in `{success: boolean, data: any, error?: string}`

### Frontend Architecture

- **Routing**: Declarative routing in `.umirc.ts` with redirect to `/dashboard`
  - Feature-based route organization
  - Nested routes for complex features
  - `hideInMenu` for hidden routes
- **API Proxy**: `/api` requests proxy to backend at `http://localhost:3001`
- **State Management**: UmiJS `initialState` and `model` for global state
  - Global state in `src/models/global.ts`
  - Local component state with React hooks
- **Component Organization**: Feature-based directory structure
  - Page components in `src/pages/{Feature}/`
  - Shared components in `src/components/`
  - Feature-specific components in `src/pages/{Feature}/components/`
- **Type Safety**: TypeScript with interfaces in `src/types/`
- **API Services**: Organized by domain in `src/services/{domain}/`
- **Styling**: Ant Design components with theme customization

### AI Integration Architecture

**Multi-Provider Support**:
- Dynamic provider selection based on configuration
- Unified interface across providers
- Provider-specific implementations in `server/providers/ai/`

**AI Features**:
- Risk assessment scoring with name normalization
- Module decomposition analysis (3-level hierarchy)
- Workload estimation by role with delivery factors
- Prompt-based analysis with variable substitution
- Confidence scoring for AI predictions

**Request Flow**:
1. Controller receives request with prompt/template
2. Service validates input and selects AI provider
3. Template variables substituted in prompt
4. Provider makes API call with timeout protection
5. Response parsed and standardized
6. Results logged to file system and database
7. Response returned to client

**Logging System** (`/services/aiFileLogger.js`):
- All AI requests/responses logged to file system
- Directory structure: `logs/ai/{step}/YYYY-MM-DD/HHmmss_{hash}/`
- Files: `index.json`, `request.json`, `response.raw.txt`, `response.parsed.json`, `notes.log`
- Console message: `[AI File Logger] saved to: ...`
- Enables replay and debugging of AI calls

## API Design Patterns

### Response Format
All backend responses follow this structure:
```json
{
  "success": true|false,
  "data": {...},
  "error": "error message (if success is false)"
}
```

### Key API Endpoints

**Health Check**:
- `GET /api/health` - Service health and database connection status

**Core Evaluation**:
- `POST /api/calculate` - Real-time cost calculation (primary calculation engine)
- `GET/POST/PUT/DELETE /api/projects` - Project management (CRUD)
- `GET/POST/PUT/DELETE /api/config/roles` - Role configuration (unit prices)
- `GET/POST/PUT/DELETE /api/config/risk-items` - Risk item configuration
- `GET/POST/PUT/DELETE /api/config/travel-costs` - Travel cost configuration
- `GET /api/config/all` - Aggregate all configuration data

**AI Integration**:
- `POST /api/ai/assess-risk` - AI risk assessment
- `POST /api/ai/normalize-risk-names` - Risk name alignment to allowed list
- `POST /api/ai/analyze-project-modules` - Module breakdown analysis
- `POST /api/ai/evaluate-workload` - Workload estimation by role
- `GET/POST/PUT/DELETE /api/config/ai-models` - AI model management
- `GET/POST/PUT/DELETE /api/config/prompts` - Prompt template management
- `POST /api/config/prompts/:id/preview` - Preview rendered prompt

**Web3D Specific**:
- `GET/POST/PUT/DELETE /api/web3d/risk-items` - Web3D risk configuration
- `GET/POST/PUT/DELETE /api/web3d/workload-templates` - Web3D workload templates
- `GET/POST/PUT/DELETE /api/web3d/projects` - Web3D project management

**Dashboard & Analytics**:
- `GET /api/dashboard/overview` - Overview metrics (recent projects, counts)
- `GET /api/dashboard/trend` - 12-month trend analysis
- `GET /api/dashboard/cost-range` - Cost distribution buckets
- `GET /api/dashboard/keywords` - Keyword cloud data
- `GET /api/dashboard/dna` - Radar chart metrics (cost, risk, workload)
- `GET /api/dashboard/top-roles` - Top 5 roles by workload
- `GET /api/dashboard/top-risks` - Top 10 risks by occurrence

**Export**:
- `GET /api/projects/:id/export/pdf` - PDF report export
- `GET /api/projects/:id/export/excel?version=internal|external` - Excel export
  - `internal` version: 6 sheets with detailed breakdown
  - `external` version: 2 sheets (summary only)

## Code Style and Conventions

### Frontend (TypeScript)
- **Indentation**: 2 spaces
- **Imports**: Organized and grouped (Prettier plugin handles this automatically)
  - External libraries first
  - Internal modules second
  - Relative imports last
- **Component Naming**: PascalCase
- **Variables/functions**: camelCase
- **Interfaces/types**: PascalCase with descriptive names
- **Files**: camelCase for utilities, PascalCase for components
- **Formatting**: Prettier with plugins:
  - `prettier-plugin-organize-imports` - Auto-organizes imports
  - `prettier-plugin-packagejson` - Formats package.json
  - Configured in `.prettierrc`

**Example Component Structure**:
```typescript
import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'antd';
import type { FC } from 'react';

import { useModel } from 'umi';
import { createAssessment } from '@/services/assessment';

interface AssessmentFormProps {
  projectId?: number;
  onSuccess?: () => void;
}

const AssessmentForm: FC<AssessmentFormProps> = ({ projectId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  // Component logic
  
  return (
    // JSX
  );
};

export default AssessmentForm;
```

### Backend (JavaScript)
- **Indentation**: 2 spaces
- **Module imports**: Grouped by:
  1. Node.js built-ins (fs, path, etc.)
  2. External packages (express, sqlite3, etc.)
  3. Internal modules (services, models, utils)
- **Naming**: Controllers, services, and models match directory names
- **Files**: camelCase
- **Functions**: Descriptive names with action prefix
  - `getAllProjects`, `createProject`, `updateProject`, `deleteProject`
  - `calculateProjectCost`, `assessRisk`, `analyzeModules`
- **Async pattern**: Always use async/await with try-catch
- **Error handling**: Create custom errors with status codes

**Example Controller Pattern**:
```javascript
async function getProjectById(req, res, next) {
  const startedAt = Date.now();
  const { id } = req.params;
  
  try {
    const project = await projectService.getProjectById(id);
    const durationMs = Date.now() - startedAt;
    
    console.log('Project retrieved successfully', {
      projectId: id,
      durationMs,
    });
    
    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Failed to retrieve project', { error: error.message, projectId: id });
    next(error);
  }
}
```

### Commit Message Format
Format: `type: description` (imperative mood, lowercase)
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring (no behavior change)
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks (dependencies, config)
- `style:` - Formatting changes only

Examples:
```
feat: add ai workload evaluation endpoint
fix: resolve calculation rounding error for risk costs
refactor: extract common validation logic to middleware
docs: update api documentation for export endpoints
test: add unit tests for rating factor calculation
```

## Testing Strategy

### Backend Tests (`/tests`)

**Test Framework**: Jest with Supertest for API testing

**Test Structure**:
- Unit tests: Test individual functions and methods in isolation
- Integration tests: Test API endpoints with real HTTP requests
- Performance tests: Assert API response times < 500ms

**Test Database**: 
- Separate SQLite file (`ppa.test.db`)
- Initialized with `NODE_ENV=test`
- Cleaned up after test suite completion

**Running Tests**:
```bash
cd server

# Run all tests
npm test

# Run specific test file
npm test calculationService.test.js

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

**Test Conventions**:
- Test files named `*.test.js`
- Place in `/tests` directory or subdirectories
- Use Supertest for API endpoint testing
- Mock AI services and external calls
- Clean up database after tests
- Assert response times < 500ms

**Example Test Pattern**:
```javascript
const request = require('supertest');
const app = require('../index');

describe('Calculation API', () => {
  it('POST /api/calculate should return calculated costs', async () => {
    const assessmentData = {
      risk_scores: { '技术风险': 15 },
      roles: [{ role_name: '前端工程师', unit_price: 1800 }],
      development_workload: [{ '前端工程师': 20, delivery_factor: 1 }],
      // ... other required fields
    };
    
    const response = await request(app)
      .post('/api/calculate')
      .send(assessmentData)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('total_cost');
    expect(response.body.data).toHaveProperty('software_dev_cost');
    expect(response.duration).toBeLessThan(500); // Performance assertion
  });
});
```

**Mocking Pattern**:
```javascript
const configModel = require('../models/configModel');

jest.mock('../models/configModel', () => ({
  getTravelCostPerMonth: jest.fn(),
  getAllRoles: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  configModel.getTravelCostPerMonth.mockResolvedValue(8000);
});
```

### Frontend Tests
Currently limited automated testing. Manual testing via development server is the primary QA method.

**Future Testing Recommendations**:
- Add Jest + React Testing Library for component tests
- Add Cypress or Playwright for E2E tests
- Test critical user flows: assessment creation, export, AI features

## Database Schema

### Core Tables

**Projects** (`projects`):
- `id` - Primary key
- `name` - Project name
- `description` - Project description
- `is_template` - Boolean flag (0=project, 1=template)
- `assessment_details_json` - Complete assessment snapshot (JSON)
- `created_at`, `updated_at` - Timestamps
- Stores both projects and templates (shared table)

**Role Configuration** (`config_roles`):
- `id` - Primary key
- `role_name` - Role name (e.g., "前端工程师")
- `unit_price` - Daily rate in yuan (元/人/天)
- `created_at`, `updated_at` - Timestamps

**Risk Items** (`config_risk_items`):
- `id` - Primary key
- `item_name` - Risk item name
- `description` - Risk description
- `options_json` - Risk scoring options (JSON array)
- `created_at`, `updated_at` - Timestamps

**Travel Costs** (`config_travel_costs`):
- `id` - Primary key
- `city` - City name
- `cost_per_month` - Monthly cost per person
- `active` - Boolean flag
- `created_at`, `updated_at` - Timestamps

### AI-Related Tables

**AI Model Configs** (`ai_model_configs`):
- `id` - Primary key
- `provider` - Provider name (openai, doubao)
- `model_name` - Model identifier
- `api_host` - API endpoint
- `api_key` - API key (encrypted)
- `is_current` - Currently active model flag
- `created_at`, `updated_at` - Timestamps

**Prompt Templates** (`prompt_templates`):
- `id` - Primary key
- `name` - Template name
- `category` - Category (risk_analysis, module_analysis, workload_evaluation)
- `content` - Template content with variables
- `variables_json` - Variable definitions (JSON)
- `is_system` - System template flag
- `is_active` - Active flag
- `created_at`, `updated_at` - Timestamps

**AI Assessment Logs** (`ai_assessment_logs`):
- `id` - Primary key
- `request_hash` - Unique request identifier
- `step` - AI step (assess_risk, analyze_modules, evaluate_workload)
- `prompt` - Full prompt sent to AI
- `response` - Raw AI response
- `parsed_result` - Parsed result (JSON)
- `duration_ms` - Response time
- `created_at` - Timestamp

### Web3D Specific Tables

**Web3D Risk Items** (`web3d_risk_items`):
- Similar structure to `config_risk_items` but Web3D-specific

**Web3D Workload Templates** (`web3d_workload_templates`):
- Predefined workload templates for Web3D projects

### JSON Fields
Complex data stored as JSON for flexibility:
- `assessment_details_json` - Complete assessment snapshot with calculation breakdown
- `options_json` - Dynamic risk item options
- `variables_json` - Template variables for AI prompts
- `calculation_snapshot` - Stored calculation results
- `role_costs` - Detailed role cost breakdown
- `travel_costs` - Travel cost calculations
- `risk_items` - Risk cost items

## AI Integration and Logging

### AI Features

**Risk Assessment** (`POST /api/ai/assess-risk`):
- Analyzes project description and identifies risks
- Returns scored risk items with reasoning
- Supports prompt templates with variables
- Maximum document length: 5000 characters

**Module Analysis** (`POST /api/ai/analyze-project-modules`):
- Decomposes project into 3-level module hierarchy
- Estimates complexity for each module
- Provides confidence scoring
- Useful for workload estimation

**Workload Evaluation** (`POST /api/ai/evaluate-workload`):
- Estimates effort by role (developer, designer, etc.)
- Calculates delivery factors
- Suggests workload distribution
- Integrates with calculation engine

**Name Normalization** (`POST /api/ai/normalize-risk-names`):
- Maps AI-generated risk names to standard list
- Uses fuzzy matching and semantic similarity
- Maintains consistency in risk reporting

### Logging System

**File-Based Logging** (`server/services/aiFileLogger.js`):
- All AI interactions logged to file system
- Directory structure: `logs/ai/{step}/YYYY-MM-DD/HHmmss_{requestHash}/`
- Files:
  - `index.json` - Metadata and summary
  - `request.json` - Full request payload
  - `response.raw.txt` - Raw AI response
  - `response.parsed.json` - Parsed result
  - `notes.log` - Additional notes
- Console message: `[AI File Logger] saved to: ...`
- Enables replay and debugging of AI calls

**Database Logging** (`ai_assessment_logs` table):
- Request hash and timestamp
- Step and prompt information
- Response and parsed result
- Duration metrics

**Environment Variables**:
```bash
# Enable/disable AI logging (default: true)
AI_LOG_ENABLED=true

# Custom AI log directory
AI_LOG_DIR=/absolute/path/to/ai/logs

# Enable/disable export logging (default: true)
EXPORT_LOG_ENABLED=true

# Custom export log directory
EXPORT_LOG_DIR=/absolute/path/to/export/logs
```

**Configuration**:
- Managed via `/model-config` page in frontend
- Supports multiple AI models (OpenAI, Doubao)
- Prompt template management with variables
- Model switching and testing

## Security and Validation

### Input Validation
- **Express-validator**: Used in route definitions for parameter validation
- **Maximum lengths**: Enforced for string inputs (e.g., AI documents ≤ 5000 chars)
- **Type checking**: In controllers for numeric and boolean parameters
- **JSON validation**: For complex nested structures

**Example Validation**:
```javascript
const { body, param, query, validationResult } = require('express-validator');

router.post('/api/ai/assess-risk', [
  body('document').isString().isLength({ max: 5000 }),
  body('promptId').optional().isInt(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array() });
  }
  // ... controller logic
});
```

### Database Security
- **Current state**: No prepared statements (direct SQL concatenation)
- **Risk level**: Limited due to internal tool nature
- **Future**: Migrate to parameterized queries (TODO)
- **Access control**: Single-user system, no auth currently

**SQL Pattern** (current):
```javascript
// TODO: Migrate to parameterized queries
const sql = `SELECT * FROM projects WHERE id = ${id}`;
```

**Recommended Pattern**:
```javascript
const sql = 'SELECT * FROM projects WHERE id = ?';
db.get(sql, [id], callback);
```

### Authentication & Authorization
- **Current state**: No authentication implemented
- **Single-user system**: Designed for personal/team use
- **Future enhancement**: Multi-user access with roles needed
- **Session management**: Not implemented
- **API security**: No API keys or JWT tokens

**Security Considerations**:
- Database file (`ppa.db`) contains sensitive data
- AI API keys stored in database (should be encrypted)
- Export files may contain confidential project data
- Log files contain AI interactions and project details
- Recommend file system permissions for development
- Consider VPN/SSH tunnel for remote access

## Deployment Process

### Development Deployment

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd PPA
   ```

2. **Install frontend dependencies**:
   ```bash
   cd frontend/ppa_frontend
   yarn install
   ```

3. **Install backend dependencies**:
   ```bash
   cd server
   npm install
   ```

4. **Initialize database**:
   ```bash
   cd server
   node init-db.js
   ```

5. **Seed initial data**:
   ```bash
   cd server/seed-data
   node seed-all.js
   ```

6. **Start backend server**:
   ```bash
   cd server
   node index.js  # Default port 3001
   ```

7. **Start frontend server** (in new terminal):
   ```bash
   cd frontend/ppa_frontend
   yarn dev  # Default port 8000
   ```

8. **Verify deployment**:
   - Frontend: http://localhost:8000 (should redirect to /dashboard)
   - Backend health: http://localhost:3001/api/health
   - API docs: Review `server/README.md`

### Production Build

**Frontend Production Build**:
```bash
cd frontend/ppa_frontend

# Install dependencies
yarn install --production=false  # Include dev dependencies for build

# Build for production
yarn build

# Output: dist/ folder with static assets
# Deploy to CDN or static hosting
```

**Backend Production Deployment**:
```bash
cd server

# Install production dependencies only
npm install --production

# Set environment variables
export NODE_ENV=production
export PORT=3001  # Or your preferred port
export AI_LOG_ENABLED=true
export EXPORT_LOG_ENABLED=true

# Initialize database (first time only)
node init-db.js

# Seed data if needed
cd seed-data && node seed-all.js

# Start server
node index.js

# For daemon process, use:
# pm2 start index.js --name ppa-server
# or
# nohup node index.js > server.log 2>&1 &
```

**Docker Considerations**:
- Copy `server/` directory
- Expose port 3001
- Mount volume for `ppa.db` and `logs/`
- Set environment variables via Docker env

### Environment Variables

**Backend Configuration**:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server listening port |
| `NODE_ENV` | development | Environment: development\|production |
| `EXPORT_LOG_ENABLED` | true | Enable export logging to files |
| `EXPORT_LOG_DIR` | (auto) | Custom export log directory (optional) |
| `AI_LOG_ENABLED` | true | Enable AI logging to files |
| `AI_LOG_DIR` | (auto) | Custom AI log directory (optional) |

**Frontend Configuration**:

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | /api (proxy) | Override API base URL |
| `REACT_APP_VERSION` | (from package.json) | App version |

**Example .env file** (create from `.env.example`):
```bash
PORT=3001
NODE_ENV=production
EXPORT_LOG_ENABLED=true
AI_LOG_ENABLED=true
# EXPORT_LOG_DIR=/custom/path
# AI_LOG_DIR=/custom/path
```

**Configuration Priority**:
1. Command line environment variables
2. `.env` file (if exists)
3. Default values in code

## Performance Requirements

### Hard Requirements (Enforced in Tests)

**API Response Times**:
- All API responses must be < 500ms
- Tested via Supertest duration assertions
- AI endpoints may exceed due to external calls
- Calculation endpoints must be optimized

**Frontend Build**:
- Development rebuilds should be < 5 seconds
- Production build should be reasonable (< 1 minute)
- Code splitting enabled for large bundles

**Database Performance**:
- SQLite queries should use indexes
- Avoid N+1 query patterns
- Batch operations where possible

### Optimization Strategies

**Backend Optimizations**:
- Single SQLite connection (singleton pattern)
- Async AI logging (doesn't block responses)
- In-memory caching for configuration
- Query optimization with proper indexes
- Avoid synchronous file operations in hot paths

**Frontend Optimizations**:
- UmiJS route-based code splitting (automatic)
- Dynamic imports for heavy components
- Ant Design tree-shaking (imports on demand)
- Image optimization and lazy loading
- API response caching (SWR or similar)

**Database Optimizations**:
- Indexes on frequently queried fields:
  - `projects.created_at`
  - `projects.project_type`
  - `projects.is_template`
- Use `EXPLAIN QUERY PLAN` to analyze queries
- Consider covering indexes for common queries

### Performance Monitoring

**Backend Logging**:
- All controllers log durationMs
- Monitor slow queries (> 100ms)
- Track AI call durations
- Alert on errors and timeouts

**Frontend Monitoring**:
- Browser DevTools Performance tab
- Network request monitoring
- Bundle size analysis (`yarn build` output)
- Lighthouse CI integration (future)

## Migration Patterns

### Database Migrations

**Migration Files** (`server/migrations/`):
- Named: `{version}_{description}.js`
- Version numbers are sequential (001, 002, 003, etc.)
- Each migration is a Node.js module

**Migration Structure**:
```javascript
// Example: 001_create_ai_model_configs.js
module.exports = function migration001(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_model_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      ...
    )
  `);
};
```

**Running Migrations**:
- Migrations run automatically on server startup
- `init-db.js` executes all migration files in order
- Idempotent - safe to re-run

**Creating New Migration**:
1. Create file: `server/migrations/005_new_feature.js`
2. Export function with db parameter
3. Use `CREATE TABLE IF NOT EXISTS` for new tables
4. Use `ALTER TABLE` for schema changes
5. Test with fresh database

### Configuration Changes

**Seed Data Updates** (`server/seed-data/`):
- `seed-all.js` - Runs all seed scripts
- `seed-roles.js` - Role configurations
- `seed-risk-items.js` - Risk assessment items
- `seed-travel-costs.js` - Travel cost defaults

**Updating Seed Data**:
1. Modify seed script with new data
2. Re-run: `cd seed-data && node seed-all.js`
3. Seeds are additive (won't duplicate existing data)
4. For changes, manually update via config pages or SQL

**Version Management**:
- Version tracked in `frontend/ppa_frontend/package.json`
- Current: V1.2.0-beta
- Version injected into frontend via Umi define
- Display in UI: `app_version` global variable

## Known Limitations & Future Enhancements

### Current Limitations

1. **No Authentication/Authorization**
   - Single-user system only
   - No login or session management
   - Anyone with access can modify data
   - **Risk**: Data integrity and security

2. **No Pagination**
   - Project lists return all records
   - Performance issues with >100 projects
   - UI becomes slow with large datasets
   - **Impact**: Scalability limited

3. **Database Security**
   - No prepared statements (SQL injection risk)
   - Single SQLite file (concurrency limitations)
   - No encryption at rest
   - **Risk**: Security and multi-user access

4. **Limited Frontend Testing**
   - No automated UI tests
   - Manual testing only
   - No E2E test coverage
   - **Risk**: Regression bugs

5. **No CI/CD Pipeline**
   - Manual deployment process
   - No automated testing in pipeline
   - No build artifacts management
   - **Impact**: Release process efficiency

6. **Export Performance**
   - Synchronous export generation
   - Blocks API during large exports
   - No progress indication
   - **Impact**: User experience

### Future Enhancement Roadmap

**High Priority**:
1. **Authentication System**
   - User login and session management
   - Role-based access control (RBAC)
   - Audit logging for data changes
   - API token authentication

2. **Pagination & Filtering**
   - Server-side pagination for lists
   - Search and filter capabilities
   - Sorting options
   - Improved performance

3. **Security Hardening**
   - Parameterized SQL queries
   - Input sanitization
   - API rate limiting
   - CSRF protection

4. **Testing Infrastructure**
   - Frontend unit tests (Jest + React Testing Library)
   - E2E tests (Cypress/Playwright)
   - Visual regression testing
   - Performance benchmarking

**Medium Priority**:
5. **Async Export Queue**
   - Background job processing
   - Export status tracking
   - Email/push notifications
   - Download links with expiration

6. **Enhanced Dashboard**
   - Interactive charts and filters
   - Custom date ranges
   - Comparative analysis
   - Export dashboard data

7. **Template Versioning**
   - Template history and versions
   - Diff visualization
   - Rollback capabilities
   - Template approval workflow

**Low Priority**:
8. **Multi-Tenancy**
   - Organization isolation
   - Subdomain per organization
   - Custom branding
   - Usage analytics

9. **Integration APIs**
   - Webhook endpoints
   - OAuth2 provider
   - Third-party integrations
   - Mobile app API

10. **Advanced AI Features**
    - Fine-tuned models for domain
    - Ensemble predictions
    - Confidence calibration
    - Active learning pipeline

## Troubleshooting

### Common Issues and Solutions

**1. Frontend Build Fails**
- **Symptom**: Import errors, module not found
- **Cause**: Using npm instead of Yarn
- **Solution**: 
  ```bash
  cd frontend/ppa_frontend
  rm -rf node_modules package-lock.json
  yarn install
  ```
- **Clear cache if needed**:
  ```bash
  rm -rf src/.umi
  yarn dev
  ```

**2. Database Locked Errors**
- **Symptom**: SQLITE_ERROR: database is locked
- **Cause**: Multiple backend processes or zombie process
- **Solution**:
  ```bash
  # Find process using port 3001
  lsof -i :3001
  
  # Kill process
  kill -9 <PID>
  
  # Restart backend
  cd server && node index.js
  ```

**3. Tests Fail with Timeout**
- **Symptom**: Jest timeout errors
- **Cause**: 500ms threshold too strict for AI tests
- **Solution**:
  - Check specific test duration
  - Adjust threshold for AI endpoints
  - Ensure `NODE_ENV=test` is set
  ```bash
  NODE_ENV=test npm test
  ```

**4. AI Logging Not Working**
- **Symptom**: No logs in `server/logs/ai/`
- **Cause**: Permissions or disabled logging
- **Solution**:
  ```bash
  # Check permissions
  ls -la server/logs/
  
  # Create directory if needed
  mkdir -p server/logs/ai
  
  # Enable logging
  AI_LOG_ENABLED=true node index.js
  ```

**5. Export Fails**
- **Symptom**: PDF/Excel export errors
- **Cause**: Missing dependencies or disk space
- **Solution**:
  ```bash
  # Check dependencies
  cd server
  npm ls pdfkit exceljs
  
  # Reinstall if needed
  npm install pdfkit exceljs
  
  # Check disk space
  df -h
  ```

**6. Frontend Proxy Issues**
- **Symptom**: API calls fail with 404
- **Cause**: Backend not running or port mismatch
- **Solution**:
  - Ensure backend running on port 3001
  - Check `.umirc.ts` proxy config
  - Verify no firewall blocking

**7. Migration Errors**
- **Symptom**: Database schema mismatch
- **Cause**: New migration not applied
- **Solution**:
  ```bash
  cd server
  node init-db.js
  # Check console for migration errors
  ```

**8. Dependency Conflicts**
- **Symptom**: Version mismatch errors
- **Cause**: Outdated lock files
- **Solution**:
  ```bash
  # Frontend
  cd frontend/ppa_frontend
  rm -rf node_modules yarn.lock
  yarn install
  
  # Backend
  cd server
  rm -rf node_modules package-lock.json
  npm install
  ```

### Performance Debugging

**Slow API Responses**:
- Enable query logging in `config/database.js`
- Use `EXPLAIN QUERY PLAN` in SQLite
- Check for missing indexes
- Profile with clinic.js or 0x

**Slow Frontend**:
- React DevTools Profiler
- Check bundle size: `yarn build` output
- Network tab for API waterfall
- Disable React StrictMode if needed

**Database Performance**:
- Monitor query times in logs
- Add indexes for frequent WHERE clauses
- Consider vacuum for large deletes
- Archive old projects if table too large

### Getting Help

**Documentation**:
- Backend details: `server/README.md`
- Architecture deep-dive: `server/ARCHITECTURE.md`
- Frontend guide: `frontend/ppa_frontend/README.md`
- API specification: `server/README.md`

**PRD Documentation**:
- Main PRD: `docs/PRD.md`
- Feature specs: `docs/prd/` directory
- Bug fixes: `docs/bugfix/` directory

**Project Analysis**:
- Chinese overview: `IFLOW.md`
- English overview: `GEMINI.md`
- Workflow guides: `WARP.md`, `RP.md`

## Documentation References

### Core Documentation
- **Product Requirements**: `docs/PRD.md` - Main product requirements and success criteria
- **Backend API Details**: `server/README.md` - Complete API endpoints and examples
- **Architecture Deep-Dive**: `server/ARCHITECTURE.md` - Technical architecture and design patterns
- **Frontend Guide**: `frontend/ppa_frontend/README.md` - Frontend-specific documentation

### Feature Specifications
- **AI Risk Assessment**: `docs/prd/ai-risk-assessment-backend-step1.md`
- **Calculation Logic**: `docs/prd/calculation-logic-spec.md` - Detailed formulas
- **Model Configuration**: `docs/prd/model-config-spec.md`
- **Web3D Assessment**: `docs/prd/web3d-assessment-spec.md`
- **Dashboard**: `docs/prd/dashboard-spec.md`

### Bug Fix Documentation
- **Backend Bugs**: `docs/bugfix/BACKEND-BUGFIX-CONSOLIDATED.md`
- **Frontend Bugs**: `docs/bugfix/FRONTEND-BUGFIX-CONSOLIDATED.md`
- **AI Logging**: `docs/bugfix/AI-LOGGING-NOTES.md`
- **Rating Factor**: `docs/bugfix/rating-factor-threshold-0.7.md`

### Project Analysis
- **Chinese Analysis**: `IFLOW.md` - Detailed Chinese project overview
- **English Overview**: `GEMINI.md` - English project summary
- **Workflow**: `WARP.md` - Development workflow guide
- **Release Process**: `RP.md` - Release process documentation

### Branch Strategy
- **Branch Guide**: `BRANCH_STRATEGY.md`
- **Detailed Analysis**: `BRANCH_ANALYSIS_DETAILED.md`
- **Version Management**: `VERSION_MANAGEMENT_GUIDE.md`

---

**Last Updated**: 2025-01-14
**Document Version**: 2.0
**Maintained By**: AI agents and development team
