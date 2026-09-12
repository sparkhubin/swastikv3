CREATE TABLE role (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name VARCHAR(50) NOT NULL UNIQUE,
 description TEXT DEFAULT '',
 is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE permission (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 code VARCHAR(100) NOT NULL UNIQUE,
 name VARCHAR(150) NOT NULL,
 description TEXT DEFAULT '',
 module VARCHAR(100) DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE role_permission (
 role_id INTEGER NOT NULL,
 permission_id INTEGER NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (role_id, permission_id),
 FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
 FOREIGN KEY (permission_id) REFERENCES permission(id) ON DELETE CASCADE
);
CREATE TABLE user (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 full_name VARCHAR(150) NOT NULL,
 phone_number VARCHAR(20) NOT NULL UNIQUE,
 email VARCHAR(255) DEFAULT '',
 password_hash VARCHAR(255) NOT NULL,
 role_id INTEGER,
 status VARCHAR(30) NOT NULL DEFAULT 'Active',
 delivery_address TEXT DEFAULT '',
 is_master_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_master_admin IN (0,1)),
 last_login_at TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE SET NULL
);
CREATE TABLE user_session (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 token_hash VARCHAR(255) NOT NULL UNIQUE,
 expires_at TIMESTAMP NOT NULL,
 revoked_at TIMESTAMP,
 ip_address VARCHAR(100) DEFAULT '',
 user_agent TEXT DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE TABLE user_otp (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER,
 phone_number VARCHAR(20) NOT NULL,
 purpose VARCHAR(50) NOT NULL,
 otp_hash VARCHAR(255) NOT NULL,
 expires_at TIMESTAMP NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 consumed_at TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
CREATE TABLE customer (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name VARCHAR(255) NOT NULL,
 phone VARCHAR(50) NOT NULL UNIQUE,
 email VARCHAR(255) DEFAULT '',
 password_hash VARCHAR(255) DEFAULT '',
 address TEXT DEFAULT '',
 status VARCHAR(50) NOT NULL DEFAULT 'Active',
 dob VARCHAR(50) DEFAULT '',
 anniversary VARCHAR(50) DEFAULT '',
 referral_code VARCHAR(100) UNIQUE,
 last_login_at TIMESTAMP,
 registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE customer_session (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_id INTEGER NOT NULL,
 token_hash VARCHAR(255) NOT NULL UNIQUE,
 expires_at TIMESTAMP NOT NULL,
 revoked_at TIMESTAMP,
 ip_address VARCHAR(100) DEFAULT '',
 user_agent TEXT DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
CREATE TABLE customer_otp (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_id INTEGER,
 phone VARCHAR(50) NOT NULL,
 purpose VARCHAR(50) NOT NULL,
 otp_hash VARCHAR(255) NOT NULL,
 expires_at TIMESTAMP NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 consumed_at TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
CREATE TABLE category (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name_en VARCHAR(150) NOT NULL,
 name_hi VARCHAR(150) DEFAULT '',
 slug VARCHAR(180) NOT NULL UNIQUE,
 description_en TEXT DEFAULT '',
 description_hi TEXT DEFAULT '',
 image_url TEXT DEFAULT '',
 sort_order INTEGER NOT NULL DEFAULT 0,
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE brand (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name VARCHAR(150) NOT NULL UNIQUE,
 slug VARCHAR(180) NOT NULL UNIQUE,
 logo_url TEXT DEFAULT '',
 description TEXT DEFAULT '',
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE product (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 code VARCHAR(100) NOT NULL UNIQUE,
 name_en VARCHAR(255) NOT NULL,
 name_hi VARCHAR(255) DEFAULT '',
 category_id INTEGER,
 brand_id INTEGER,
 sub_en VARCHAR(255) DEFAULT '',
 sub_hi VARCHAR(255) DEFAULT '',
 price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
 original_price REAL DEFAULT 0 CHECK (original_price >= 0),
 discount_tag VARCHAR(100) DEFAULT '',
 image_url TEXT DEFAULT '',
 unit VARCHAR(255) DEFAULT '',
 unit_prices TEXT DEFAULT '{}',
 pack_en VARCHAR(100) DEFAULT '',
 pack_hi VARCHAR(100) DEFAULT '',
 gst_percent REAL NOT NULL DEFAULT 5 CHECK (gst_percent >= 0),
 is_image INTEGER NOT NULL DEFAULT 0 CHECK (is_image IN (0,1)),
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL,
 FOREIGN KEY (brand_id) REFERENCES brand(id) ON DELETE SET NULL
);
CREATE TABLE inventory (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product_id INTEGER NOT NULL UNIQUE,
 stock_qty REAL NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
 reserved_qty REAL NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
 reorder_level REAL NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
 unit VARCHAR(100) DEFAULT '',
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
);
CREATE TABLE stock_movement (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 product_id INTEGER NOT NULL,
 type VARCHAR(50) NOT NULL,
 quantity REAL NOT NULL,
 before_qty REAL NOT NULL,
 after_qty REAL NOT NULL,
 reference_type VARCHAR(50) DEFAULT '',
 reference_id VARCHAR(100) DEFAULT '',
 note TEXT DEFAULT '',
 created_by_user_id INTEGER,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE RESTRICT,
 FOREIGN KEY (created_by_user_id) REFERENCES user(id) ON DELETE SET NULL
);
CREATE TABLE cart (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_id INTEGER NOT NULL UNIQUE,
 coupon_code VARCHAR(100) DEFAULT '',
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE
);
CREATE TABLE cart_item (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 cart_id INTEGER NOT NULL,
 product_id INTEGER NOT NULL,
 qty REAL NOT NULL CHECK (qty > 0),
 weight_label VARCHAR(100) DEFAULT '',
 unit_price REAL NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE (cart_id, product_id, weight_label),
 FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
 FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE RESTRICT
);
CREATE TABLE coupon (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 code VARCHAR(100) NOT NULL UNIQUE,
 name VARCHAR(150) DEFAULT '',
 description TEXT DEFAULT '',
 discount_type VARCHAR(30) NOT NULL,
 discount_value REAL NOT NULL DEFAULT 0,
 minimum_order_amount REAL NOT NULL DEFAULT 0,
 maximum_discount_amount REAL,
 usage_limit INTEGER,
 usage_limit_per_customer INTEGER,
 used_count INTEGER NOT NULL DEFAULT 0,
 starts_at TIMESTAMP,
 expires_at TIMESTAMP,
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE coupon_usage (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 coupon_id INTEGER NOT NULL,
 customer_id INTEGER NOT NULL,
 order_id VARCHAR(50) NOT NULL,
 discount_amount REAL NOT NULL DEFAULT 0,
 used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE (coupon_id, order_id),
 FOREIGN KEY (coupon_id) REFERENCES coupon(id) ON DELETE RESTRICT,
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE RESTRICT
);
CREATE TABLE membership_plan (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name VARCHAR(150) NOT NULL UNIQUE,
 description TEXT DEFAULT '',
 duration_days INTEGER NOT NULL,
 price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
 discount_percent REAL NOT NULL DEFAULT 0 CHECK (discount_percent >= 0),
 free_delivery INTEGER NOT NULL DEFAULT 0 CHECK (free_delivery IN (0,1)),
 extra_points_multiplier REAL NOT NULL DEFAULT 1,
 benefits_json TEXT DEFAULT '[]',
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE customer_membership (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_id INTEGER NOT NULL,
 membership_plan_id INTEGER NOT NULL,
 membership_no VARCHAR(100) NOT NULL UNIQUE,
 start_date DATE NOT NULL,
 end_date DATE NOT NULL,
 amount_paid REAL NOT NULL DEFAULT 0,
 status VARCHAR(30) NOT NULL DEFAULT 'Active',
 payment_transaction_id INTEGER,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE RESTRICT,
 FOREIGN KEY (membership_plan_id) REFERENCES membership_plan(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS "order" (
 id VARCHAR(50) PRIMARY KEY,
 customer_id INTEGER NOT NULL,
 order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
 status_label VARCHAR(100) DEFAULT 'Confirmed',
 subtotal REAL NOT NULL DEFAULT 0,
 delivery_fee REAL NOT NULL DEFAULT 0,
 gst_amount REAL NOT NULL DEFAULT 0,
 grand_total REAL NOT NULL DEFAULT 0,
 referral_discount REAL NOT NULL DEFAULT 0,
 coupon_discount REAL NOT NULL DEFAULT 0,
 celebration_discount REAL NOT NULL DEFAULT 0,
 celebration_offer_name VARCHAR(255) DEFAULT '',
 applied_points INTEGER NOT NULL DEFAULT 0,
 points_earned INTEGER NOT NULL DEFAULT 0,
 coupon_code VARCHAR(100) DEFAULT '',
 payment_method VARCHAR(50) NOT NULL DEFAULT 'COD',
 payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
 shipping_address TEXT NOT NULL,
 customer_name VARCHAR(255) DEFAULT '',
 customer_phone VARCHAR(50) DEFAULT '',
 customer_email VARCHAR(255) DEFAULT '',
 is_marg_bill INTEGER NOT NULL DEFAULT 0,
 marg_reference VARCHAR(100) DEFAULT '',
 pdf_url TEXT DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE RESTRICT
);
CREATE TABLE order_item (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id VARCHAR(50) NOT NULL,
 product_id INTEGER,
 name_en VARCHAR(255) NOT NULL,
 name_hi VARCHAR(255) DEFAULT '',
 price REAL NOT NULL DEFAULT 0,
 qty REAL NOT NULL,
 weight_label VARCHAR(100) DEFAULT '',
 gst_percent REAL NOT NULL DEFAULT 0,
 line_total REAL NOT NULL DEFAULT 0,
 FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE CASCADE,
 FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE SET NULL
);
CREATE TABLE payment_transaction (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id VARCHAR(50),
 customer_id INTEGER,
 gateway VARCHAR(50) NOT NULL,
 gateway_order_id VARCHAR(255) DEFAULT '',
 gateway_payment_id VARCHAR(255) DEFAULT '',
 gateway_signature VARCHAR(500) DEFAULT '',
 amount REAL NOT NULL DEFAULT 0,
 currency VARCHAR(10) NOT NULL DEFAULT 'INR',
 status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
 method VARCHAR(50) DEFAULT '',
 failure_reason TEXT DEFAULT '',
 raw_response TEXT DEFAULT '',
 paid_at TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE SET NULL,
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE SET NULL
);
CREATE TABLE payment_settings (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 gateway VARCHAR(50) NOT NULL UNIQUE,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
 environment VARCHAR(30) NOT NULL DEFAULT 'TEST',
 key_id VARCHAR(255) DEFAULT '',
 secret_key VARCHAR(500) DEFAULT '',
 app_id VARCHAR(255) DEFAULT '',
 app_secret VARCHAR(500) DEFAULT '',
 extra_config TEXT DEFAULT '{}',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE delivery_staff (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER UNIQUE,
 name VARCHAR(150) NOT NULL,
 phone VARCHAR(30) NOT NULL UNIQUE,
 status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
 vehicle_type VARCHAR(100) DEFAULT '',
 vehicle_number VARCHAR(100) DEFAULT '',
 current_lat REAL,
 current_lng REAL,
 last_location_at TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);
CREATE TABLE delivery_assignment (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id VARCHAR(50) NOT NULL UNIQUE,
 delivery_staff_id INTEGER NOT NULL,
 status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED',
 assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 picked_up_at TIMESTAMP,
 out_for_delivery_at TIMESTAMP,
 delivered_at TIMESTAMP,
 failed_at TIMESTAMP,
 failure_reason TEXT DEFAULT '',
 delivery_note TEXT DEFAULT '',
 cod_collected_amount REAL DEFAULT 0,
 cod_status VARCHAR(50) DEFAULT 'NOT_APPLICABLE',
 cod_settled_at TIMESTAMP,
 cod_cleared_by_user_id INTEGER,
 cod_settlement_note TEXT DEFAULT '',
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE CASCADE,
 FOREIGN KEY (delivery_staff_id) REFERENCES delivery_staff(id) ON DELETE RESTRICT,
 FOREIGN KEY (cod_cleared_by_user_id) REFERENCES user(id) ON DELETE SET NULL
);
CREATE TABLE customer_points (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_id INTEGER NOT NULL,
 points INTEGER NOT NULL,
 type VARCHAR(50) NOT NULL,
 reference_id VARCHAR(100) DEFAULT '',
 description TEXT DEFAULT '',
 referrer_customer_id INTEGER,
 referred_customer_id INTEGER,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE RESTRICT,
 FOREIGN KEY (referrer_customer_id) REFERENCES customer(id) ON DELETE SET NULL,
 FOREIGN KEY (referred_customer_id) REFERENCES customer(id) ON DELETE SET NULL
);
CREATE TABLE notification (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 recipient_type VARCHAR(30) NOT NULL,
 recipient_id INTEGER,
 recipient_phone VARCHAR(50) DEFAULT '',
 order_id VARCHAR(50) DEFAULT '',
 title_en VARCHAR(255) NOT NULL,
 title_hi VARCHAR(255) DEFAULT '',
 message_en TEXT NOT NULL,
 message_hi TEXT DEFAULT '',
 type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
 is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 read_at TIMESTAMP,
 FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE CASCADE
);
CREATE TABLE whatsapp_settings (
 id INTEGER PRIMARY KEY DEFAULT 1,
 provider VARCHAR(50) NOT NULL DEFAULT 'META',
 enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
 meta_phone_number_id VARCHAR(255) DEFAULT '',
 meta_access_token TEXT DEFAULT '',
 meta_business_account_id VARCHAR(255) DEFAULT '',
 api_version VARCHAR(50) DEFAULT '',
 twilio_account_sid VARCHAR(255) DEFAULT '',
 twilio_auth_token VARCHAR(500) DEFAULT '',
 twilio_whatsapp_from VARCHAR(100) DEFAULT '',
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE whatsapp_template (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name VARCHAR(150) NOT NULL UNIQUE,
 meta_template_name VARCHAR(150) NOT NULL,
 language_code VARCHAR(20) NOT NULL DEFAULT 'en',
 category VARCHAR(50) DEFAULT '',
 purpose VARCHAR(100) DEFAULT '',
 body_preview TEXT DEFAULT '',
 variables_json TEXT DEFAULT '[]',
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE whatsapp_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 recipient_phone VARCHAR(50) NOT NULL,
 customer_id INTEGER,
 template_id INTEGER,
 event_type VARCHAR(100) DEFAULT '',
 reference_type VARCHAR(50) DEFAULT '',
 reference_id VARCHAR(100) DEFAULT '',
 provider VARCHAR(50) DEFAULT 'META',
 provider_message_id VARCHAR(255) DEFAULT '',
 status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
 error_message TEXT DEFAULT '',
 request_payload TEXT DEFAULT '',
 response_payload TEXT DEFAULT '',
 sent_at TIMESTAMP,
 delivered_at TIMESTAMP,
 read_at TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE SET NULL,
 FOREIGN KEY (template_id) REFERENCES whatsapp_template(id) ON DELETE SET NULL
);
CREATE TABLE data_deletion_request (
 id VARCHAR(36) PRIMARY KEY,
 customer_id INTEGER,
 requester_name VARCHAR(255) DEFAULT '',
 requester_phone VARCHAR(50) DEFAULT '',
 requester_email VARCHAR(255) DEFAULT '',
 reason VARCHAR(250) NOT NULL,
 notes TEXT DEFAULT '',
 status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved & Deleted','Rejected')),
 requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 processed_at TIMESTAMP,
 processed_by_user_id INTEGER,
 admin_notes TEXT DEFAULT '',
 FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE SET NULL,
 FOREIGN KEY (processed_by_user_id) REFERENCES user(id) ON DELETE SET NULL
);
CREATE TABLE partner (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name VARCHAR(255) NOT NULL,
 photo TEXT DEFAULT '',
 designation VARCHAR(255) NOT NULL,
 about TEXT NOT NULL,
 sort_order INTEGER NOT NULL DEFAULT 0,
 is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE review (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 author_name VARCHAR(150) NOT NULL,
 rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
 comment_en TEXT NOT NULL,
 comment_hi TEXT DEFAULT '',
 avatar_bg VARCHAR(100) DEFAULT '',
 owner_response TEXT DEFAULT '',
 is_approved INTEGER NOT NULL DEFAULT 1 CHECK (is_approved IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE app_settings (
 key_name VARCHAR(150) PRIMARY KEY,
 value_text TEXT DEFAULT '',
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE marg_settings (
 id INTEGER PRIMARY KEY DEFAULT 1,
 api_token VARCHAR(500) DEFAULT '',
 points_ratio REAL NOT NULL DEFAULT 10,
 auto_notify_whatsapp INTEGER NOT NULL DEFAULT 1 CHECK (auto_notify_whatsapp IN (0,1)),
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE marg_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 type VARCHAR(50) NOT NULL,
 message TEXT NOT NULL,
 payload TEXT DEFAULT ''
);
CREATE TABLE audit_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_type VARCHAR(30) NOT NULL,
 actor_id INTEGER,
 action VARCHAR(100) NOT NULL,
 entity_type VARCHAR(100) NOT NULL,
 entity_id VARCHAR(100) DEFAULT '',
 old_values TEXT DEFAULT '',
 new_values TEXT DEFAULT '',
 ip_address VARCHAR(100) DEFAULT '',
 user_agent TEXT DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_role ON user(role_id);
CREATE INDEX idx_user_session_user ON user_session(user_id);
CREATE INDEX idx_customer_status ON customer(status);
CREATE INDEX idx_customer_session_customer ON customer_session(customer_id);
CREATE INDEX idx_product_category ON product(category_id);
CREATE INDEX idx_product_brand ON product(brand_id);
CREATE INDEX idx_stock_movement_product ON stock_movement(product_id, created_at);
CREATE INDEX idx_cart_item_cart ON cart_item(cart_id);
CREATE INDEX idx_coupon_usage_customer ON coupon_usage(customer_id);
CREATE INDEX idx_membership_customer ON customer_membership(customer_id, status);
CREATE INDEX idx_order_customer ON "order"(customer_id);
CREATE INDEX idx_order_status ON "order"(status);
CREATE INDEX idx_order_date ON "order"(order_date);
CREATE INDEX idx_order_item_order ON order_item(order_id);
CREATE INDEX idx_payment_order ON payment_transaction(order_id);
CREATE INDEX idx_payment_status ON payment_transaction(status);
CREATE INDEX idx_delivery_assignment_staff ON delivery_assignment(delivery_staff_id);
CREATE INDEX idx_delivery_assignment_status ON delivery_assignment(status);
CREATE INDEX idx_points_customer ON customer_points(customer_id, created_at);
CREATE INDEX idx_notification_recipient ON notification(recipient_type, recipient_id, is_read);
CREATE INDEX idx_whatsapp_log_customer ON whatsapp_log(customer_id);
CREATE INDEX idx_whatsapp_log_reference ON whatsapp_log(reference_type, reference_id);
CREATE INDEX idx_data_deletion_customer ON data_deletion_request(customer_id, requested_at);
CREATE INDEX idx_data_deletion_status ON data_deletion_request(status, requested_at);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_type, actor_id);
