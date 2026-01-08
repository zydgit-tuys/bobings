# Architecture Overview

This document provides a technical overview of the Bobings ERP system.

## System Architecture

The system follows a headless architecture:
-   **Frontend**: a Single Page Application (SPA) built with React and Vite.
-   **Backend**: Supabase acts as the backend-as-a-service (BaaS), providing:
    -   **Database**: PostgreSQL for relational data storage.
    -   **Auth**: Authentication and Authorization (Row Level Security).
    -   **Edge Functions**: Serverless functions for complex business logic (e.g., Auto-journaling triggers).

## Core Modules

### 1. Inventory
Core tables: `product_master`, `product_variants`, `stock_quant`, `stock_movements`.
-   **Logic**: Inventory is tracked at the variant level per warehouse. 
-   **Atomic Operations**: Critical stock movements use database functions (RPCs) to ensure atomicity and prevent race conditions.

### 2. Accounting V2
The V2 Accounting module introduces a robust Auto-Journaling engine.
-   **Table**: `journal_entries`, `journal_lines`, `chart_of_accounts`.
-   **Mappings**: `journal_account_mappings` table defines which accounts to Debit/Credit based on:
    -   `event_type`: (e.g., `confirm_sales_order`, `receive_goods`).
    -   `event_context`: (e.g., `marketplace`, `manual`).
    -   `side`: `debit` or `credit`.
-   **Automation**: Edge functions (e.g., `auto-journal-sales`, `auto-journal-purchase`) listen to document status changes and generate journals automatically.

### 3. Sales & Purchasing
-   **Sales**: Handles Orders -> Delivery -> Invoice flows.
-   **Purchasing**: Handles PO -> Goods Receipt -> Bill -> Payment flows.

## Directory Structure

-   `/src`: Frontend source code.
    -   `/lib/api`: API wrappers for Supabase interactions.
    -   `/components`: Reusable UI components.
    -   `/pages`: Application routes.
-   `/supabase`: Backend configuration.
    -   `/migrations`: Database schema changes (SQL).
    -   `/functions`: Edge Functions (TypeScript/Deno).

## Development Guidelines

-   **Migrations**: Always use Supabase migrations for schema changes.
-   **Types**: Use `src/integrations/supabase/types.ts` for type safety (generated from DB schema).
-   **Linting**: Follow the configured ESLint rules.
