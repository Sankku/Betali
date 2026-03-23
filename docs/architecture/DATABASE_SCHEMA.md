# Database Schema Documentation

Generated from `database.types.ts`.

## alert_settings

| Column | Type | Nullable |
|---|---|---|
| check_interval_minutes | `number` | Yes |
| created_at | `string` | Yes |
| email_notifications | `boolean` | Yes |
| enable_expiring_soon_alerts | `boolean` | Yes |
| enable_low_stock_alerts | `boolean` | Yes |
| enable_out_of_stock_alerts | `boolean` | Yes |
| enable_overstock_alerts | `boolean` | Yes |
| expiring_soon_days | `number` | Yes |
| in_app_notifications | `boolean` | Yes |
| last_check_at | `string` | Yes |
| low_stock_percentage | `number` | Yes |
| notification_emails | `Json` | Yes |
| organization_id | `string` | No |
| setting_id | `string` | No |
| updated_at | `string` | Yes |

## applied_discounts

| Column | Type | Nullable |
|---|---|---|
| applied_at | `string` | Yes |
| applied_discount_id | `string` | No |
| applied_to | `string` | No |
| coupon_code | `string` | Yes |
| discount_amount | `number` | No |
| discount_rule_id | `string` | No |
| order_id | `string` | No |
| order_line_id | `string` | Yes |
| organization_id | `string` | No |

## branches

| Column | Type | Nullable |
|---|---|---|
| address | `string` | Yes |
| branch_id | `string` | No |
| created_at | `string` | Yes |
| is_active | `boolean` | Yes |
| is_main_branch | `boolean` | Yes |
| manager_user_id | `string` | Yes |
| name | `string` | No |
| organization_id | `string` | Yes |
| phone | `string` | Yes |
| settings | `Json` | Yes |
| updated_at | `string` | Yes |

## clients

| Column | Type | Nullable |
|---|---|---|
| address | `string` | Yes |
| branch_id | `string` | Yes |
| client_id | `string` | No |
| created_at | `string` | Yes |
| cuit | `string` | No |
| email | `string` | No |
| name | `string` | No |
| organization_id | `string` | Yes |
| phone | `string` | Yes |
| updated_at | `string` | Yes |
| user_id | `string` | Yes |

## customer_pricing

| Column | Type | Nullable |
|---|---|---|
| client_id | `string` | No |
| created_at | `string` | Yes |
| customer_pricing_id | `string` | No |
| is_active | `boolean` | Yes |
| notes | `string` | Yes |
| organization_id | `string` | No |
| price | `number` | No |
| product_id | `string` | No |
| updated_at | `string` | Yes |
| valid_from | `string` | Yes |
| valid_to | `string` | Yes |

## discount_rule_products

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| discount_rule_id | `string` | No |
| discount_rule_product_id | `string` | No |
| organization_id | `string` | No |
| product_id | `string` | No |

## discount_rules

| Column | Type | Nullable |
|---|---|---|
| applies_to | `string` | No |
| coupon_code | `string` | Yes |
| created_at | `string` | Yes |
| created_by | `string` | Yes |
| current_uses | `number` | Yes |
| description | `string` | Yes |
| discount_rule_id | `string` | No |
| is_active | `boolean` | Yes |
| max_discount_amount | `number` | Yes |
| max_uses | `number` | Yes |
| max_uses_per_customer | `number` | Yes |
| min_order_amount | `number` | Yes |
| min_quantity | `number` | Yes |
| name | `string` | No |
| organization_id | `string` | No |
| requires_coupon | `boolean` | Yes |
| type | `string` | No |
| updated_at | `string` | Yes |
| valid_from | `string` | Yes |
| valid_to | `string` | Yes |
| value | `number` | No |

## inventory_alerts

| Column | Type | Nullable |
|---|---|---|
| alert_id | `string` | No |
| alert_type | `string` | No |
| created_at | `string` | Yes |
| current_stock | `number` | No |
| dismissed_at | `string` | Yes |
| dismissed_by | `string` | Yes |
| max_stock | `number` | Yes |
| message | `string` | No |
| metadata | `Json` | Yes |
| min_stock | `number` | Yes |
| organization_id | `string` | No |
| product_id | `string` | No |
| resolved_at | `string` | Yes |
| severity | `string` | No |
| status | `string` | No |
| triggered_at | `string` | No |
| updated_at | `string` | Yes |
| warehouse_id | `string` | Yes |

## invoices

| Column | Type | Nullable |
|---|---|---|
| amount | `number` | No |
| created_at | `string` | Yes |
| currency | `string` | No |
| due_date | `string` | No |
| invoice_id | `string` | No |
| invoice_number | `string` | No |
| issue_date | `string` | Yes |
| notes | `string` | Yes |
| organization_id | `string` | No |
| paid_date | `string` | Yes |
| period_end | `string` | No |
| period_start | `string` | No |
| status | `string` | Yes |
| subscription_id | `string` | Yes |
| updated_at | `string` | Yes |

## manual_payments

| Column | Type | Nullable |
|---|---|---|
| admin_notes | `string` | Yes |
| amount | `number` | No |
| confirmed_at | `string` | Yes |
| confirmed_by | `string` | Yes |
| created_at | `string` | Yes |
| currency | `string` | No |
| invoice_number | `string` | Yes |
| notes | `string` | Yes |
| organization_id | `string` | No |
| payment_date | `string` | Yes |
| payment_id | `string` | No |
| payment_method | `string` | Yes |
| receipt_url | `string` | Yes |
| recorded_by | `string` | No |
| status | `string` | Yes |
| subscription_id | `string` | Yes |
| transaction_reference | `string` | Yes |
| updated_at | `string` | Yes |

## order_details

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| discount_amount | `number` | Yes |
| line_total | `number` | No |
| order_detail_id | `string` | No |
| order_id | `string` | Yes |
| order_item_id | `string` | Yes |
| organization_id | `string` | Yes |
| price | `number` | No |
| product_id | `string` | Yes |
| quantity | `number` | No |
| tax_amount | `number` | Yes |
| unit_price | `number` | No |
| warehouse_id | `string` | Yes |

## orders

| Column | Type | Nullable |
|---|---|---|
| branch_id | `string` | Yes |
| client_id | `string` | Yes |
| created_at | `string` | Yes |
| created_by | `string` | Yes |
| delivery_date | `string` | Yes |
| discount_amount | `number` | Yes |
| notes | `string` | Yes |
| order_date | `string` | Yes |
| order_id | `string` | No |
| order_number | `string` | Yes |
| organization_id | `string` | Yes |
| shipping_amount | `number` | Yes |
| status | `string` | No |
| subtotal | `number` | Yes |
| tax_amount | `number` | Yes |
| total | `number` | Yes |
| total_price | `number` | No |
| updated_at | `string` | Yes |
| user_id | `string` | Yes |
| warehouse_id | `string` | Yes |

## organizations

| Column | Type | Nullable |
|---|---|---|
| address | `string` | Yes |
| created_at | `string` | Yes |
| domain | `string` | Yes |
| email | `string` | Yes |
| features | `Json` | Yes |
| grace_period_ends_at | `string` | Yes |
| is_active | `boolean` | Yes |
| logo_url | `string` | Yes |
| max_users | `number` | Yes |
| max_warehouses | `number` | Yes |
| name | `string` | No |
| organization_id | `string` | No |
| owner_user_id | `string` | Yes |
| phone | `string` | Yes |
| plan_type | `Database[public][Enums][plan_type_enum]` | Yes |
| settings | `Json` | Yes |
| slug | `string` | No |
| subscription_plan | `string` | Yes |
| subscription_status | `string` | Yes |
| tax_id | `string` | Yes |
| trial_ends_at | `string` | Yes |
| updated_at | `string` | Yes |

## pricing_tiers

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| is_active | `boolean` | Yes |
| max_quantity | `number` | Yes |
| min_quantity | `number` | No |
| organization_id | `string` | No |
| price | `number` | No |
| pricing_tier_id | `string` | No |
| product_id | `string` | No |
| tier_name | `string` | No |
| updated_at | `string` | Yes |
| valid_from | `string` | Yes |
| valid_to | `string` | Yes |

## product_tax_groups

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| organization_id | `string` | No |
| product_id | `string` | No |
| product_tax_group_id | `string` | No |
| tax_rate_id | `string` | No |

## products

| Column | Type | Nullable |
|---|---|---|
| alert_enabled | `boolean` | Yes |
| batch_number | `string` | No |
| branch_id | `string` | Yes |
| created_at | `string` | Yes |
| description | `string` | Yes |
| destination_id | `string` | Yes |
| expiration_date | `string` | No |
| external_product_id | `string` | Yes |
| max_stock | `number` | Yes |
| min_stock | `number` | Yes |
| name | `string` | No |
| organization_id | `string` | Yes |
| origin_country | `string` | No |
| owner_id | `string` | Yes |
| price | `number` | Yes |
| product_id | `string` | No |
| senasa_product_id | `string` | Yes |
| updated_at | `string` | Yes |

## purchase_order_details

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| detail_id | `string` | No |
| line_total | `number` | No |
| notes | `string` | Yes |
| organization_id | `string` | No |
| product_id | `string` | No |
| purchase_order_id | `string` | No |
| quantity | `number` | No |
| received_quantity | `number` | Yes |
| unit_price | `number` | No |

## purchase_orders

| Column | Type | Nullable |
|---|---|---|
| branch_id | `string` | Yes |
| created_at | `string` | Yes |
| created_by | `string` | Yes |
| discount_amount | `number` | Yes |
| expected_delivery_date | `string` | Yes |
| notes | `string` | Yes |
| order_date | `string` | Yes |
| organization_id | `string` | No |
| purchase_order_id | `string` | No |
| purchase_order_number | `string` | Yes |
| received_date | `string` | Yes |
| shipping_amount | `number` | Yes |
| status | `string` | No |
| subtotal | `number` | Yes |
| supplier_id | `string` | Yes |
| tax_amount | `number` | Yes |
| total | `number` | Yes |
| updated_at | `string` | Yes |
| user_id | `string` | Yes |
| warehouse_id | `string` | Yes |

## senasa_products

| Column | Type | Nullable |
|---|---|---|
| capacity | `number` | Yes |
| created_at | `string` | Yes |
| formulation_id | `string` | Yes |
| material_id | `string` | Yes |
| package_id | `string` | Yes |
| reg_senasa | `string` | Yes |
| senasa_product_id | `string` | No |
| toxicological_class_id | `string` | Yes |
| unit_id | `string` | Yes |

## senasa_transactions

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| error_message | `string` | Yes |
| method_name | `string` | No |
| request_data | `Json` | No |
| response_data | `Json` | Yes |
| status | `string` | No |
| transaction_date | `string` | Yes |
| transaction_id | `string` | No |

## stock_movements

| Column | Type | Nullable |
|---|---|---|
| branch_id | `string` | Yes |
| created_at | `string` | Yes |
| created_by | `string` | Yes |
| movement_date | `string` | Yes |
| movement_id | `string` | No |
| movement_type | `string` | No |
| notes | `string` | Yes |
| organization_id | `string` | Yes |
| product_id | `string` | Yes |
| quantity | `number` | No |
| reference | `string` | Yes |
| reference_id | `string` | Yes |
| reference_type | `string` | Yes |
| warehouse_id | `string` | Yes |

## stock_reservations

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | No |
| created_by | `string` | Yes |
| notes | `string` | Yes |
| order_id | `string` | No |
| organization_id | `string` | No |
| product_id | `string` | No |
| quantity | `number` | No |
| released_at | `string` | Yes |
| reservation_id | `string` | No |
| reserved_at | `string` | No |
| status | `string` | No |
| updated_at | `string` | No |
| warehouse_id | `string` | Yes |

## subscription_history

| Column | Type | Nullable |
|---|---|---|
| changed_by | `string` | Yes |
| created_at | `string` | Yes |
| event_type | `string` | No |
| history_id | `string` | No |
| new_plan_id | `string` | Yes |
| new_status | `string` | Yes |
| notes | `string` | Yes |
| old_plan_id | `string` | Yes |
| old_status | `string` | Yes |
| organization_id | `string` | No |
| subscription_id | `string` | Yes |

## subscription_plans

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| currency | `string` | No |
| description | `string` | Yes |
| display_name | `string` | No |
| features | `Json` | Yes |
| is_active | `boolean` | Yes |
| is_public | `boolean` | Yes |
| max_clients | `number` | Yes |
| max_orders_per_month | `number` | Yes |
| max_products | `number` | Yes |
| max_stock_movements_per_month | `number` | Yes |
| max_storage_mb | `number` | Yes |
| max_suppliers | `number` | Yes |
| max_users | `number` | Yes |
| max_warehouses | `number` | Yes |
| name | `string` | No |
| plan_id | `string` | No |
| price_monthly | `number` | No |
| price_yearly | `number` | No |
| sort_order | `number` | Yes |
| trial_days | `number` | Yes |
| updated_at | `string` | Yes |

## subscriptions

| Column | Type | Nullable |
|---|---|---|
| amount | `number` | No |
| billing_cycle | `string` | No |
| canceled_at | `string` | Yes |
| created_at | `string` | Yes |
| currency | `string` | No |
| current_period_end | `string` | No |
| current_period_start | `string` | No |
| ended_at | `string` | Yes |
| gateway_customer_id | `string` | Yes |
| gateway_subscription_id | `string` | Yes |
| metadata | `Json` | Yes |
| organization_id | `string` | No |
| payment_gateway | `string` | Yes |
| payment_provider | `string` | Yes |
| plan_id | `string` | No |
| provider_customer_id | `string` | Yes |
| provider_subscription_id | `string` | Yes |
| status | `string` | No |
| subscription_id | `string` | No |
| trial_end | `string` | Yes |
| trial_start | `string` | Yes |
| updated_at | `string` | Yes |

## suppliers

| Column | Type | Nullable |
|---|---|---|
| address | `string` | Yes |
| branch_id | `string` | Yes |
| business_type | `string` | Yes |
| contact_person | `string` | Yes |
| created_at | `string` | Yes |
| credit_limit | `number` | Yes |
| cuit | `string` | No |
| email | `string` | No |
| is_active | `boolean` | Yes |
| is_preferred | `boolean` | Yes |
| name | `string` | No |
| notes | `string` | Yes |
| organization_id | `string` | No |
| payment_terms | `string` | Yes |
| phone | `string` | Yes |
| supplier_id | `string` | No |
| tax_category | `string` | Yes |
| updated_at | `string` | Yes |
| user_id | `string` | Yes |
| website | `string` | Yes |

## table_configurations

| Column | Type | Nullable |
|---|---|---|
| config | `Json` | No |
| created_at | `string` | Yes |
| entity | `string` | No |
| id | `string` | No |
| name | `string` | No |

## tax_rates

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| description | `string` | Yes |
| is_active | `boolean` | Yes |
| is_inclusive | `boolean` | Yes |
| name | `string` | No |
| organization_id | `string` | No |
| rate | `number` | No |
| tax_rate_id | `string` | No |
| updated_at | `string` | Yes |

## usage_tracking

| Column | Type | Nullable |
|---|---|---|
| api_calls_count | `number` | Yes |
| clients_count | `number` | Yes |
| created_at | `string` | Yes |
| orders_count | `number` | Yes |
| organization_id | `string` | No |
| period_end | `string` | No |
| period_start | `string` | No |
| products_count | `number` | Yes |
| stock_movements_count | `number` | Yes |
| storage_used_mb | `number` | Yes |
| suppliers_count | `number` | Yes |
| updated_at | `string` | Yes |
| usage_id | `string` | No |
| users_count | `number` | Yes |
| warehouses_count | `number` | Yes |

## user_organizations

| Column | Type | Nullable |
|---|---|---|
| branch_id | `string` | Yes |
| is_active | `boolean` | No |
| joined_at | `string` | No |
| organization_id | `string` | No |
| permissions | `Json` | No |
| role | `Database[public][Enums][user_role_enum]` | No |
| user_id | `string` | No |
| user_organization_id | `string` | No |

## users

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| deactivated_at | `string` | Yes |
| deactivated_by | `string` | Yes |
| email | `string` | No |
| is_active | `boolean` | Yes |
| name | `string` | No |
| organization_id | `string` | Yes |
| password_hash | `string` | No |
| role | `string` | Yes |
| updated_at | `string` | Yes |
| updated_by | `string` | Yes |
| user_id | `string` | No |

## warehouse

| Column | Type | Nullable |
|---|---|---|
| branch_id | `string` | Yes |
| created_at | `string` | Yes |
| is_active | `boolean` | Yes |
| location | `string` | Yes |
| name | `string` | No |
| organization_id | `string` | Yes |
| owner_id | `string` | Yes |
| updated_at | `string` | Yes |
| user_id | `string` | Yes |
| warehouse_id | `string` | No |

## webhook_logs

| Column | Type | Nullable |
|---|---|---|
| created_at | `string` | Yes |
| event_data | `Json` | No |
| event_type | `string` | No |
| headers | `Json` | Yes |
| processed | `boolean` | Yes |
| processed_at | `string` | Yes |
| processing_error | `string` | Yes |
| provider | `string` | No |
| retry_count | `number` | Yes |
| webhook_log_id | `string` | No |

## Enums

### plan_type_enum
- professional
- enterprise

### user_role_enum
- super_admin
- organization_admin
- branch_manager
- supervisor
- employee
- readonly

