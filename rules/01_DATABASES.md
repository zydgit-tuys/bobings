| table_schema | table_name                    | column_name           | data_type                   |
| ------------ | ----------------------------- | --------------------- | --------------------------- |
| public       | stock_opname_lines            | created_at            | timestamp with time zone    |
| public       | sales_imports                 | updated_at            | timestamp with time zone    |
| public       | chart_of_accounts             | id                    | uuid                        |
| public       | chart_of_accounts             | account_type          | USER-DEFINED                |
| public       | chart_of_accounts             | parent_id             | uuid                        |
| public       | chart_of_accounts             | is_active             | boolean                     |
| public       | chart_of_accounts             | created_at            | timestamp with time zone    |
| public       | journal_entries               | id                    | uuid                        |
| public       | journal_entries               | entry_date            | date                        |
| public       | journal_entries               | reference_id          | uuid                        |
| public       | journal_entries               | total_debit           | numeric                     |
| public       | journal_entries               | total_credit          | numeric                     |
| public       | journal_entries               | created_at            | timestamp with time zone    |
| public       | bank_accounts                 | id                    | uuid                        |
| public       | bank_accounts                 | account_id            | uuid                        |
| public       | bank_accounts                 | is_default            | boolean                     |
| public       | bank_accounts                 | is_active             | boolean                     |
| public       | bank_accounts                 | created_at            | timestamp with time zone    |
| public       | bank_accounts                 | updated_at            | timestamp with time zone    |
| public       | accounting_periods            | id                    | uuid                        |
| public       | accounting_periods            | start_date            | date                        |
| public       | accounting_periods            | end_date              | date                        |
| public       | accounting_periods            | closed_at             | timestamp with time zone    |
| public       | accounting_periods            | created_at            | timestamp with time zone    |
| public       | accounting_periods            | updated_at            | timestamp with time zone    |
| public       | sales_orders                  | id                    | uuid                        |
| public       | sales_orders                  | import_id             | uuid                        |
| public       | sales_orders                  | order_date            | date                        |
| public       | sales_orders                  | status                | USER-DEFINED                |
| public       | sales_orders                  | total_amount          | numeric                     |
| public       | sales_orders                  | total_hpp             | numeric                     |
| public       | sales_orders                  | total_fees            | numeric                     |
| public       | sales_orders                  | profit                | numeric                     |
| public       | sales_orders                  | created_at            | timestamp with time zone    |
| public       | sales_orders                  | updated_at            | timestamp with time zone    |
| public       | sales_orders                  | created_by            | uuid                        |
| public       | sales_orders                  | confirmed_by          | uuid                        |
| public       | sales_orders                  | confirmed_at          | timestamp with time zone    |
| public       | sales_orders                  | payout_id             | uuid                        |
| public       | sales_orders                  | customer_id           | uuid                        |
| public       | sales_orders                  | discount_amount       | numeric                     |
| public       | sales_orders                  | payment_account_id    | uuid                        |
| public       | stock_movements               | id                    | uuid                        |
| public       | stock_movements               | variant_id            | uuid                        |
| public       | stock_movements               | movement_type         | USER-DEFINED                |
| public       | stock_movements               | qty                   | integer                     |
| public       | stock_movements               | reference_id          | uuid                        |
| public       | stock_movements               | created_at            | timestamp with time zone    |
| public       | stock_movements               | allow_negative        | boolean                     |
| public       | warehouses                    | id                    | uuid                        |
| public       | warehouses                    | is_active             | boolean                     |
| public       | warehouses                    | is_default            | boolean                     |
| public       | warehouses                    | created_at            | timestamp with time zone    |
| public       | warehouses                    | updated_at            | timestamp with time zone    |
| public       | product_variant_price_history | id                    | uuid                        |
| public       | product_variant_price_history | variant_id            | uuid                        |
| public       | product_variant_price_history | old_harga_jual_umum   | numeric                     |
| public       | product_variant_price_history | old_harga_jual_khusus | numeric                     |
| public       | product_variant_price_history | old_hpp               | numeric                     |
| public       | product_variant_price_history | new_harga_jual_umum   | numeric                     |
| public       | product_variant_price_history | new_harga_jual_khusus | numeric                     |
| public       | product_variant_price_history | new_hpp               | numeric                     |
| public       | product_variant_price_history | changed_by            | uuid                        |
| public       | product_variant_price_history | changed_at            | timestamp with time zone    |
| public       | product_variant_price_history | created_at            | timestamp with time zone    |
| public       | customer_payments             | id                    | uuid                        |
| public       | customer_payments             | payment_date          | date                        |
| public       | customer_payments             | customer_id           | uuid                        |
| public       | customer_payments             | amount                | numeric                     |
| public       | customer_payments             | bank_account_id       | uuid                        |
| public       | customer_payments             | created_at            | timestamp with time zone    |
| public       | customer_payments             | updated_at            | timestamp with time zone    |
| public       | customer_payments             | created_by            | uuid                        |
| public       | customer_payment_allocations  | id                    | uuid                        |
| public       | customer_payment_allocations  | payment_id            | uuid                        |
| public       | customer_payment_allocations  | sales_order_id        | uuid                        |
| public       | customer_payment_allocations  | allocated_amount      | numeric                     |
| public       | customer_payment_allocations  | created_at            | timestamp with time zone    |
| public       | stock_opname                  | id                    | uuid                        |
| public       | stock_opname                  | opname_date           | date                        |
| public       | stock_opname                  | warehouse_id          | uuid                        |
| public       | stock_opname                  | confirmed_at          | timestamp with time zone    |
| public       | stock_opname                  | confirmed_by          | uuid                        |
| public       | stock_opname                  | created_at            | timestamp with time zone    |
| public       | stock_opname                  | updated_at            | timestamp with time zone    |
| public       | stock_opname                  | created_by            | uuid                        |
| public       | stock_opname_lines            | id                    | uuid                        |
| public       | stock_opname_lines            | opname_id             | uuid                        |
| public       | stock_opname_lines            | variant_id            | uuid                        |
| public       | stock_opname_lines            | system_qty            | numeric                     |
| public       | stock_opname_lines            | physical_qty          | numeric                     |
| public       | stock_opname_lines            | difference_qty        | numeric                     |
| public       | stock_opname_lines            | unit_cost             | numeric                     |
| public       | brands                        | id                    | uuid                        |
| public       | brands                        | is_active             | boolean                     |
| public       | brands                        | created_at            | timestamp with time zone    |
| public       | brands                        | updated_at            | timestamp with time zone    |
| public       | categories                    | id                    | uuid                        |
| public       | categories                    | parent_id             | uuid                        |
| public       | categories                    | level                 | integer                     |
| public       | categories                    | is_active             | boolean                     |
| public       | categories                    | created_at            | timestamp with time zone    |
| public       | categories                    | updated_at            | timestamp with time zone    |
| public       | variant_attributes            | id                    | uuid                        |
| public       | variant_attributes            | created_at            | timestamp with time zone    |
| public       | suppliers                     | id                    | uuid                        |
| public       | suppliers                     | is_active             | boolean                     |
| public       | suppliers                     | created_at            | timestamp with time zone    |
| public       | suppliers                     | updated_at            | timestamp with time zone    |
| public       | purchases                     | id                    | uuid                        |
| public       | purchases                     | supplier_id           | uuid                        |
| public       | purchases                     | order_date            | date                        |
| public       | purchases                     | expected_date         | date                        |
| public       | purchases                     | received_date         | date                        |
| public       | purchases                     | status                | USER-DEFINED                |
| public       | purchases                     | total_amount          | numeric                     |
| public       | purchases                     | total_qty             | integer                     |
| public       | purchases                     | created_at            | timestamp with time zone    |
| public       | purchases                     | updated_at            | timestamp with time zone    |
| public       | purchases                     | created_by            | uuid                        |
| public       | purchases                     | confirmed_by          | uuid                        |
| public       | purchases                     | confirmed_at          | timestamp with time zone    |
| public       | app_settings                  | id                    | uuid                        |
| public       | app_settings                  | created_at            | timestamp with time zone    |
| public       | app_settings                  | updated_at            | timestamp with time zone    |
| public       | purchase_order_lines          | id                    | uuid                        |
| public       | purchase_order_lines          | purchase_id           | uuid                        |
| public       | purchase_order_lines          | variant_id            | uuid                        |
| public       | purchase_order_lines          | qty_ordered           | integer                     |
| public       | purchase_order_lines          | qty_received          | integer                     |
| public       | purchase_order_lines          | unit_cost             | numeric                     |
| public       | purchase_order_lines          | subtotal              | numeric                     |
| public       | purchase_order_lines          | created_at            | timestamp with time zone    |
| public       | purchase_order_lines          | updated_at            | timestamp with time zone    |
| public       | product_suppliers             | id                    | uuid                        |
| public       | product_suppliers             | product_id            | uuid                        |
| public       | product_suppliers             | supplier_id           | uuid                        |
| public       | product_suppliers             | purchase_price        | numeric                     |
| public       | product_suppliers             | is_preferred          | boolean                     |
| public       | product_suppliers             | created_at            | timestamp with time zone    |
| public       | product_suppliers             | updated_at            | timestamp with time zone    |
| public       | product_suppliers             | variant_id            | uuid                        |
| public       | product_images                | id                    | uuid                        |
| public       | product_images                | product_id            | uuid                        |
| public       | product_images                | display_order         | integer                     |
| public       | product_images                | is_primary            | boolean                     |
| public       | product_images                | file_size             | integer                     |
| public       | product_images                | width                 | integer                     |
| public       | product_images                | height                | integer                     |
| public       | product_images                | uploaded_by           | uuid                        |
| public       | product_images                | created_at            | timestamp without time zone |
| public       | product_images                | updated_at            | timestamp without time zone |
| public       | product_price_history         | id                    | uuid                        |
| public       | product_price_history         | variant_id            | uuid                        |
| public       | product_price_history         | price                 | numeric                     |
| public       | product_price_history         | cost_price            | numeric                     |
| public       | product_price_history         | effective_date        | timestamp with time zone    |
| public       | product_price_history         | created_by            | uuid                        |
| public       | products                      | id                    | uuid                        |
| public       | products                      | brand_id              | uuid                        |
| public       | products                      | category_id           | uuid                        |
| public       | products                      | base_price            | numeric                     |
| public       | products                      | is_active             | boolean                     |
| public       | products                      | created_at            | timestamp with time zone    |
| public       | products                      | updated_at            | timestamp with time zone    |
| public       | products                      | virtual_stock         | boolean                     |
| public       | products                      | sort_order            | integer                     |
| public       | products                      | base_hpp              | numeric                     |
| public       | products                      | unit_id               | uuid                        |
| public       | products                      | weight                | numeric                     |
| public       | products                      | product_type          | USER-DEFINED                |
| public       | product_variants              | id                    | uuid                        |
| public       | product_variants              | product_id            | uuid                        |
| public       | product_variants              | size_value_id         | uuid                        |
| public       | product_variants              | color_value_id        | uuid                        |
| public       | product_variants              | price                 | numeric                     |
| public       | product_variants              | stock_qty             | integer                     |
| public       | product_variants              | min_stock_alert       | integer                     |
| public       | product_variants              | is_active             | boolean                     |
| public       | product_variants              | created_at            | timestamp with time zone    |
| public       | product_variants              | updated_at            | timestamp with time zone    |
| public       | product_variants              | reserved_qty          | integer                     |
| public       | product_variants              | initial_stock         | integer                     |
| public       | product_variants              | harga_jual_umum       | numeric                     |
| public       | product_variants              | harga_khusus          | numeric                     |
| public       | units                         | id                    | uuid                        |
| public       | units                         | is_active             | boolean                     |
| public       | units                         | created_at            | timestamp without time zone |
| public       | units                         | updated_at            | timestamp without time zone |
| public       | sales_returns                 | id                    | uuid                        |
| public       | sales_returns                 | sales_order_id        | uuid                        |
| public       | sales_returns                 | return_date           | date                        |
| public       | sales_returns                 | total_refund          | numeric                     |
| public       | sales_returns                 | created_at            | timestamp with time zone    |
| public       | sales_returns                 | updated_at            | timestamp with time zone    |
| public       | sales_return_lines            | id                    | uuid                        |
| public       | sales_return_lines            | return_id             | uuid                        |
| public       | sales_return_lines            | sales_order_line_id   | uuid                        |
| public       | sales_return_lines            | qty                   | integer                     |
| public       | sales_return_lines            | unit_price            | numeric                     |
| public       | sales_return_lines            | created_at            | timestamp with time zone    |
| public       | marketplace_payouts           | id                    | uuid                        |
| public       | marketplace_payouts           | start_date            | date                        |
| public       | marketplace_payouts           | end_date              | date                        |
| public       | marketplace_payouts           | total_amount          | numeric                     |
| public       | marketplace_payouts           | total_orders          | integer                     |
| public       | marketplace_payouts           | created_at            | timestamp with time zone    |
| public       | marketplace_payouts           | updated_at            | timestamp with time zone    |
| public       | purchase_returns              | id                    | uuid                        |
| public       | purchase_returns              | purchase_id           | uuid                        |
| public       | purchase_returns              | return_date           | date                        |
| public       | purchase_returns              | status                | USER-DEFINED                |
| public       | purchase_returns              | created_at            | timestamp with time zone    |
| public       | purchase_returns              | updated_at            | timestamp with time zone    |
| public       | purchase_return_lines         | id                    | uuid                        |
| public       | purchase_return_lines         | return_id             | uuid                        |
| public       | purchase_return_lines         | purchase_line_id      | uuid                        |
| public       | purchase_return_lines         | qty                   | numeric                     |
| public       | purchase_return_lines         | created_at            | timestamp with time zone    |
| public       | purchase_return_lines         | updated_at            | timestamp with time zone    |
| public       | journal_account_mappings      | id                    | uuid                        |
| public       | journal_account_mappings      | account_id            | uuid                        |
| public       | journal_account_mappings      | is_active             | boolean                     |
| public       | journal_account_mappings      | priority              | integer                     |
| public       | journal_account_mappings      | created_at            | timestamp with time zone    |
| public       | journal_account_mappings      | updated_at            | timestamp with time zone    |
| public       | customers                     | id                    | uuid                        |
| public       | customers                     | is_active             | boolean                     |
| public       | customers                     | created_at            | timestamp with time zone    |
| public       | customers                     | updated_at            | timestamp with time zone    |
| public       | attribute_values              | id                    | uuid                        |
| public       | attribute_values              | attribute_id          | uuid                        |
| public       | attribute_values              | sort_order            | integer                     |
| public       | attribute_values              | created_at            | timestamp with time zone    |
| public       | journal_lines                 | id                    | uuid                        |
| public       | journal_lines                 | entry_id              | uuid                        |
| public       | journal_lines                 | account_id            | uuid                        |
| public       | journal_lines                 | debit                 | numeric                     |
| public       | journal_lines                 | credit                | numeric                     |
| public       | journal_lines                 | created_at            | timestamp with time zone    |
| public       | order_items                   | id                    | uuid                        |
| public       | order_items                   | order_id              | uuid                        |
| public       | order_items                   | variant_id            | uuid                        |
| public       | order_items                   | qty                   | integer                     |
| public       | order_items                   | unit_price            | numeric                     |
| public       | order_items                   | hpp                   | numeric                     |
| public       | order_items                   | subtotal              | numeric                     |
| public       | order_items                   | created_at            | timestamp with time zone    |
| public       | sales_imports                 | id                    | uuid                        |
| public       | sales_imports                 | import_date           | date                        |
| public       | sales_imports                 | total_orders          | integer                     |
| public       | sales_imports                 | success_count         | integer                     |
| public       | sales_imports                 | skipped_count         | integer                     |
| public       | sales_imports                 | skipped_details       | jsonb                       |
| public       | sales_imports                 | status                | USER-DEFINED                |
| public       | sales_imports                 | created_at            | timestamp with time zone    |
| public       | brands                        | name                  | text                        |
| public       | stock_opname                  | notes                 | text                        |
| public       | bank_accounts                 | bank_name             | text                        |
| public       | products                      | images                | ARRAY                       |
| public       | bank_accounts                 | account_number        | text                        |
| public       | categories                    | name                  | text                        |
| public       | bank_accounts                 | account_holder        | text                        |
| public       | purchase_return_lines         | notes                 | text                        |
| public       | products                      | barcode               | text                        |
| public       | customer_payments             | payment_method        | text                        |
| public       | sales_imports                 | filename              | text                        |
| public       | products                      | dimensions            | text                        |
| public       | variant_attributes            | name                  | text                        |
| public       | stock_opname_lines            | notes                 | text                        |
| public       | journal_account_mappings      | event_type            | text                        |
| public       | suppliers                     | code                  | text                        |
| public       | suppliers                     | name                  | text                        |
| public       | suppliers                     | contact_person        | text                        |
| public       | suppliers                     | phone                 | text                        |
| public       | suppliers                     | email                 | text                        |
| public       | suppliers                     | address               | text                        |
| public       | suppliers                     | city                  | text                        |
| public       | suppliers                     | notes                 | text                        |
| public       | journal_account_mappings      | event_context         | text                        |
| public       | product_variants              | sku_variant           | text                        |
| public       | journal_account_mappings      | side                  | text                        |
| public       | stock_movements               | reference_type        | text                        |
| public       | purchases                     | purchase_no           | text                        |
| public       | journal_account_mappings      | product_type          | text                        |
| public       | journal_account_mappings      | marketplace_code      | text                        |
| public       | product_variant_price_history | reason                | text                        |
| public       | stock_movements               | notes                 | text                        |
| public       | accounting_periods            | period_name           | text                        |
| public       | customer_payments             | reference_no          | text                        |
| public       | product_variants              | barcode               | text                        |
| public       | purchases                     | notes                 | text                        |
| public       | customer_payments             | notes                 | text                        |
| public       | customers                     | code                  | text                        |
| public       | customers                     | name                  | text                        |
| public       | customers                     | email                 | text                        |
| public       | customers                     | phone                 | text                        |
| public       | units                         | code                  | text                        |
| public       | app_settings                  | setting_key           | text                        |
| public       | app_settings                  | setting_value         | text                        |
| public       | units                         | name                  | text                        |
| public       | units                         | symbol                | text                        |
| public       | app_settings                  | description           | text                        |
| public       | customers                     | address               | text                        |
| public       | customers                     | city                  | text                        |
| public       | customers                     | contact_person        | text                        |
| public       | customers                     | tax_id                | text                        |
| public       | customers                     | notes                 | text                        |
| public       | sales_returns                 | return_no             | text                        |
| public       | accounting_periods            | status                | text                        |
| public       | purchase_order_lines          | notes                 | text                        |
| public       | sales_returns                 | status                | text                        |
| public       | sales_returns                 | reason                | text                        |
| public       | customer_payments             | payment_no            | text                        |
| public       | chart_of_accounts             | code                  | text                        |
| public       | customers                     | customer_type         | text                        |
| public       | chart_of_accounts             | name                  | text                        |
| public       | product_suppliers             | currency              | text                        |
| public       | accounting_periods            | closed_by             | text                        |
| public       | attribute_values              | value                 | text                        |
| public       | accounting_periods            | notes                 | text                        |
| public       | warehouses                    | code                  | text                        |
| public       | sales_return_lines            | notes                 | text                        |
| public       | warehouses                    | name                  | text                        |
| public       | product_images                | image_url             | text                        |
| public       | product_images                | storage_path          | text                        |
| public       | warehouses                    | address               | text                        |
| public       | marketplace_payouts           | payout_no             | text                        |
| public       | product_images                | alt_text              | text                        |
| public       | marketplace_payouts           | marketplace           | text                        |
| public       | sales_orders                  | payment_method        | text                        |
| public       | journal_entries               | reference_type        | text                        |
| public       | sales_orders                  | desty_order_no        | text                        |
| public       | journal_lines                 | description           | text                        |
| public       | marketplace_payouts           | status                | text                        |
| public       | marketplace_payouts           | notes                 | text                        |
| public       | journal_entries               | description           | text                        |
| public       | sales_orders                  | marketplace           | text                        |
| public       | stock_opname                  | status                | text                        |
| public       | stock_opname                  | opname_no             | text                        |
| public       | purchase_returns              | return_no             | text                        |
| public       | order_items                   | sku_master            | text                        |
| public       | products                      | sku_master            | text                        |
| public       | products                      | name                  | text                        |
| public       | order_items                   | sku_variant           | text                        |
| public       | purchase_returns              | reason                | text                        |
| public       | products                      | description           | text                        |
| public       | order_items                   | product_name          | text                        |
| public       | sales_orders                  | customer_name         | text                        |