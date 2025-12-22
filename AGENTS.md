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

## Technology Stack

### Frontend (`frontend/ppa_frontend/`)
- **Framework**: UmiJS Max (v4.5.2) with React 18 & TypeScript
- **UI Library**: Ant Design v5 + ProComponents
- **Data Visualization**: @ant-design/charts (G2-based)
- **Package Manager**: Yarn (v1.22.17+)
- **Build Tool**: Webpack (configured by Umi Max)
- **Code Quality**: Prettier + ESLint + Husky + lint-staged

### Backend (`server/`)
- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Database**: SQLite3 (file-based)
- **Testing**: Jest + Supertest
- **Documentation**: PDFKit + ExcelJS

## Project Structure

```
PPA/
├── frontend/ppa_frontend/          # Frontend application
│   ├── .umirc.ts                   # UmiJS configuration
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   │   ├── Assessment/         # Standard project assessment
│   │   │   ├── Web3D/              # Web3D project assessment
│   │   │   ├── Config/             # Parameter configuration
│   │   │   ├── Dashboard/          # Data visualization
│   │   │   └── ModelConfig/        # AI model management
│   │   ├── services/               # API service layers
│   │   ├── constants/              # Frontend constants
│   │   └── utils/                  # Frontend utilities
│   └── package.json
├── server/                         # Backend API
│   ├── index.js                    # Application entry point
│   ├── init-db.js                  # Database initialization
│   ├── package.json
│   ├── ppa.db                      # SQLite database file
│   ├── config/                     # Configuration layer
│   │   ├── database.js             # Database connection
│   │   └── server.js               # Server settings
│   ├── routes/                     # HTTP route definitions
│   ├── controllers/                # Request handlers
│   ├── services/                   # Business logic layer
│   ├── models/                     # Data access layer
│   ├── middleware/                 # Express middleware
│   ├── tests/                      # Test suites
│   ├── seed-data/                  # Database seed scripts
│   ├── providers/                  # AI provider integrations
│   ├── migrations/                 # DB schema migrations
│   └── utils/                      # Backend utilities
├── docs/                           # Documentation
├── scripts/                        # Utility scripts
└── AGENTS.md                       # This file
```

## Build and Development Commands

### Prerequisites
- Node.js 16+ installed
- Yarn package manager installed globally

### Frontend Development
```bash
cd frontend/ppa_frontend

# Install dependencies (uses Yarn only)
yarn install

# Start development server (http://localhost:8000)
yarn dev
# or
yarn start

# Build for production
yarn build

# Format code (Prettier)
yarn format
```

### Backend Development
```bash
cd server

# Install dependencies
npm install

# Initialize database tables
node init-db.js

# Seed initial data
node seed-data/seed-all.js

# Start API server (http://localhost:3001)
node index.js

# Run tests
npm test
```

### Running Both Services
The frontend proxies API requests to the backend via UmiJS proxy configuration. Both services need to run in parallel:
- Frontend dev server: `http://localhost:8000`
- Backend API server: `http://localhost:3001`

## Architecture Details

### Backend Three-Tier Architecture

1. **Controller Layer** (`/controllers`)
   - Receives HTTP requests and extracts parameters
   - Calls service layer for business logic
   - Formats responses (always `{success: boolean, data: any}`)
   - Logs request performance metrics
   - Handles errors and passes to error middleware

2. **Service Layer** (`/services`)
   - Implements core business logic
   - No direct database operations (uses models)
   - Calculation engine in `calculationService.js`
   - AI integration services for risk/module/workload assessment
   - Export service for PDF/Excel generation

3. **Model Layer** (`/models`)
   - Direct database operations with SQLite
   - SQL query encapsulation
   - Data transformation before returning to services

Key architectural principles:
- **Single database connection**: Managed through singleton pattern in `config/database.js`
- **Global error handling**: Centralized middleware in `middleware/errorHandler.js`
- **Template reusing mechanism**: Projects and templates share `projects` table with `is_template` flag
- **Unit consistency**: Frontend uses "yuan", backend outputs "ten-thousand yuan (万元)"

### Frontend Architecture

- **Routing**: Declarative routing in `.umirc.ts` with redirect to `/dashboard`
- **API Proxy**: `/api` requests proxy to backend at `http://localhost:3001`
- **State Management**: UmiJS `initialState` and `model` for global state
- **Component Organization**: Feature-based directory structure
- **Type Safety**: TypeScript with interfaces in `/types`

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

**Core Evaluation**:
- `POST /api/calculate` - Real-time cost calculation
- `GET/POST/PUT/DELETE /api/projects` - Project management
- `GET/POST/PUT/DELETE /api/config/roles` - Role configuration
- `GET/POST/PUT/DELETE /api/config/risk-items` - Risk item configuration
- `GET/POST/PUT/DELETE /api/config/travel-costs` - Travel cost configuration

**AI Integration**:
- `POST /api/ai/assess-risk` - AI risk assessment
- `POST /api/ai/normalize-risk-names` - Risk name alignment
- `POST /api/ai/analyze-project-modules` - Module breakdown analysis
- `POST /api/ai/evaluate-workload` - Workload estimation
- `GET/POST/PUT/DELETE /api/config/ai-models` - AI model management
- `GET/POST/PUT/DELETE /api/config/prompts` - Prompt template management

**Web3D Specific**:
- `GET/POST/PUT/DELETE /api/web3d/risk-items` - Web3D risk configuration
- `GET/POST/PUT/DELETE /api/web3d/workload-templates` - Web3D workload templates
- `GET/POST/PUT/DELETE /api/web3d/projects` - Web3D project management

**Dashboard & Export**:
- `GET /api/dashboard/*` - Data analytics endpoints
- `GET /api/projects/:id/export/pdf` - PDF report export
- `GET /api/projects/:id/export/excel?version=internal|external` - Excel export

## Code Style and Conventions

### Frontend (TypeScript)
- **Indentation**: 2 spaces
- **Imports**: Organized and grouped (Prettier plugin handles this)
- **Component Naming**: PascalCase
- **Variables/functions**: camelCase
- **Interfaces/types**: PascalCase with I prefix
- **Files**: camelCase
- **Formatting**: Prettier with organize-imports and packagejson plugins

### Backend (JavaScript)
- **Indentation**: 2 spaces
- **Module imports**: Grouped by external modules and internal modules
- **Naming**: Controllers, services, and models match directory names
- **Files**: camelCase
- **Functions**: Consistent naming patterns (e.g., `getAllProjects`, `createProject`)

### Commit Message Format
Format: `type: description` (imperative mood)
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test additions/changes

Examples:
```
feat: 项目评估计算
fix: 修复成本四舍五入
refactor: controllers 分层
```

## Testing Strategy

### Backend Tests (`/tests`)
- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test API endpoints with test database
- **Performance Tests**: Assert all API responses < 500ms
- **Test Database**: Uses separate SQLite file (`ppa.test.db`) with `NODE_ENV=test`

**Running Tests**:
```bash
cd server
npm test  # Runs Jest with configuration
```

**Test Conventions**:
- Test files named `*.test.js`
- Place in `/tests` directory or subdirectories
- Use Supertest for API endpoint testing
- Mock AI services and external calls
- Clean up database after tests

### Frontend Tests
Currently limited automated testing. Manual testing via development server is the primary QA method.

## Database Schema

**Core Tables**:
- `projects` - Projects and templates (shared table)
- `config_roles` - Role configuration with unit prices
- `config_risk_items` - Risk assessment items
- `config_travel_costs` - Travel cost configuration

**AI Related**:
- `prompt_templates` - AI prompt templates with variables
- `ai_prompts` - Legacy AI prompts (deprecating)
- `ai_assessment_logs` - AI request/response logging

**Web3D Specific**:
- `web3d_risk_items` - Web3D risk assessment items
- `web3d_workload_templates` - Web3D workload templates

**Complex Fields as JSON**:
- `assessment_details_json` - Complete assessment snapshot
- `variables_json` - Template variables
- `options_json` - Risk item options

## AI Integration and Logging

**AI Features**:
- Risk assessment scoring
- Module decomposition analysis  
- Workload estimation by role
- Prompt-based analysis with variable substitution

**Logging System** (`/services/aiFileLogger.js`):
- All AI requests/responses logged to file system
- Directory structure: `logs/ai/{step}/YYYY-MM-DD/HHmmss_{hash}/`
- Files: `index.json`, `request.json`, `response.raw.txt`, `response.parsed.json`, `notes.log`
- Console message: `[AI File Logger] saved to: ...`

**Environment Variables**:
```bash
AI_LOG_ENABLED=true          # Enable AI logging
AI_LOG_DIR=/custom/path      # Custom log directory
EXPORT_LOG_ENABLED=true      # Enable export logging
EXPORT_LOG_DIR=/custom/path  # Custom export log directory
```

## Security and Validation

**Input Validation**:
- Express-validator for route validation
- Maximum string lengths enforced (e.g., AI documents ≤ 5000 chars)
- Parameter type checking in controllers

**Database Security**:
- No prepared statements yet (TODO: migrate to parameterization)
- Current implementation uses limited parameter validation
- Single connection prevents multi-user access conflicts

**Authentication**:
- No authentication implemented (single-user system)
- Future enhancement needed for multi-user access

## Deployment Process

### Development Deployment
1. Clone repository
2. Install frontend dependencies: `cd frontend/ppa_frontend && yarn`
3. Install backend dependencies: `cd server && npm install`
4. Initialize database: `node init-db.js`
5. Seed data: `cd seed-data && node seed-all.js`
6. Start backend: `node index.js` (port 3001)
7. Start frontend: `yarn dev` (port 8000)

### Production Build
```bash
# Frontend
cd frontend/ppa_frontend
yarn build  # Creates dist/ folder

# Backend  
npm install --production
node index.js  # Set PORT environment variable if needed
```

### Environment Variables

**Backend**:
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment: development|production (default: development)
- `EXPORT_LOG_ENABLED` - Enable export logging (default: true)
- `EXPORT_LOG_DIR` - Custom export log directory
- `AI_LOG_ENABLED` - Enable AI logging (default: true)
- `AI_LOG_DIR` - Custom AI log directory

**Frontend**:
- `REACT_APP_API_URL` - Can override `/api` proxy target in `.env` file

## Performance Requirements

**Hard Requirements**:
- All API responses must be < 500ms (enforced in tests)
- Frontend build time should be reasonable for development
- Calculation engine should handle 100+ role/workload items without degradation

**Optimization Tips**:
- AI logging is async and doesn't block responses
- Use SQLite indexes for frequently queried fields (e.g., `project_type`, `created_at`)
- Frontend enables code splitting via UmiJS route splitting

## Known Limitations & Future Enhancements

**Current Limitations**:
- No authentication/authorization
- No pagination on project lists (may cause performance issues with >100 projects)
- Single SQLite file limits concurrent multi-user access
- No automated frontend testing suite
- No CI/CD pipeline

**Planned Enhancements** (from docs):
- Add authentication and role-based access
- Implement pagination and filtering
- Parameterized queries for security
- Memory database for faster CI tests
- Enhanced export with charts and cover pages
- Recalculation endpoint for legacy projects
- Async task queue for large exports

## Troubleshooting

**Common Issues**:

1. **Frontend build fails with import errors**
   - Ensure using Yarn, not npm
   - Clear `.umi` cache: `rm -rf src/.umi`

2. **Database locked errors**
   - Ensure only one backend process running
   - Check for zombie processes on port 3001

3. **Tests fail with timeout**
   - Check if 500ms threshold is too strict for AI-related tests
   - Ensure NODE_ENV=test is set

4. **AI logging not working**
   - Check write permissions to `server/logs/` directory
   - Verify AI_LOG_ENABLED is not set to false

5. **Export fails**
   - Ensure dependent binaries are installed (PDFKit)
   - Check disk space for large exports

## Documentation References

- **Product Requirements**: `docs/PRD.md`
- **Backend API Details**: `server/README.md`
- **Architecture Deep-Dive**: `server/ARCHITECTURE.md`
- **Frontend Guide**: `frontend/ppa_frontend/README.md`
- **Pathfinder**: `IFLOW.md`, `GEMINI.md`