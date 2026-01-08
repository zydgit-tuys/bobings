# Bobings ERP

Bobings ERP is a comprehensive Enterprise Resource Planning system built with modern web technologies, designed to manage Inventory, Sales, Puchasing, and Accounting.

## Features

-   **Inventory Management**: Track stock levels, variants (Size/Color), warehouses, and internal transfers.
-   **Sales**: Manage Sales Orders, Fulfillment, and Integration with Marketplaces (Shopee, Tokopedia, etc.).
-   **Purchasing**: Purchase Orders, Goods Receipt, and Supplier Management.
-   **Accounting (V2)**:
    -   **Auto-Journaling**: Automated double-entry bookkeeping for all transactional events.
    -   **V2 Mapping Engine**: Flexible, table-driven account mapping for various scenarios (Marketplace vs Manual, specific products).
    -   **Financial Reports**: Trial Balance, General Ledger, and Profit & Loss.

## Technology Stack

-   **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui.
-   **Backend**: Supabase (PostgreSQL, Edge Functions, Auth, Realtime).
-   **Infrastructure**: Docker (for local development/deployment options).

## Getting Started

### Prerequisites

-   Node.js & npm
-   Supabase CLI (for local backend development)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd bobings
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

## Documentation

For detailed architectural documentation, please refer to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
