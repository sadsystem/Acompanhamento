# Sistema de Acompanhamento Diário - Ouro Verde (SAD)

## Overview

The Sistema de Acompanhamento Diário - Ouro Verde (SAD) is a daily performance tracking system designed for managing employee evaluations in a transportation company. The application allows users to evaluate their colleagues based on predefined criteria such as punctuality, conduct, route deviations, and product handling. The system includes role-based access control with admin and collaborator roles, comprehensive reporting capabilities, and real-time evaluation tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components with Radix UI primitives for consistent, accessible interface elements
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: Local component state with React hooks and context providers for global state
- **Routing**: Wouter for lightweight client-side routing
- **Data Fetching**: TanStack Query (React Query) for server state management and caching

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Schema Validation**: Zod for runtime type checking and validation
- **Development Server**: Custom Vite integration for hot module replacement in development

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM for schema management
- **Local Storage**: Browser localStorage for client-side caching and offline functionality
- **Session Management**: In-memory storage for development with plans for persistent sessions
- **Database Migrations**: Drizzle Kit for schema versioning and migrations

### Authentication and Authorization
- **Current Implementation**: Simple username/password authentication stored in localStorage (prototype phase)
- **Session Management**: Session tokens stored in localStorage with remember functionality
- **Role-Based Access**: Admin and collaborator roles with different permission levels
- **Future Enhancement**: Planned migration to JWT tokens with backend authentication and password hashing

### Module Structure
The application follows a modular architecture with clear separation of concerns:

- **Storage Layer**: Abstracted storage interface supporting multiple adapters (localStorage, API)
- **Authentication Service**: Centralized login/logout logic with session management
- **UI Components**: Reusable component library with form controls and validation
- **Page Components**: Feature-specific page components for different application views
- **Utility Modules**: Time handling (Brazil timezone), validation (CPF/phone), and calculation helpers

### Design Patterns
- **Adapter Pattern**: Storage abstraction allows switching between localStorage and API backends
- **Provider Pattern**: React Context for dependency injection of storage and configuration
- **Hook Pattern**: Custom hooks for storage access and authentication state
- **Validation Pipeline**: Centralized validation using Zod schemas shared between client and server

### Data Flow
The application implements a unidirectional data flow:
1. User interactions trigger actions in page components
2. Actions are processed through service layers (AuthService, storage adapters)
3. Data changes are persisted to storage (localStorage or API)
4. UI components reactively update based on state changes
5. Real-time data synchronization planned for production deployment

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18 with TypeScript support, React Query for data fetching
- **Build Tools**: Vite for development and production builds, ESBuild for server bundling
- **Database**: Neon Database (PostgreSQL) as the cloud database provider

### UI and Styling
- **Component Library**: Radix UI primitives for accessible base components
- **Design System**: Shadcn/ui for pre-built component patterns
- **Styling**: Tailwind CSS with PostCSS for utility-first styling
- **Icons**: Lucide React for consistent iconography

### Validation and Forms
- **Runtime Validation**: Zod for schema validation on both client and server
- **Form Handling**: React Hook Form with Zod resolvers for form validation
- **Date Handling**: date-fns for date manipulation and formatting

### Development and Testing
- **Testing**: Vitest for unit testing with React Testing Library
- **Code Quality**: TypeScript for static type checking
- **Development**: TSX for TypeScript execution, hot reload capabilities

### Production Considerations
- **Time Management**: Brazil timezone handling to prevent local clock manipulation
- **Security**: Planned migration from plaintext passwords to bcrypt/argon2 hashing
- **Scalability**: Modular architecture supports migration from localStorage to full API backend
- **Offline Support**: Current localStorage implementation provides offline functionality

The architecture is designed to support gradual migration from prototype to production, with clear separation between business logic and data persistence layers.