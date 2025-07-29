# 📚 StudyBuddy - AI-Powered Learning Platform

> An intelligent study companion that transforms how students learn through AI-powered content generation, RAG-based Q&A, and comprehensive learning analytics.

## 🔗 Quick Links



- **📖 API Documentation**: [OpenAPI Specification](./API_DOCUMENTATION/openapi.yaml)
- **🌐 Public URL**: [studdybuddy.me](https://studdybuddy.me)
- **🎥 Demo Video**: [Watch Demo](https://your-demo-video-link.com)
- **🏗️ Code Structure Video**: [Watch Code Structure Video](https://your-code-structure-link.com)


## 🚀 Quick Start

### Full Application (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd StudyBuddy

# Start all services
docker compose up --build
```

### Backend Only
```bash

docker compose up --build backend
```

### Frontend Only
```bash
cd frontend
npm install
npm run dev
```
or 

```bash
docker compose up --build frontend
```


## 🧪 Testing

### Backend Tests

#### Dockerized Testing (Recommended)
```bash
# Run all backend tests with coverage
docker compose -f backend/docker-compose.test.yml up --build --abort-on-container-exit
```

#### Local Testing
```bash
cd backend
pip install -r requirements.txt
pytest
# With coverage
pytest --cov=app --cov-report=html
```

### Frontend Tests
```bash
cd frontend
npm test
# With coverage
npm run coverage
```

### E2E Tests
```bash
cd e2e
npm test
# Specific test suite
npm run test:demo:auth
npm run test:demo:chat
npm run test:demo:billing
```

#### Run Specific Tests
```bash
# Backend - specific test file
pytest tests/chat/test_chat_service.py
# Backend - specific test method
pytest tests/chat/test_chat_service.py::test_create_chat_session

# Frontend - specific component
npm test -- --testNamePattern="ChatInterface"

# E2E - specific feature
npx playwright test chat --headed
```

## 📊 Test Coverage

We maintain **80%+ test coverage** across all components:
- **Backend**: 80%+ (Unit + Integration tests)
- **Frontend**: 75%+ (Component + UI tests)
- **E2E**: 60%+ (End-to-end scenarios)

## 🏗️ Project Structure

```
StudyBuddy/
├── 📁 API_DOCUMENTATION/          # OpenAPI specifications
├── 📁 Database/                   # SQL schemas and migrations
├── 📁 Design/                     # System design documents
│   ├── BPMN/                      # Business process models
│   ├── Class Diagram/             # UML diagrams
│   └── Layered Architecture/      # Architecture documentation
├── 📁 backend/                    # FastAPI backend service
│   ├── app/                       # Application code
│   │   ├── ai/                    # AI service integrations
│   │   ├── auth/                  # Firebase authentication
│   │   ├── billing/               # Payment processing
│   │   ├── chat/                  # Chat functionality
│   │   ├── content_generator/     # AI content generation
│   │   ├── document_upload/       # File processing & RAG
│   │   ├── quiz_generator/        # Quiz creation
│   │   ├── rag/                   # Retrieval-Augmented Generation
│   │   └── core/                  # Database & vector DB
│   ├── tests/                     # Comprehensive test suite
│   └── docker-compose.test.yml    # Test configuration
├── 📁 frontend/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/            # UI components
│   │   │   ├── admin/             # Admin dashboard
│   │   │   ├── auth/              # Authentication
│   │   │   ├── billing/           # Payment UI
│   │   │   ├── chatbot/           # Chat interface
│   │   │   ├── content/           # Content management
│   │   │   └── quiz/              # Quiz interface
│   │   ├── pages/                 # Route components
│   │   └── lib/                   # Utilities & API calls
│   └── tests/                     # Frontend test suite
├── 📁 e2e/                        # Playwright E2E tests
└── docker-compose.yml             # Main orchestration
```

## 🌟 Project Overview

StudyBuddy is a comprehensive AI-powered learning platform that revolutionizes education through intelligent content generation, advanced document processing, and personalized learning experiences.

### 🤖 Core AI Features

#### **Retrieval-Augmented Generation (RAG)**
- Advanced document processing with text chunking and embedding generation
- Vector database integration (ChromaDB + PostgreSQL)
- Semantic search for intelligent content retrieval
- Context-aware question answering

#### **Multi-Model AI Integration**
- **Google Gemini**: Primary chat and content generation
- **OpenAI-compatible models**: Extensible AI service architecture
- Dynamic model switching based on use case
- Intelligent prompt engineering and response formatting

#### **Content Generation Engine**
- AI-powered flashcard creation from documents
- Automatic quiz generation with multiple difficulty levels
- Slide presentation generation
- Content versioning and history tracking

### 💾 Advanced Data Management

#### **Vector Database**
- QDRANT Cloud integration for semantic similarity search
- PostgreSQL for structured data storage
- Hybrid search capabilities combining vector and traditional queries
- Efficient document embedding and retrieval

#### **Cloud Infrastructure**
- Docker containerization for scalable deployment
- PostgreSQL database with advanced indexing
- File upload and processing pipeline
- Firebase
- Automated backup and migration systems

### 💳 Payment & Billing System

#### **Integrated Payment Processing**
- Secure payment gateway integration
- Subscription management
- Usage-based billing for AI features
- Admin billing controls and monitoring

#### **Content Monetization**
- Premium content access controls
- AI generation credits system
- Tiered subscription models
- Payment success/failure handling

### 🛡️ Enterprise Security

#### **Firebase Authentication**
- Secure user authentication and authorization
- Role-based access control (Admin/User)
- JWT token management
- Email verification and password reset

#### **Data Protection**
- Encrypted data transmission
- Secure file upload and storage
- User data privacy compliance
- Content moderation system

### 📊 Analytics & Monitoring

#### **Learning Analytics**
- Quiz performance tracking
- Content engagement metrics
- User progress monitoring
- AI usage analytics

#### **Admin Dashboard**
- User management interface
- Content moderation tools
- System health monitoring
- Billing and payment oversight

### 🔧 Technical Architecture

#### **Backend (FastAPI)**
- **Framework**: FastAPI with async/await support
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Vector DB**: QDRANT for semantic search
- **AI Services**: Google Gemini integration
- **Authentication**: Firebase Admin SDK
- **Testing**: Pytest with 80%+ coverage

#### **Frontend (React + TypeScript)**
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **State Management**: React Query for server state
- **Routing**: React Router for SPA navigation
- **Testing**: Vitest + Testing Library

#### **DevOps & Deployment**
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for local development
- **E2E Testing**: Playwright with comprehensive scenarios
- **CI/CD**: GitHub Actions 

### 🎯 Key Features

- **Smart Document Processing**: Upload PDFs, generate embeddings, create searchable knowledge base
- **Intelligent Chat System**: Context-aware conversations with document-based responses
- **Automated Content Creation**: Generate flashcards, quizzes, and presentations from documents
- **Real-time Collaboration**: Live chat with AI tutoring capabilities
- **Progress Tracking**: Comprehensive analytics for learning outcomes
- **Multi-tenant Architecture**: Support for multiple users with data isolation
- **Responsive Design**: Mobile-first UI with cross-platform compatibility

## 🛠️ Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.9+ (for local backend development)

### Environment Configuration
1. Copy `.env.example` to `.env` in backend directory
2. Configure Firebase credentials in `backend/keys/firebaseKey.json`
3. Set up database connection strings
4. Configure AI service API keys

### Development Workflow
1. Start services: `docker compose up --build`
2. Backend runs on: `http://localhost:8000`
3. Frontend runs on: `http://localhost:3000`
4. API docs available at: `http://localhost:8000/docs`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Write tests for your changes
4. Ensure all tests pass: `npm test` / `pytest`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation for implementation details

---

*Built with ❤️ by the StudyBuddy team - Transforming education through AI*
