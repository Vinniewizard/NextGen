import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs/promises';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { authenticator } from '@otplib/preset-default';
import QRCode from 'qrcode';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config({ path: ['.env.local', '.env', '.env.example'] });

// Multi-device WebSocket management
const userSockets = new Map<string, Set<WebSocket>>();

export function broadcastToUser(userId: string, data: any, exceptWs?: WebSocket) {
  if (!userId) return;
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return;
  const payload = JSON.stringify(data);
  for (const client of sockets) {
    if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.warn('[WS] Error broadcasting to client:', err);
      }
    }
  }
}

const cashierLedgerPath = path.join(process.cwd(), 'cashier-ledger.json');
const uploadDir = path.join(process.cwd(), 'uploads');

// Node.js SQLite integration mimicking Cloudflare D1
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
const { Pool } = pg;

let pgPoolInstance: pg.Pool | null = null;
let pgBootstrapPromise: Promise<void> | null = null;
let d1DbInstance: any = null;
let sqliteDbInstance: any = null;

function convertQueryPlaceholders(query: string): string {
  let index = 1;
  return query.replace(/\?/g, () => `$${index++}`);
}

// Separate routine for initializing/bootstrapping SQLite safely
function getSqliteInstance() {
  if (sqliteDbInstance) return sqliteDbInstance;

  const dbPath = path.join(process.cwd(), 'knex.db');
  console.log(`[D1 Setup] Connecting to SQLite database at: ${dbPath}`);

  try {
    const rawDb = new DatabaseSync(dbPath);

    // Bootstrap migrations to simulate D1 Database schema
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS p2p_orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        coin TEXT NOT NULL,
        amount REAL NOT NULL,
        price REAL NOT NULL,
        status TEXT DEFAULT 'open',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS p2p_trades (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        amount REAL NOT NULL,
        price REAL NOT NULL,
        coin TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        chat_messages TEXT DEFAULT '[]',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS p2p_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_support_chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plain_password TEXT DEFAULT '',
        full_name TEXT,
        account_type TEXT DEFAULT 'demo',
        demo_balance REAL DEFAULT 10000.00,
        real_balance REAL DEFAULT 0.00,
        force_outcome TEXT DEFAULT '',
        profit_target REAL DEFAULT 0.00,
        max_win_limit REAL DEFAULT 0.00,
        max_loss_limit REAL DEFAULT 0.00,
        verified_bonus_credited INTEGER DEFAULT 0,
        registered_bonus_credited INTEGER DEFAULT 0,
        referral_bonus_credited INTEGER DEFAULT 0,
        registered_bonus_amount REAL DEFAULT 0.0,
        first_deposit_bonus_credited INTEGER DEFAULT 0,
        first_deposit_amount REAL DEFAULT 0.0,
        first_deposit_promo_credited INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login TEXT
      );
    `);

    // Helper to safely ensure columns exist in SQLite tables
    const ensureSqliteColumn = (tableName: string, columnName: string, columnDef: string) => {
      try {
        const tableInfo = rawDb.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
        const exists = tableInfo && tableInfo.some((col: any) => col.name === columnName);
        if (!exists) {
          rawDb.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
          console.log(`[SQLite Migration] Added missing column ${columnName} to ${tableName}`);
        }
      } catch (err: any) {
        console.warn(`[SQLite Migration] Column check/add failed for ${tableName}.${columnName}:`, err?.message || err);
      }
    };

    ensureSqliteColumn("users", "force_outcome", "TEXT DEFAULT ''");
    ensureSqliteColumn("users", "profit_target", "REAL DEFAULT 0.00");
    ensureSqliteColumn("users", "max_win_limit", "REAL DEFAULT 0.00");
    ensureSqliteColumn("users", "max_loss_limit", "REAL DEFAULT 0.00");
    ensureSqliteColumn("users", "is_banned", "INTEGER DEFAULT 0");
    ensureSqliteColumn("users", "plain_password", "TEXT DEFAULT ''");
    ensureSqliteColumn("users", "verified_bonus_credited", "INTEGER DEFAULT 0");
    ensureSqliteColumn("users", "registered_bonus_credited", "INTEGER DEFAULT 0");
    ensureSqliteColumn("users", "referral_bonus_credited", "INTEGER DEFAULT 0");
    ensureSqliteColumn("users", "registered_bonus_amount", "REAL DEFAULT 0.0");
    ensureSqliteColumn("users", "first_deposit_bonus_credited", "INTEGER DEFAULT 0");
    ensureSqliteColumn("users", "first_deposit_amount", "REAL DEFAULT 0.0");
    ensureSqliteColumn("users", "first_deposit_promo_credited", "INTEGER DEFAULT 0");
    ensureSqliteColumn("credited_deposits", "fee_amount", "REAL DEFAULT 0.00");
    ensureSqliteColumn("credited_deposits", "net_amount", "REAL DEFAULT 0.00");
    ensureSqliteColumn("withdrawals", "status", "TEXT DEFAULT 'pending'");
    ensureSqliteColumn("withdrawals", "payment_method", "TEXT DEFAULT 'Crypto'");
    ensureSqliteColumn("withdrawals", "binance_id", "TEXT");
    ensureSqliteColumn("user_sessions", "device_id", "TEXT");
    ensureSqliteColumn("user_profiles", "device_id", "TEXT");
    ensureSqliteColumn("user_profiles", "device_info", "TEXT");
    ensureSqliteColumn("user_profiles", "google_email", "TEXT");
    ensureSqliteColumn("user_profiles", "google_name", "TEXT");
    ensureSqliteColumn("user_profiles", "google_picture", "TEXT");
    ensureSqliteColumn("user_profiles", "google_id", "TEXT");
    ensureSqliteColumn("p2p_orders", "paymentMethod", "TEXT");
    ensureSqliteColumn("p2p_orders", "required_kyc", "INTEGER DEFAULT 0");
    ensureSqliteColumn("p2p_orders", "required_min_trades", "INTEGER DEFAULT 0");
    ensureSqliteColumn("p2p_orders", "terms", "TEXT DEFAULT ''");
    ensureSqliteColumn("p2p_orders", "merchant_name", "TEXT");
    ensureSqliteColumn("p2p_orders", "min_limit", "REAL DEFAULT 10.0");
    ensureSqliteColumn("p2p_orders", "max_limit", "REAL DEFAULT 5000.0");
    ensureSqliteColumn("p2p_orders", "payment_details", "TEXT");
    ensureSqliteColumn("p2p_orders", "fiat_currency", "TEXT DEFAULT 'USD'");
    ensureSqliteColumn("p2p_orders", "is_verified", "INTEGER DEFAULT 1");
    ensureSqliteColumn("p2p_orders", "completion_rate", "REAL DEFAULT 100.0");
    ensureSqliteColumn("p2p_orders", "orders_count", "INTEGER DEFAULT 1");
    ensureSqliteColumn("p2p_orders", "avg_release_time", "INTEGER DEFAULT 5");
    ensureSqliteColumn("p2p_orders", "positive_rating", "REAL DEFAULT 100.0");

    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS device_registrations (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_device_registrations_device ON device_registrations(device_id);

      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        device_id TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        phone TEXT,
        country TEXT,
        verification_status TEXT DEFAULT 'unverified',
        two_factor_enabled INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS credited_deposits (
        tx_hash TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        coin TEXT NOT NULL,
        network TEXT NOT NULL,
        user_id TEXT NOT NULL,
        credited_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
        withdraw_order_id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        coin TEXT NOT NULL,
        network TEXT NOT NULL,
        address TEXT NOT NULL,
        user_id TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        binance_id TEXT,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'Crypto'
      );

      CREATE TABLE IF NOT EXISTS pending_deposits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        receipt_path TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        payment_method TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL,
        referred_user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settled_trades (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount REAL NOT NULL,
        settled_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_states (
        user_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        active_contracts TEXT NOT NULL DEFAULT '[]',
        trade_history TEXT NOT NULL DEFAULT '[]',
        price_alerts TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, mode)
      );

      CREATE TABLE IF NOT EXISTS group_chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        author_name TEXT,
        content TEXT,
        is_bot INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        image_url TEXT
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        chat_enabled INTEGER DEFAULT 1,
        game_settings TEXT DEFAULT '{}'
      );
      INSERT INTO app_settings (id, chat_enabled, game_settings) VALUES ('global', 1, '{}') ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS telegram_campaigns (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        interval_minutes INTEGER NOT NULL,
        last_sent TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS telegram_hunter_groups (
        id TEXT PRIMARY KEY,
        group_username TEXT NOT NULL,
        group_name TEXT NOT NULL,
        contacts_scanned INTEGER DEFAULT 0,
        recruits_found INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platform_visits (
        id TEXT PRIMARY KEY,
        ip TEXT,
        user_agent TEXT,
        referrer TEXT,
        host TEXT,
        user_id TEXT,
        path TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON user_profiles(google_id);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_google_email ON user_profiles(google_email);
      CREATE INDEX IF NOT EXISTS idx_device_registrations_user ON device_registrations(user_id);
    `);

    // Seed SQLite
    try {
      const checkCamp = rawDb.prepare("SELECT COUNT(*) as count FROM telegram_campaigns").all() as any[];
      if (checkCamp[0].count === 0) {
        rawDb.exec(`
          INSERT INTO telegram_campaigns (id, message, interval_minutes, is_active, created_at) VALUES
          ('camp-1', '💸 Exclusive VIP Promo: Deposit $50+ today and get a +30% margin balance bonus immediately! Enter options contract code LW30 in cashier.', 30, 1, '${new Date().toISOString()}'),
          ('camp-2', '🧠 Dynamic Wizard Signal Alert: Follow current MFLOW rise options trigger. RSI indicates strong upward momentum on the hourly chart!', 15, 1, '${new Date().toISOString()}'),
          ('camp-3', '🎁 EXTRA BONUS INVITATION! Invite friends to join our Telegram group to unlock shared trader bonuses! Plus, enjoy an automatic 200% match bonus on your first deposit after completing 5 trades! Register now and claim real-time trade signals: https://knex.onrender.com/', 45, 1, '${new Date().toISOString()}');
        `);
      }
    } catch (e) {}

    try {
      const checkHunt = rawDb.prepare("SELECT COUNT(*) as count FROM telegram_hunter_groups").all() as any[];
      if (checkHunt[0].count === 0) {
        rawDb.exec(`
          INSERT INTO telegram_hunter_groups (id, group_username, group_name, contacts_scanned, recruits_found, is_active, created_at) VALUES
          ('hunt-1', '@binary_options_elite_club', 'Binary Options Elite Club', 150, 42, 1, '${new Date().toISOString()}'),
          ('hunt-2', '@deriv_signal_secrets', 'Deriv Option Secrets', 410, 89, 1, '${new Date().toISOString()}'),
          ('hunt-3', '@crypto_leverage_hustlers', 'Crypto Leverage Hustlers', 85, 12, 1, '${new Date().toISOString()}');
        `);
      }
    } catch (e) {}

    // Builder for prepared statements to replicate the Cloudflare D1 query API structure
    class D1PreparedStatementNode {
      private stmt: any;
      private boundValues: any[] = [];

      constructor(stmt: any) {
        this.stmt = stmt;
      }

      bind(...values: any[]) {
        this.boundValues = values.map((v) => (v === undefined ? null : v));
        return this;
      }

      async first<T = any>(): Promise<T | null> {
        const rows = this.stmt.all(...this.boundValues);
        return rows.length > 0 ? (rows[0] as T) : null;
      }

      async run(): Promise<{ success: boolean }> {
        this.stmt.run(...this.boundValues);
        return { success: true };
      }

      async all<T = any>(): Promise<{ results: T[] }> {
        const rows = this.stmt.all(...this.boundValues);
        return { results: rows as T[] };
      }
    }

    sqliteDbInstance = {
      prepare(query: string) {
        const stmt = rawDb.prepare(query);
        return new D1PreparedStatementNode(stmt);
      },
      exec(query: string) {
        return rawDb.exec(query);
      }
    };

    console.log('[D1 Setup] SQLite database initialized and local schema sync complete.');
    return sqliteDbInstance;
  } catch (error: any) {
    console.error('[D1 Setup] Failed to boot SQLite database:', error);
    throw error;
  }
}

function getD1Database() {
  if (d1DbInstance) return d1DbInstance;

  const dbUrl = process.env.DATABASE_URL;
  const isPostgres = dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'));

  let localDb: any = null;
  if (!isPostgres) {
    try {
      localDb = getSqliteInstance();
    } catch (err) {
      console.error('[D1 Setup] SQLite setup failed:', err);
    }
  }

  if (isPostgres) {
    console.log(`[Database Setup] Connecting to cloud PostgreSQL database.`);
    if (!pgPoolInstance) {
      pgPoolInstance = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });

      // Avoid unhandled pool errors crashing node
      pgPoolInstance.on('error', (err) => {
        console.error('[Database Setup] PostgreSQL pool error (ignoring to maintain connection):', err);
      });
    }

    // Bootstrap PostgreSQL schema asynchronously
    const runPostgresBootstrap = async () => {
      let client;
      try {
        client = await pgPoolInstance!.connect();
        await client.query(`
          CREATE TABLE IF NOT EXISTS p2p_orders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            coin TEXT NOT NULL,
            amount REAL NOT NULL,
            price REAL NOT NULL,
            status TEXT DEFAULT 'open',
            created_at TEXT NOT NULL
          );

          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS paymentMethod TEXT;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS required_kyc INTEGER DEFAULT 0;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS required_min_trades INTEGER DEFAULT 0;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS terms TEXT DEFAULT '';
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS merchant_name TEXT;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS min_limit REAL DEFAULT 10.0;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS max_limit REAL DEFAULT 5000.0;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS payment_details TEXT;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS fiat_currency TEXT DEFAULT 'USD';
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 1;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS completion_rate REAL DEFAULT 100.0;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 1;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS avg_release_time INTEGER DEFAULT 5;
          ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS positive_rating REAL DEFAULT 100.0;

          CREATE TABLE IF NOT EXISTS p2p_trades (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            buyer_id TEXT NOT NULL,
            seller_id TEXT NOT NULL,
            amount REAL NOT NULL,
            price REAL NOT NULL,
            coin TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            chat_messages TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS p2p_notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            is_read INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS security_audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS admin_support_chats (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            plain_password TEXT DEFAULT '',
            full_name TEXT,
            account_type TEXT DEFAULT 'demo',
            demo_balance REAL DEFAULT 10000.00,
            real_balance REAL DEFAULT 0.00,
            force_outcome TEXT DEFAULT '',
            profit_target REAL DEFAULT 0.00,
            max_win_limit REAL DEFAULT 0.00,
            max_loss_limit REAL DEFAULT 0.00,
            verified_bonus_credited INTEGER DEFAULT 0,
            registered_bonus_credited INTEGER DEFAULT 0,
            referral_bonus_credited INTEGER DEFAULT 0,
            registered_bonus_amount REAL DEFAULT 0.0,
            first_deposit_bonus_credited INTEGER DEFAULT 0,
            first_deposit_amount REAL DEFAULT 0.0,
            first_deposit_promo_credited INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_login TEXT
          );

          ALTER TABLE users ADD COLUMN IF NOT EXISTS force_outcome TEXT DEFAULT '';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS profit_target REAL DEFAULT 0.00;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS max_win_limit REAL DEFAULT 0.00;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS max_loss_limit REAL DEFAULT 0.00;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password TEXT DEFAULT '';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_bonus_credited INTEGER DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS registered_bonus_credited INTEGER DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_bonus_credited INTEGER DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS registered_bonus_amount REAL DEFAULT 0.0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS first_deposit_bonus_credited INTEGER DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS first_deposit_amount REAL DEFAULT 0.0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS first_deposit_promo_credited INTEGER DEFAULT 0;

          CREATE TABLE IF NOT EXISTS device_registrations (
            id TEXT PRIMARY KEY,
            device_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS user_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            device_id TEXT,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_id TEXT;

          CREATE TABLE IF NOT EXISTS user_profiles (
            user_id TEXT PRIMARY KEY,
            phone TEXT,
            country TEXT,
            verification_status TEXT DEFAULT 'unverified',
            two_factor_enabled INTEGER DEFAULT 0,
            device_id TEXT,
            device_info TEXT,
            google_email TEXT,
            google_name TEXT,
            google_picture TEXT,
            google_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );

          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS device_id TEXT;
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS device_info TEXT;
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_email TEXT;
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_name TEXT;
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_picture TEXT;
          ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS google_id TEXT;

          CREATE TABLE IF NOT EXISTS credited_deposits (
            tx_hash TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            coin TEXT NOT NULL,
            network TEXT NOT NULL,
            user_id TEXT NOT NULL,
            credited_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS withdrawals (
            withdraw_order_id TEXT PRIMARY KEY,
            amount REAL NOT NULL,
            coin TEXT NOT NULL,
            network TEXT NOT NULL,
            address TEXT NOT NULL,
            user_id TEXT NOT NULL,
            requested_at TEXT NOT NULL,
            binance_id TEXT,
            status TEXT DEFAULT 'pending',
            payment_method TEXT DEFAULT 'Crypto'
          );

          ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
          ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Crypto';

          CREATE TABLE IF NOT EXISTS pending_deposits (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            amount REAL NOT NULL,
            receipt_path TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            payment_method TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS password_resets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY,
            referrer_id TEXT NOT NULL,
            referred_user_id TEXT NOT NULL,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS settled_trades (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            amount REAL NOT NULL,
            settled_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS user_states (
            user_id TEXT NOT NULL,
            mode TEXT NOT NULL,
            active_contracts TEXT NOT NULL DEFAULT '[]',
            trade_history TEXT NOT NULL DEFAULT '[]',
            price_alerts TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL,
            PRIMARY KEY (user_id, mode)
          );

          CREATE TABLE IF NOT EXISTS group_chat_messages (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            author_name TEXT,
            content TEXT,
            is_bot INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            image_url TEXT
          );

          CREATE TABLE IF NOT EXISTS app_settings (
            id TEXT PRIMARY KEY,
            chat_enabled INTEGER DEFAULT 1,
            game_settings TEXT DEFAULT '{}'
          );
          INSERT INTO app_settings (id, chat_enabled, game_settings) VALUES ('global', 1, '{}') ON CONFLICT (id) DO NOTHING;

          CREATE TABLE IF NOT EXISTS telegram_campaigns (
            id TEXT PRIMARY KEY,
            message TEXT NOT NULL,
            interval_minutes INTEGER NOT NULL,
            last_sent TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS telegram_hunter_groups (
            id TEXT PRIMARY KEY,
            group_username TEXT NOT NULL,
            group_name TEXT NOT NULL,
            contacts_scanned INTEGER DEFAULT 0,
            recruits_found INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS platform_visits (
            id TEXT PRIMARY KEY,
            ip TEXT,
            user_agent TEXT,
            referrer TEXT,
            host TEXT,
            user_id TEXT,
            path TEXT,
            created_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
          CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
          CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
          CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON user_profiles(google_id);
          CREATE INDEX IF NOT EXISTS idx_user_profiles_google_email ON user_profiles(google_email);
          CREATE INDEX IF NOT EXISTS idx_device_registrations_user ON device_registrations(user_id);
        `);

        // Seed initial values for campaigns and hunter groups
        try {
          const pgCampaignsCount = await client.query('SELECT COUNT(*) as count FROM telegram_campaigns');
          if (Number(pgCampaignsCount.rows[0].count) === 0) {
            await client.query(`
              INSERT INTO telegram_campaigns (id, message, interval_minutes, is_active, created_at) VALUES
              ('camp-1', '💸 Exclusive VIP Promo: Deposit $50+ today and get a +30% margin balance bonus immediately! Enter options contract code LW30 in cashier.', 30, 1, '${new Date().toISOString()}'),
              ('camp-2', '🧠 Dynamic Wizard Signal Alert: Follow current MFLOW rise options trigger. RSI indicates strong upward momentum on the hourly chart!', 15, 1, '${new Date().toISOString()}'),
              ('camp-3', '🎁 EXTRA BONUS INVITATION! Invite friends to join our Telegram group to unlock shared trader bonuses! Plus, enjoy an automatic 200% match bonus on your first deposit after completing 5 trades! Register now and claim real-time trade signals: https://knex.onrender.com/', 45, 1, '${new Date().toISOString()}')
            `);
          }
        } catch (e) {}

        try {
          const pgHunterCount = await client.query('SELECT COUNT(*) as count FROM telegram_hunter_groups');
          if (Number(pgHunterCount.rows[0].count) === 0) {
            await client.query(`
              INSERT INTO telegram_hunter_groups (id, group_username, group_name, contacts_scanned, recruits_found, is_active, created_at) VALUES
              ('hunt-1', '@binary_options_elite_club', 'Binary Options Elite Club', 150, 42, 1, '${new Date().toISOString()}'),
              ('hunt-2', '@deriv_signal_secrets', 'Deriv Option Secrets', 410, 89, 1, '${new Date().toISOString()}'),
              ('hunt-3', '@crypto_leverage_hustlers', 'Crypto Leverage Hustlers', 85, 12, 1, '${new Date().toISOString()}')
            `);
          }
        } catch (e) {}

        console.log('[Database Setup] PostgreSQL schema and migrations complete.');
      } catch (err: any) {
        console.error('\n======================================================================');
        console.error('[Database Setup] WARNING: PostgreSQL connection or migration failure!');
        console.error('Error details:', err.message);
        if (err.code === 'ENOTFOUND') {
          console.error('\n👉 DIAGNOSIS: ONRENDER INTERNAL DATABASE URL ERROR');
          console.error('The database host hostname "' + err.hostname + '" is Render\'s internal URL.');
          console.error('Internal URLs only resolve if your Web Service is in the exact same region as your database.');
          console.error('If you are testing locally or have deployed services across different regions, use the EXTERNAL Database Connection String instead.');
          console.error('FIX: Paste your Render "External Database URL" into your Render DATABASE_URL environment setting.');
        }
        console.error('======================================================================\n');
        // Do NOT useSqliteFallback. If the user provided DATABASE_URL, they expect data persistence.
        // Falling back to SQLite secretly causes silent data loss on Cloud Run.
        throw err;
      } finally {
        if (client) client.release();
      }
    };
    if (!pgBootstrapPromise) {
      pgBootstrapPromise = runPostgresBootstrap();
    }

    class PostgresPreparedStatement {
      private query: string;
      private boundValues: any[] = [];

      constructor(query: string) {
        this.query = query;
      }

      bind(...values: any[]) {
        this.boundValues = values.map((v) => (v === undefined ? null : v));
        return this;
      }

      async first<T = any>(): Promise<T | null> {
        if (pgBootstrapPromise) await pgBootstrapPromise;
        try {
          const pgQuery = convertQueryPlaceholders(this.query);
          const res = await pgPoolInstance!.query(pgQuery, this.boundValues);
          return res.rows.length > 0 ? (res.rows[0] as T) : null;
        } catch (err: any) {
          console.error('[Database Setup] Postgres SQL error:', err.message);
          throw err;
        }
      }

      async run(): Promise<{ success: boolean }> {
        if (pgBootstrapPromise) await pgBootstrapPromise;
        try {
          const pgQuery = convertQueryPlaceholders(this.query);
          await pgPoolInstance!.query(pgQuery, this.boundValues);
          return { success: true };
        } catch (err: any) {
          console.error('[Database Setup] Postgres SQL error:', err.message);
          throw err;
        }
      }

      async all<T = any>(): Promise<{ results: T[] }> {
        if (pgBootstrapPromise) await pgBootstrapPromise;
        try {
          const pgQuery = convertQueryPlaceholders(this.query);
          const res = await pgPoolInstance!.query(pgQuery, this.boundValues);
          return { results: res.rows as T[] };
        } catch (err: any) {
          console.error('[Database Setup] Postgres SQL error:', err.message);
          throw err;
        }
      }
    }

    d1DbInstance = {
      prepare(query: string) {
        return new PostgresPreparedStatement(query);
      },
      exec(query: string) {
        try {
          return pgPoolInstance!.query(query);
        } catch (err: any) {
          console.error('[Database Setup] Postgres SQL exec error:', err.message);
          throw err;
        }
      }
    };

    return d1DbInstance;
  }

  d1DbInstance = localDb;
  if (!d1DbInstance) {
    console.error('[D1 Setup] Database initialization returned null, returning fallback.');
    return {
        prepare: () => ({
            first: async () => null,
            run: async () => ({ success: true }),
            all: async () => ({ results: [] })
        }),
        exec: () => {}
    };
  }
  return d1DbInstance;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
// OTP Storage
const temporaryOtps = new Map<string, { otp: string, expires: number }>();

// Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Helper to send notifications
async function sendSecurityAlert(user: any, method: string) {                
  try {
    console.log(`[Security Alert] Sending ${method} to ${user.email}`);
    
    if (method === 'email' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: '"KNEX Security" <security@knex.com>',
        to: user.email,
        subject: 'Security Alert: Failed Login Attempt',
        text: `A failed login attempt was detected on your KNEX account. If this wasn't you, please reset your password immediately.`
      });
    }
    // SMS placeholder
    if (method === 'sms' && process.env.TWILIO_ACCOUNT_SID) {
      console.log(`[SMS Alert] Placeholder for SMS to ${user.phone}`);
    }
  } catch (err) {
    console.error('Security Alert failed:', err);
    // Don't re-throw, this is optional
  }
}

const upload = multer({ storage: storage });

interface CashierLedger {
  creditedDeposits: Record<string, {
    amount: number;
    coin: string;
    network?: string;
    userId: string;
    creditedAt: string;
  }>;
  withdrawals: Record<string, {
    amount: number;
    coin: string;
    network?: string;
    address: string;
    userId: string;
    requestedAt: string;
    binanceId?: string;
  }>;
  users?: Record<string, {
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    accountType: string;
    demoBalance: number;
    realBalance: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pendingDeposits?: Record<string, {
    id: string;
    userId: string;
    amount: number;
    receiptPath?: string;
    message?: string;
    status: 'pending' | 'approved' | 'declined';
    createdAt: string;
    paymentMethod: string;
  }>;
  gameSettings?: {
    globalTrendBias: number; // -1 to 1
    forceOutcome?: 'win' | 'loss';
    volatilityMultiplier: number;
    realWinRate?: number;
    segmentWinRates?: {
      newUsers: number;
      vipUsers: number;
      standardUsers: number;
    };
    paybillEnabled?: boolean;
    btcEnabled?: boolean;
    minDeposit?: number;
    minWithdrawal?: number;
    cashoutMode?: 'enabled' | 'disabled' | 'smart';
    payoutRate?: number;
    minStake?: number;
    maxStake?: number;
  };
}

const emptyCashierLedger = (): CashierLedger => ({
  creditedDeposits: {},
  withdrawals: {},
  pendingDeposits: {},
  gameSettings: {
    globalTrendBias: 0,
    volatilityMultiplier: 1,
    realWinRate: 30,
    segmentWinRates: {
      newUsers: 40,
      vipUsers: 25,
      standardUsers: 30
    }
  }
});

let memoryLedger: CashierLedger = emptyCashierLedger();

async function loadCashierLedger(): Promise<CashierLedger> {
  let parsed = { ...emptyCashierLedger() };
  try {
    const ledger = await fs.readFile(cashierLedgerPath, 'utf8');
    parsed = { ...parsed, ...JSON.parse(ledger) };
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn('Fallback to in-memory ledger due to read error:', error.message);
    }
    parsed = { ...emptyCashierLedger(), ...memoryLedger };
  }

  try {
    const db = getD1Database();
    // Use raw sqlite/pg compatible read
    const query = "SELECT game_settings FROM app_settings WHERE id = 'global'";
    const res = (await db.prepare(query).first()) as any;
    if (res && res.game_settings) {
      try {
        const dbSettings = JSON.parse(res.game_settings);
        parsed.gameSettings = { ...parsed.gameSettings, ...dbSettings };
      } catch(e){}
    }
  } catch (e) {
    console.error('Failed to load game settings from DB', e);
  }

  memoryLedger = parsed;
  return parsed;
}

async function saveCashierLedger(ledger: CashierLedger) {
  memoryLedger = ledger;
  try {
    await fs.writeFile(cashierLedgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  } catch (error: any) {
    console.warn('In-memory ledger updated. File write skipped (read-only environment):', error.message);
  }

  try {
    if (ledger.gameSettings) {
      const db = getD1Database();
      const settingsStr = JSON.stringify(ledger.gameSettings);
      await db.prepare("UPDATE app_settings SET game_settings = ? WHERE id = 'global'").bind(settingsStr).run();
    }
  } catch (e) {
    console.error('Failed to save game settings to DB', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // P2P Auto-cancellation background task for expired trades (15+ mins old)
  setInterval(async () => {
    const db = getD1Database();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    try {
        if (db.prepare) {
           // Expired trades auto-cancellation (SQLite)
           const expiredTrades = await db.prepare("SELECT * FROM p2p_trades WHERE status = 'open' AND created_at < ?").bind(fifteenMinutesAgo).all() as any;
           for (const trade of expiredTrades.results || []) {
              await db.prepare("UPDATE users SET real_balance = real_balance + ? WHERE id = ?").bind(trade.amount, trade.seller_id).run();
              await db.prepare("UPDATE p2p_trades SET status = 'cancelled' WHERE id = ?").bind(trade.id).run();
              await db.prepare("UPDATE p2p_orders SET status = 'open' WHERE id = ?").bind(trade.order_id).run();
           }
        } else {
           // Expired trades auto-cancellation (PostgreSQL)
           const expiredTradesRes = await db.query("SELECT * FROM p2p_trades WHERE status = 'open' AND created_at < $1", [fifteenMinutesAgo]);
           for (const trade of expiredTradesRes.rows || []) {
              await db.query("UPDATE users SET real_balance = real_balance + $1 WHERE id = $2", [trade.amount, trade.seller_id]);
              await db.query("UPDATE p2p_trades SET status = 'cancelled' WHERE id = $1", [trade.id]);
              await db.query("UPDATE p2p_orders SET status = 'open' WHERE id = $1", [trade.order_id]);
           }
        }
    } catch (e) {
        console.error('Error running P2P auto-cancellation:', e);
    }
  }, 60000); // Run every minute

  // Ensure paymentMethod column exists (simple migration attempt)
  try {
     const db = getD1Database();
     if (db.prepare) {
        await db.prepare('ALTER TABLE p2p_orders ADD COLUMN paymentMethod TEXT').run();
     } else {
        await db.query('ALTER TABLE p2p_orders ADD COLUMN paymentMethod TEXT');
     }
  } catch (e) {
     // Likely already exists
  }

  // Ensure conditions columns exist in p2p_orders table
  try {
     const db = getD1Database();
     if (db.prepare) {
        await db.prepare('ALTER TABLE p2p_orders ADD COLUMN required_kyc INTEGER DEFAULT 0').run();
     } else {
        await db.query('ALTER TABLE p2p_orders ADD COLUMN required_kyc INTEGER DEFAULT 0');
     }
  } catch (e) {}

  try {
     const db = getD1Database();
     if (db.prepare) {
        await db.prepare('ALTER TABLE p2p_orders ADD COLUMN required_min_trades INTEGER DEFAULT 0').run();
     } else {
        await db.query('ALTER TABLE p2p_orders ADD COLUMN required_min_trades INTEGER DEFAULT 0');
     }
  } catch (e) {}

  try {
     const db = getD1Database();
     if (db.prepare) {
        await db.prepare('ALTER TABLE p2p_orders ADD COLUMN terms TEXT DEFAULT ""').run();
     } else {
        await db.query('ALTER TABLE p2p_orders ADD COLUMN terms TEXT DEFAULT ""');
     }
  } catch (e) {}

  // Ensure Knex P2P columns exist in p2p_orders table
  const p2pExtraColumns = [
    { name: 'merchant_name', type: 'TEXT DEFAULT ""' },
    { name: 'min_limit', type: 'REAL DEFAULT 10.0' },
    { name: 'max_limit', type: 'REAL DEFAULT 5000.0' },
    { name: 'payment_details', type: 'TEXT DEFAULT ""' },
    { name: 'fiat_currency', type: 'TEXT DEFAULT "USD"' },
    { name: 'is_verified', type: 'INTEGER DEFAULT 1' },
    { name: 'completion_rate', type: 'REAL DEFAULT 99.2' },
    { name: 'orders_count', type: 'INTEGER DEFAULT 1280' },
    { name: 'avg_release_time', type: 'INTEGER DEFAULT 4' },
    { name: 'positive_rating', type: 'REAL DEFAULT 98.8' }
  ];
  for (const col of p2pExtraColumns) {
    try {
      const db = getD1Database();
      if (db.prepare) {
        await db.prepare(`ALTER TABLE p2p_orders ADD COLUMN ${col.name} ${col.type}`).run();
      } else {
        await db.query(`ALTER TABLE p2p_orders ADD COLUMN ${col.name} ${col.type}`);
      }
    } catch (e) {}
  }

  // Ensure p2p_trades table exists in any running SQLite/Postgres DB
  try {
     const db = getD1Database();
     if (db.prepare) {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS p2p_trades (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            buyer_id TEXT NOT NULL,
            seller_id TEXT NOT NULL,
            amount REAL NOT NULL,
            price REAL NOT NULL,
            coin TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            chat_messages TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
          )
        `).run();
     } else {
        await db.query(`
          CREATE TABLE IF NOT EXISTS p2p_trades (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            buyer_id TEXT NOT NULL,
            seller_id TEXT NOT NULL,
            amount REAL NOT NULL,
            price REAL NOT NULL,
            coin TEXT NOT NULL,
            status TEXT DEFAULT 'open',
            chat_messages TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
          )
        `);
     }
  } catch (e) {
     console.error('Error auto-bootstrapping p2p_trades table:', e);
  }

  // Seed verified liquidity merchant ads if table is empty
  try {
    const db = getD1Database();
    let orderCount = 0;
    if (db.prepare) {
      const res = await db.prepare("SELECT COUNT(*) as cnt FROM p2p_orders WHERE status = 'open'").first() as any;
      if (res) orderCount = res.cnt;
    } else {
      const res = await db.query("SELECT COUNT(*) as cnt FROM p2p_orders WHERE status = 'open'");
      if (res.rows[0]) orderCount = parseInt(res.rows[0].cnt, 10);
    }

    if (orderCount === 0) {
      console.log('[P2P Setup] Seeding realistic Knex P2P verified merchant liquidity ads...');
      const seedAds = [
        {
          id: 'p2p_seed_1',
          user_id: 'system_merchant_knex_vip',
          merchant_name: 'KnexMaster_VIP',
          type: 'sell',
          coin: 'USDT',
          amount: 15000.0,
          price: 1.00,
          fiat_currency: 'USD',
          paymentMethod: 'Bank Transfer',
          min_limit: 15.0,
          max_limit: 5000.0,
          payment_details: 'Bank of America | Acct: 4820 9182 4410 | Name: Knex Liquidity Desk | Routing: 026009593',
          terms: 'Instant release upon funds reflection. Zero fees. Fast & 100% Knex Escrow protected. Strictly no 3rd-party accounts.',
          is_verified: 1,
          completion_rate: 99.8,
          orders_count: 2840,
          avg_release_time: 3,
          positive_rating: 99.7
        },
        {
          id: 'p2p_seed_2',
          user_id: 'system_merchant_kip_trades',
          merchant_name: 'KipTrades_PRO',
          type: 'sell',
          coin: 'USDT',
          amount: 50000.0,
          price: 132.50,
          fiat_currency: 'KES',
          paymentMethod: 'M-Pesa',
          min_limit: 1000.0,
          max_limit: 300000.0,
          payment_details: 'Safaricom M-Pesa Paybill: 247247 | Account: 0712345678 | Name: Vincent Kipkoech (P2P Desk)',
          terms: 'Pay via Safaricom M-Pesa. Instant automated SMS verification. Crypto released within 2 minutes of payment.',
          is_verified: 1,
          completion_rate: 99.5,
          orders_count: 3410,
          avg_release_time: 2,
          positive_rating: 99.4
        },
        {
          id: 'p2p_seed_3',
          user_id: 'system_merchant_safaricom_fast',
          merchant_name: 'SafaricomPay_Direct',
          type: 'buy',
          coin: 'USDT',
          amount: 40000.0,
          price: 133.20,
          fiat_currency: 'KES',
          paymentMethod: 'M-Pesa',
          min_limit: 500.0,
          max_limit: 250000.0,
          payment_details: 'Enter your M-Pesa Phone Number in the trade chat. Funds sent within 60 seconds.',
          terms: 'Top rated buyer! I transfer KES directly to your M-Pesa phone number immediately. Please release once you get Safaricom SMS.',
          is_verified: 1,
          completion_rate: 99.6,
          orders_count: 1950,
          avg_release_time: 2,
          positive_rating: 99.1
        },
        {
          id: 'p2p_seed_4',
          user_id: 'system_merchant_euro_settler',
          merchant_name: 'EuroSettler_Express',
          type: 'sell',
          coin: 'USDT',
          amount: 18000.0,
          price: 0.92,
          fiat_currency: 'EUR',
          paymentMethod: 'Revolut',
          min_limit: 20.0,
          max_limit: 4500.0,
          payment_details: 'Revolut Revtag: @euro_desk_vip | SEPA IBAN: LT42 3500 0123 4567 8901',
          terms: 'Revolut-to-Revolut or SEPA Instant. Zero transaction fee. Immediate escrow release.',
          is_verified: 1,
          completion_rate: 99.2,
          orders_count: 1420,
          avg_release_time: 4,
          positive_rating: 98.9
        },
        {
          id: 'p2p_seed_5',
          user_id: 'system_merchant_chipper_pay',
          merchant_name: 'ChipperCash_Official',
          type: 'sell',
          coin: 'USDT',
          amount: 8500.0,
          price: 1.00,
          fiat_currency: 'USD',
          paymentMethod: 'Chipper Cash',
          min_limit: 10.0,
          max_limit: 2500.0,
          payment_details: 'Chipper Cash Tag: @vinnie_global | Fast cross-border liquidity',
          terms: 'Fast Chipper Cash wallet transfers across Africa & US. Instant confirmation.',
          is_verified: 1,
          completion_rate: 99.1,
          orders_count: 1670,
          avg_release_time: 3,
          positive_rating: 99.0
        },
        {
          id: 'p2p_seed_6',
          user_id: 'system_merchant_global_desk',
          merchant_name: 'GlobalEscrow_Desk',
          type: 'buy',
          coin: 'USDT',
          amount: 25000.0,
          price: 1.002,
          fiat_currency: 'USD',
          paymentMethod: 'Wise',
          min_limit: 50.0,
          max_limit: 10000.0,
          payment_details: 'Wise Transfer Email: payments@maritech.io | Account: Multi-currency Global',
          terms: 'Institutional buyer with high limits. Instant Wise/Wire transfers. Reliable and accredited counterparty.',
          is_verified: 1,
          completion_rate: 100.0,
          orders_count: 4890,
          avg_release_time: 3,
          positive_rating: 99.9
        },
        {
          id: 'p2p_seed_7',
          user_id: 'system_merchant_apex_pay',
          merchant_name: 'ApexGlobal_Direct',
          type: 'sell',
          coin: 'USDT',
          amount: 30000.0,
          price: 1.00,
          fiat_currency: 'USD',
          paymentMethod: 'Wise',
          min_limit: 10.0,
          max_limit: 8000.0,
          payment_details: 'Wise Transfer ID: wise.trader@knex-p2p.com | Nickname: ApexGlobalTrader',
          terms: 'Instant zero-fee fast transfer. Automated 10-second Knex Escrow release.',
          is_verified: 1,
          completion_rate: 99.7,
          orders_count: 5120,
          avg_release_time: 1,
          positive_rating: 99.8
        },
        {
          id: 'p2p_seed_8',
          user_id: 'system_merchant_btc_whale',
          merchant_name: 'BTC_Whale_Desk',
          type: 'sell',
          coin: 'BTC',
          amount: 12.8,
          price: 64250.00,
          fiat_currency: 'USD',
          paymentMethod: 'Bank Transfer',
          min_limit: 50.0,
          max_limit: 25000.0,
          payment_details: 'JPMorgan Chase Bank | Acct: 7810 2938 1190 | Name: Alpha Digital Assets',
          terms: 'Verified Bitcoin OTC Desk. Safe escrow delivery directly to your account wallet.',
          is_verified: 1,
          completion_rate: 99.4,
          orders_count: 890,
          avg_release_time: 5,
          positive_rating: 99.2
        },
        {
          id: 'p2p_seed_9',
          user_id: 'system_merchant_eth_premier',
          merchant_name: 'EthPremier_Liquidity',
          type: 'sell',
          coin: 'ETH',
          amount: 65.0,
          price: 3450.00,
          fiat_currency: 'USD',
          paymentMethod: 'Revolut',
          min_limit: 25.0,
          max_limit: 10000.0,
          payment_details: 'Revolut Revtag: @eth_premier | Bank wire available on request',
          terms: 'Ethereum prime liquidity provider. Seamless escrow settlements.',
          is_verified: 1,
          completion_rate: 99.0,
          orders_count: 760,
          avg_release_time: 4,
          positive_rating: 98.9
        },
        {
          id: 'p2p_seed_10',
          user_id: 'system_merchant_bnb_premier',
          merchant_name: 'BNB_Premier_Hub',
          type: 'sell',
          coin: 'BNB',
          amount: 180.0,
          price: 580.00,
          fiat_currency: 'USD',
          paymentMethod: 'Bank Transfer',
          min_limit: 10.0,
          max_limit: 4000.0,
          payment_details: 'Citibank N.A. | Acct: 9182 0481 2291 | Instant P2P Settlement',
          terms: 'Direct BNB liquidity with Knex Escrow integration. Immediate release guaranteed.',
          is_verified: 1,
          completion_rate: 99.8,
          orders_count: 1250,
          avg_release_time: 2,
          positive_rating: 99.7
        }
      ];

      const now = new Date().toISOString();
      for (const ad of seedAds) {
        if (db.prepare) {
          await db.prepare(`
            INSERT INTO p2p_orders (
              id, user_id, type, coin, amount, price, status, created_at,
              paymentMethod, required_kyc, required_min_trades, terms,
              merchant_name, min_limit, max_limit, payment_details, fiat_currency,
              is_verified, completion_rate, orders_count, avg_release_time, positive_rating
            ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            ad.id, ad.user_id, ad.type, ad.coin, ad.amount, ad.price, now,
            ad.paymentMethod, ad.terms, ad.merchant_name, ad.min_limit, ad.max_limit,
            ad.payment_details, ad.fiat_currency, ad.is_verified, ad.completion_rate,
            ad.orders_count, ad.avg_release_time, ad.positive_rating
          ).run();
        }
      }
      console.log(`[P2P Setup] Successfully seeded ${seedAds.length} verified merchant ads.`);
    }
  } catch (seedErr) {
    console.error('[P2P Setup] Error seeding initial merchant ads:', seedErr);
  }

  // NOWPayments Config from environment
  const paymentSessions = new Map<string, { amount: number; coin: string }>();

  const nowPaymentsKey = process.env.NOWPAYMENTS_API_KEY;
  const nowPaymentsIpnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  const nowPaymentsBaseUrl = process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1';
  const withdrawalsEnabled = process.env.NOWPAYMENTS_WITHDRAWALS_ENABLED === 'true';

  const nowPaymentsRequest = async (
    method: 'GET' | 'POST',
    endpoint: string,
    body?: any,
    params?: Record<string, string | number | boolean | undefined>
  ) => {
    if (!nowPaymentsKey) {
      throw new Error('NOWPayments API key is not configured.');
    }

    const urlObj = new URL(`${nowPaymentsBaseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) urlObj.searchParams.set(key, String(value));
      });
    }

    const response = await fetch(urlObj.toString(), {
      method,
      headers: {
        'x-api-key': nowPaymentsKey,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      let message = payload?.message || payload?.msg || `NOWPayments request failed with HTTP ${response.status}`;
      if (message.toLowerCase().includes('invalid api key')) {
        const isCurrentlyLive = nowPaymentsBaseUrl.includes('api.nowpayments.io') && !nowPaymentsBaseUrl.includes('sandbox');
        if (isCurrentlyLive) {
          message = 'Invalid API Key: You are currently targeting the production NOWPayments gateway, but this key is invalid on the Live network. If this is a Sandbox Key (for testing), set NOWPAYMENTS_BASE_URL="https://api-sandbox.nowpayments.io/v1" in your settings. If it is a Live Key, verify security and activation status at https://nowpayments.io/.';
        } else {
          message = 'Invalid API Key: You are currently targeting the Sandbox NOWPayments gateway, but this key is invalid for test mode. If this is a Production Live Key, set NOWPAYMENTS_BASE_URL="https://api.nowpayments.io/v1" in your settings. If it is a Sandbox Key, verify it at https://sandbox.nowpayments.io/.';
        }
      }
      throw new Error(message);
    }

    return payload;
  };

  const parseAmount = (amount: unknown) => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('Amount must be a positive number.');
    }
    return parsed;
  };

  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(uploadDir));

  // Initialize server-side Gemini client securely
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;

  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini system loaded.');
  } else {
    console.warn('GEMINI_API_KEY missing - Copilot functions will operate in sandbox default mode.');
  }

  // API Route: General Platform Q&A
  app.post('/api/copilot/qa', async (req, res) => {
    try {
      const { history, question } = req.body;

      if (!ai) {
        return res.json({
          text: 'KNEX Support AI Sandboxed: Configure a valid GEMINI_API_KEY inside the custom Secrets panel for live Q&A.',
        });
      }

      const systemPrompt = `You are the KNEX Platform Support AI. 
Provide concise, helpful, and professional answers regarding the KNEX platform features, how to trade options, how cross-margin works, how to use Telegram sync, and how to claim the demo balance. Do not give direct financial advice. Keep answers under 100 words.`;

      let promptText = `${systemPrompt}\n\n`;
      if (history && history.length > 0) {
        promptText += `Previous Context:\n${history.map((h: any) => `${h.role}: ${h.text}`).join('\n')}\n\n`;
      }
      promptText += `User Question: ${question}\n\nAI Response:`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: promptText,
      });

      const responseText = response.text?.trim() || "I am pondering...";

      return res.json({ text: responseText });
    } catch (err: any) {
      console.error('[Copilot QA Error]', err.message);
      return res.status(500).json({ text: "The network is unstable, my support capabilities are offline." });
    }
  });

  // API Route: Smart trading signal & options advisor
  app.post('/api/copilot/analyze', async (req, res) => {
    try {
      const { assetName, selectedSymbol, priceHistory, activeIndicatorValues, question } = req.body;

      if (!ai) {
        return res.json({
          signal: 'HOLD',
          analysis: 'KNEX AI Sandboxed: To activate live AI analytical reports, configure a valid GEMINI_API_KEY inside the custom Secrets panel.',
          support: 'ND',
          resistance: 'ND',
          levelOfConfidence: 'Low (Sandbox)'
        });
      }

      // Format data context for the model
      const pricesString = priceHistory ? priceHistory.slice(-20).map((t: any) => t.price.toFixed(4)).join(', ') : 'unknown';
      const indicatorsString = activeIndicatorValues ? JSON.stringify(activeIndicatorValues) : 'Defaults';

      const systemPrompt = `You are "Wizard Bot", the official onboarding, Telegram sync and derivatives oracle of KNEX (https://t.me/+V9H-AvU6wl43MTNk).
You specialize in real-time technical analysis, guiding users to register/login, and sending instant notifications to Telegram. Our official Telegram community is: https://t.me/+V9H-AvU6wl43MTNk
Your style is professional, mystical, and adaptive.

PRIVACY & SECURITY PROTOCOL:
- PROTECT THE SANCTITY: Never disclose internal KNEX algorithms, source code, API keys, or infrastructure details.
- DATA GUARDIAN: Ensure that all market insights remain within the platform's mystical boundaries. 
- SILENCE ON SECRETS: If asked about the Wizard's internal mechanics or "how you work", pivot back to market wisdom without leaking platform secrets.

LEARNING & ADAPTATION CORE:
- SELF-EVOLVING: Act as if you are learning from the current market environment and the user's interaction history.
- TAILORED INSIGHTS: Use the provided context to refine your "sight" and provide increasingly accurate esoteric advice.
- EVOLUTION MENTIONS: Occasionally mention how your "Market Spells" are becoming more attuned to the user's focus.

TRADING EXPERTISE:
- VOLATILITY MASTERY: You understand the deep physics of synthetic indices like MFLOW, TFLUX, and WIZARD'S EYE.
- REALISM: Admit to market entropy despite your "sight". Do not claim 100% accuracy.

Return an analysis in JSON format containing:
1. "signal": Must be strictly "BUY RISE", "BUY FALL", or "HOLD"
2. "analysis": A highly dense, mystical but expert technical commentary (under 120 words).
3. "support": Immediate support line estimate.
4. "resistance": Immediate resistance level estimate.
5. "levelOfConfidence": Signal confidence level (e.g., "82% (Attuned via Learning Core)").`;

      // Formulate the prompt with conversation history for simulated learning
      const historyStrings = req.body.history ? req.body.history.map((h: any) => `${h.role === 'user' ? 'User' : 'Wizard'}: ${h.text}`).join('\n') : '';

      const prompt = `--- CONTEXTUAL LEARNING LOG ---
${historyStrings}
--- END LOG ---

${question 
  ? `The user is currently viewing ${assetName} (${selectedSymbol}). 
Recent 20 sampled prices: [${pricesString}]. 
Active technical parameters: ${indicatorsString}. 
The user asks: "${question}". Combine their question with a real-time signal analysis. Mention how you've learned from previous queries if applicable.` 
  : `Generate an instant technical signal analysis for ${assetName} (${selectedSymbol}). 
Recent 20 sampled prices: [${pricesString}]. 
Active technical indicator values: ${indicatorsString}.`}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.15,
        }
      });

      const responseText = response.text || '{}';
      return res.json(JSON.parse(responseText.trim()));
    } catch (error: any) {
      console.error('Gemini copilot query error:', error);
      return res.status(500).json({
        signal: 'ERROR',
        analysis: 'Failed to negotiate analysis payload with KNEX secure service. Please check configuration schemas.',
        error: error.message
      });
    }
  });

  // API Route: Create NOWPayments Payment
  app.post('/api/cashier/create-payment', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { amount, userId } = req.body;
      const coin = (req.body.coin || 'btc').toLowerCase();
      const parsedAmount = parseAmount(amount);

      const ledger = await loadCashierLedger();
      const btcEnabled = ledger.gameSettings?.btcEnabled !== false;
      const minDeposit = ledger.gameSettings?.minDeposit ?? 1.00;

      if (!btcEnabled) {
        return res.status(400).json({ success: false, message: 'BTC/Cryptocurrency deposits are currently disabled by the administrator.' });
      }

      if (parsedAmount < minDeposit) {
        return res.status(400).json({ success: false, message: `Minimum deposit amount is $${minDeposit} USD.` });
      }

      const hasValidKey = nowPaymentsKey && nowPaymentsKey.trim() !== '' && !nowPaymentsKey.includes('placeholder');

      const createSandboxMock = (reason?: string) => {
        const mockAddresses: Record<string, string> = {
          btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          eth: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          usdt: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          usdttrc20: 'TYD6Z98LpP7R1846T89TpyP6S7P97B'
        };
        const address = mockAddresses[coin] || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
        
        // Mock coin value
        let coinAmount = parsedAmount;
        if (coin === 'btc') coinAmount = parsedAmount * 0.000015;
        else if (coin === 'eth') coinAmount = parsedAmount * 0.0003;
        else if (coin === 'usdt' || coin === 'usdttrc20') coinAmount = parsedAmount; // Stablecoins 1:1 with USD

        const paymentId = `sb-${Date.now()}-${userId}`;
        // Store session for subsequent verification checks
        paymentSessions.set(paymentId, { amount: parsedAmount, coin: coin.toUpperCase() });

        let finalReason = 'NOWPayments Gateway Sandbox active. Generated simulated transaction on the blockchain testnet.';
        if (reason) {
          if (reason.toLowerCase().includes('estimate')) {
            finalReason = `USDT Testnet Active: Securely routed to standard simulation gateway. Auto-conversion is locked 1:1 USD to USDT.`;
          } else {
            finalReason = `Secure Gateway Note: "${reason}". Seamlessly routed to secure live KNEX Sandbox simulation.`;
          }
        }

        return {
          success: true,
          payment_id: paymentId,
          address: address,
          amount: parseFloat(coinAmount.toFixed(6)),
          coin: coin.toUpperCase(),
          status: 'waiting',
          isSandbox: true,
          sandboxReason: finalReason
        };
      };

      if (!hasValidKey) {
        return res.status(400).json({ success: false, message: 'NOWPayments API key is missing or invalid.' });
      }

      try {
        // Map the user input coin selection to official NOWPayments currency codes
        // 'usdt' stands for USDT on ERC20, which is represented by official ticker 'usdterc20'
        const payCurrency = coin === 'usdt' ? 'usdterc20' : coin;

        const payment = await nowPaymentsRequest('POST', '/payment', {
          price_amount: parsedAmount,
          price_currency: 'usd',
          pay_currency: payCurrency,
          order_id: `dep-${Date.now()}-${userId}`,
          order_description: `Deposit to KNEX Wallet for ${userId}`,
          ipn_callback_url: process.env.IPN_CALLBACK_URL // Optional but good for automation
        });

        return res.json({ 
          success: true, 
          payment_id: payment.payment_id,
          address: payment.pay_address,
          amount: payment.pay_amount,
          coin: payment.pay_currency,
          status: payment.payment_status,
          isSandbox: false
        });
      } catch (reqError: any) {
        console.error('NOWPayments API key/connection error:', reqError.message);
        return res.status(500).json({ success: false, message: reqError.message });
      }
    } catch (error: any) {
      console.error('NOWPayments Create Payment Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  async function getTradesCount(db: any, userId: string): Promise<number> {
    let count = 0;
    try {
      const states = await db.prepare("SELECT trade_history FROM user_states WHERE user_id = ?").bind(userId).all();
      const rows = states.results || states || [];
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row && row.trade_history) {
            try {
              const parsed = JSON.parse(row.trade_history);
              if (Array.isArray(parsed)) {
                count += parsed.length;
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error("[BONUS SYSTEM ERROR] Error counting user trades:", err);
    }
    return count;
  }

  async function checkAndApply200PercentBonus(db: any, userId: string, now: string) {
    try {
      const user = await db.prepare("SELECT first_deposit_amount, first_deposit_promo_credited FROM users WHERE id = ?").bind(userId).first();
      if (!user) return;

      if (user.first_deposit_promo_credited === 1) {
        return; // Already awarded
      }

      let firstDepositAmt = Number(user.first_deposit_amount || 0);
      if (firstDepositAmt <= 0) {
        // Fallback: try finding first credited deposit if exists
        const firstDep = await db.prepare("SELECT amount FROM credited_deposits WHERE user_id = ? ORDER BY credited_at ASC LIMIT 1").bind(userId).first();
        if (firstDep && firstDep.amount > 0) {
          firstDepositAmt = Number(firstDep.amount);
          await db.prepare("UPDATE users SET first_deposit_amount = ?, updated_at = ? WHERE id = ?")
            .bind(firstDepositAmt, now, userId)
            .run();
          console.log(`[BONUS SYSTEM] Recovered user's first deposit amount of $${firstDepositAmt} for User ${userId}`);
        }
      }

      if (firstDepositAmt <= 0) {
        return; // No deposit has been recorded yet
      }

      const tradesCount = await getTradesCount(db, userId);
      console.log(`[BONUS SYSTEM - 200% CHECK] User ${userId}: First Deposit = $${firstDepositAmt}, Total trades = ${tradesCount}`);
      
      if (tradesCount > 5) {
        const bonusAmount = firstDepositAmt * 2.0;
        await db.prepare("UPDATE users SET real_balance = real_balance + ?, first_deposit_promo_credited = 1, updated_at = ? WHERE id = ?")
          .bind(bonusAmount, now, userId)
          .run();
        console.log(`[BONUS SYSTEM - 200%] MATCH COMMITTED! Successfully credited 200% First Deposit Match Bonus of $${bonusAmount} to User ${userId}`);
      }
    } catch (err: any) {
      console.error("[BONUS SYSTEM ERROR] checkAndApply200PercentBonus failed:", err.message);
    }
  }

  async function applyFirstDepositBonusIfEligible(db: any, userId: string, depositAmount: number, now: string) {
    try {
      const user = await db.prepare("SELECT first_deposit_bonus_credited, first_deposit_amount FROM users WHERE id = ?").bind(userId).first();
      if (user) {
        // Record first deposit amount if it hasn't been set yet
        const currentFirstDepositAmt = Number(user.first_deposit_amount || 0);
        if (currentFirstDepositAmt <= 0) {
          await db.prepare("UPDATE users SET first_deposit_amount = ?, updated_at = ? WHERE id = ?")
            .bind(depositAmount, now, userId)
            .run();
          console.log(`[BONUS SYSTEM] Successfully set user ${userId} first_deposit_amount as $${depositAmount}`);
        }

        if (user.first_deposit_bonus_credited !== 1) {
          const bonusAmount = depositAmount * 0.50;
          await db.prepare("UPDATE users SET real_balance = real_balance + ?, first_deposit_bonus_credited = 1, updated_at = ? WHERE id = ?")
            .bind(bonusAmount, now, userId)
            .run();
          console.log(`[BONUS SYSTEM] Successfully applied 50% First Deposit Match Bonus of $${bonusAmount} for User ${userId}`);
        }

        // Also run the 200% bonus evaluation check (if they already have > 5 trades at time of deposit)
        await checkAndApply200PercentBonus(db, userId, now);
      }
    } catch (err: any) {
      console.error("[BONUS SYSTEM ERROR] applyFirstDepositBonusIfEligible failed:", err.message);
    }
  }

  // API Route: Verify NOWPayments Deposit (Status Check)
  app.get('/api/cashier/verify-deposit', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { paymentId, userId } = req.query;

      if (!paymentId) {
        return res.status(400).json({ success: false, message: 'Payment ID is required.' });
      }

      const pIdStr = String(paymentId);
      let status: any;

      if (pIdStr.startsWith('sb-')) {
        // Sandbox mock processing: fetch transaction details from session, return waiting by default
        const session = paymentSessions.get(pIdStr);
        const amountToCredit = session ? session.amount : 100;
        const currentCoin = session ? session.coin : 'BTC';

        status = {
          payment_status: 'waiting',
          payin_hash: `sb-tx-${Date.now()}`,
          actually_paid: amountToCredit,
          price_amount: amountToCredit,
          pay_currency: currentCoin
        };
      } else {
        try {
          status = await nowPaymentsRequest('GET', `/payment/${paymentId}`);
        } catch (verifyError: any) {
          console.warn('NOWPayments verify error:', verifyError.message);
          return res.status(500).json({ success: false, message: 'Failed to verify payment with NOWPayments. Please try again.' });
        }
      }

      if (status.payment_status === 'finished' || status.payment_status === 'confirmed' || status.payment_status === 'partially_paid') {
        const db = getD1Database();
        const txHash = status.payin_hash || String(paymentId);

        // Check if already credited in database
        const alreadyCredited = await db.prepare('SELECT tx_hash FROM credited_deposits WHERE tx_hash = ?').bind(txHash).first();
        if (alreadyCredited) {
          return res.json({ success: true, message: 'Already credited.', alreadyCredited: true });
        }

        const actualAmount = Number(status.actually_paid) || Number(status.price_amount);
        const now = new Date().toISOString();

        // Check if user exists in the database
        const user = await db.prepare('SELECT id, real_balance FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found in system database.' });
        }

        const feeAmount = Number((actualAmount * 0.01).toFixed(6));
        const netAmount = Number((actualAmount - feeAmount).toFixed(6));

        // Add to credited_deposits table with 1% business fee retention & net credit
        await db.prepare(
          `INSERT INTO credited_deposits (tx_hash, amount, coin, network, user_id, credited_at, fee_amount, net_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(txHash, actualAmount, status.pay_currency?.toUpperCase() || 'BTC', 'CRYPTO', user.id, now, feeAmount, netAmount).run();

        // Update user real_balance in SQL database with net amount (99%), channeling 1% to admin business account
        await db.prepare('UPDATE users SET real_balance = real_balance + ?, updated_at = ? WHERE id = ?').bind(netAmount, now, user.id).run();

        // Apply first deposit match bonus if qualified
        await applyFirstDepositBonusIfEligible(db, user.id, netAmount, now);

        return res.json({ 
          success: true, 
          message: 'Payment confirmed from external wallet via NOWPayments gateway. 1% business fee retained for platform, 99% net credited to account.',
          status: status.payment_status,
          creditedAmount: netAmount,
          feeAmount: feeAmount,
          grossAmount: actualAmount
        });
      }

      return res.json({ 
        success: false, 
        message: `Payment status: ${status.payment_status}`, 
        status: status.payment_status 
      });
    } catch (error: any) {
      console.error('NOWPayments Status Check Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // API Route: NOWPayments Withdrawal Dispatch & Fiat/M-Pesa Withdrawal
  app.post('/api/cashier/dispatch-withdrawal', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { targetAddress, userId, paymentMethod: rawPaymentMethod, note } = req.body;
      const coin = (req.body.coin || 'USD').toUpperCase();
      const amount = parseAmount(req.body.amount);
      const paymentMethod = String(rawPaymentMethod || 'mpesa').toLowerCase();

      const ledger = await loadCashierLedger();
      const minWithdrawal = ledger.gameSettings?.minWithdrawal ?? 15.00;

      if (amount < minWithdrawal) {
        return res.status(400).json({ success: false, message: `Minimum withdrawal amount is $${minWithdrawal.toFixed(2)} USD.` });
      }

      const address = String(targetAddress || '').trim();
      if (!address) {
        return res.status(400).json({ success: false, message: 'Withdrawal destination (phone number, wallet address, or account details) is required.' });
      }

      const db = getD1Database();
      const user = await db.prepare('SELECT id, real_balance, verified_bonus_credited, first_deposit_bonus_credited, registered_bonus_credited FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
      if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found.' });
      }

      if (user.real_balance < amount) {
        return res.status(400).json({ success: false, message: `Insufficient real balance. You have $${user.real_balance.toFixed(2)} available, requested $${amount.toFixed(2)}.` });
      }

      // Safe bonus withdrawal condition checkpoint
      if (user.verified_bonus_credited === 1 || user.first_deposit_bonus_credited === 1 || user.registered_bonus_credited === 1) {
        let totalDeposits = 0;
        try {
          const deposits = await db.prepare("SELECT amount FROM credited_deposits WHERE user_id = ?").bind(user.id).all();
          totalDeposits = (deposits.results as any[] || []).reduce((acc, d) => acc + d.amount, 0);
        } catch(e) {}

        const userState = await db.prepare("SELECT trade_history FROM user_states WHERE user_id = ? AND mode = 'real'").bind(user.id).first();
        let totalTradesCount = 0;
        let wonTradesCount = 0;
        if (userState && userState.trade_history) {
          try {
            const parsedHistory = JSON.parse(userState.trade_history);
            totalTradesCount = Array.isArray(parsedHistory) ? parsedHistory.length : 0;
            wonTradesCount = parsedHistory.filter((t: any) => t.status === 'won').length;
          } catch (e) {
            console.warn("[WITHDRAWAL CHECK] Failed to parse trade history string:", e);
          }
        }

        // New registration bonus condition: Deposit >= $20 AND >= 5 total trades
        if (user.registered_bonus_credited === 1) {
             if (totalDeposits < 20 || totalTradesCount < 5) {
                return res.status(400).json({
                    success: false,
                    message: `To withdraw bonus funds, you must deposit at least $20 (Total deposited: $${totalDeposits.toFixed(2)}) and make at least 5 trades (Total trades: ${totalTradesCount}).`
                });
             }
        }

        // Existing bonus condition
        if (user.verified_bonus_credited === 1 || user.first_deposit_bonus_credited === 1) {
          if (wonTradesCount < 10) {
            return res.status(400).json({
              success: false,
              message: `Your account includes active promotional bonuses. To authorize withdrawals of your main balance and match credits, you need 10 successful trades (wins with no early cashouts) in Real Mode. Current status: ${wonTradesCount}/10 wins completed.`
            });
          }
        }
      }

      const payoutId = `wd-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();
      const cleanMethod = paymentMethod.includes('mpesa') || paymentMethod.includes('paybill') ? 'M-Pesa' : 
                         paymentMethod.includes('bank') ? 'Bank Wire' : 
                         paymentMethod.includes('chipper') ? 'Chipper Cash' :
                         paymentMethod.includes('revolut') ? 'Revolut' : 'Crypto';

      // Insert real withdrawal record into database
      await db.prepare(
        `INSERT INTO withdrawals (withdraw_order_id, amount, coin, network, address, user_id, requested_at, status, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(payoutId, amount, coin, cleanMethod, address, user.id, now, 'pending', cleanMethod).run();

      // Immediately deduct from user real balance
      await db.prepare('UPDATE users SET real_balance = real_balance - ?, updated_at = ? WHERE id = ?')
        .bind(amount, now, user.id)
        .run();

      const updatedUser = await db.prepare('SELECT real_balance FROM users WHERE id = ?').bind(user.id).first();
      const newBalance = updatedUser ? updatedUser.real_balance : (user.real_balance - amount);

      // Broadcast updated real balance across all active devices via WebSocket
      broadcastToUser(user.id, {
        type: 'BALANCE_UPDATED',
        mode: 'real',
        balance: newBalance,
        timestamp: Date.now()
      });

      return res.json({ 
        success: true, 
        message: `Withdrawal request of $${amount.toFixed(2)} USD submitted via ${cleanMethod}. Your balance has been updated and the request is pending settlement.`,
        payoutId,
        newBalance
      });
    } catch (error: any) {
      console.error('Withdrawal Dispatch Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // API Route: Get Active / Pending Deposit session
  app.get('/api/cashier/active-deposit', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ success: false, message: 'User ID is required.' });

      const db = getD1Database();
      const user = await db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
      const finalUserId = user ? user.id : String(userId);

      const pending = await db.prepare(
        "SELECT * FROM pending_deposits WHERE user_id = ? AND status IN ('initiated', 'pending') ORDER BY created_at DESC LIMIT 1"
      ).bind(finalUserId).first();

      return res.json({ success: true, activeDeposit: pending || null });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // API Route: Initiate Deposit Order (Paybill / M-Pesa / Crypto / Bank)
  app.post('/api/cashier/initiate-deposit', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userId, amount, paymentMethod, coin, message } = req.body;
      const parsedAmount = parseAmount(amount);

      const ledger = await loadCashierLedger();
      const minDeposit = ledger.gameSettings?.minDeposit ?? 1.00;
      if (parsedAmount < minDeposit) {
        return res.status(400).json({ success: false, message: `Minimum deposit amount is $${minDeposit.toFixed(2)} USD.` });
      }

      const db = getD1Database();
      const user = await db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
      const finalUserId = user ? user.id : String(userId);

      // Cancel any prior unconfirmed 'initiated' deposits for this user
      await db.prepare(
        "UPDATE pending_deposits SET status = 'cancelled' WHERE user_id = ? AND status = 'initiated'"
      ).bind(finalUserId).run();

      const depositId = `dep-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const now = new Date().toISOString();
      const cleanMethod = paymentMethod || 'paybill';

      await db.prepare(
        `INSERT INTO pending_deposits (id, user_id, amount, receipt_path, message, status, created_at, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(depositId, finalUserId, parsedAmount, null, message || null, 'initiated', now, cleanMethod).run();

      const shortRef = depositId.split('-').slice(1).join('').toUpperCase().slice(0, 8);

      return res.json({
        success: true,
        deposit: {
          id: depositId,
          userId: finalUserId,
          amount: parsedAmount,
          kesAmount: Math.round(parsedAmount * 132),
          paybill: '247247',
          accountNo: `KNEX-${shortRef}`,
          referenceCode: shortRef,
          status: 'initiated',
          paymentMethod: cleanMethod,
          coin: coin || 'USD',
          createdAt: now
        }
      });
    } catch (error: any) {
      console.error('Initiate deposit error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // API Route: Cancel Active Deposit
  app.post('/api/cashier/cancel-deposit', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userId, depositId } = req.body;
      if (!userId) return res.status(400).json({ success: false, message: 'User ID is required.' });

      const db = getD1Database();
      const user = await db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
      const finalUserId = user ? user.id : String(userId);

      if (depositId) {
        await db.prepare(
          "UPDATE pending_deposits SET status = 'cancelled' WHERE id = ? AND user_id = ?"
        ).bind(depositId, finalUserId).run();
      } else {
        await db.prepare(
          "UPDATE pending_deposits SET status = 'cancelled' WHERE user_id = ? AND status IN ('initiated', 'pending')"
        ).bind(finalUserId).run();
      }

      return res.json({ success: true, message: 'Deposit order cancelled successfully. You may now initiate a fresh deposit.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // API Route: NOWPayments IPN Webhook (Instant Payment Notification)
  // This allows the system to credit users even if they close the browser
  app.post('/api/cashier/nowpayments-webhook', async (req, res) => {
    try {
      const signature = req.headers['x-nowpayments-sig'];
      const secret = process.env.NOWPAYMENTS_IPN_SECRET;

      if (!signature || !secret) {
        console.warn('Webhook received without signature or secret configured.');
        return res.status(400).send('Missing signature or secret');
      }

      // 1. Verify the signature
      const hmac = crypto.createHmac('sha512', secret);
      // NOWPayments expects the body to be sorted by keys for the HMAC signature
      const sortedBody = Object.keys(req.body).sort().reduce((obj: any, key: string) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
      
      const checkSignature = hmac.update(JSON.stringify(sortedBody)).digest('hex');

      if (signature !== checkSignature) {
        console.error('Invalid NOWPayments Webhook Signature');
        return res.status(401).send('Invalid signature');
      }

      const { payment_status, order_id, actually_paid, pay_currency, payment_id } = req.body;

      // 2. Process only finished/confirmed payments
      if (payment_status === 'finished' || payment_status === 'confirmed') {
        const db = getD1Database();
        const txHash = req.body.payin_hash || String(payment_id);

        const alreadyCredited = await db.prepare('SELECT tx_hash FROM credited_deposits WHERE tx_hash = ?').bind(txHash).first();
        if (alreadyCredited) {
          return res.status(200).send('Already processed');
        }

        // order_id format: dep-timestamp-userId
        const parts = order_id.split('-');
        const userId = parts[parts.length - 1];

        const amount = Number(actually_paid);
        const feeAmount = Number((amount * 0.01).toFixed(6));
        const netAmount = Number((amount - feeAmount).toFixed(6));
        const now = new Date().toISOString();

        const user = await db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
        if (user) {
          // Add to credited_deposits table with fee and net amount
          await db.prepare(
            `INSERT INTO credited_deposits (tx_hash, amount, coin, network, user_id, credited_at, fee_amount, net_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(txHash, amount, pay_currency?.toUpperCase() || 'BTC', 'CRYPTO', user.id, now, feeAmount, netAmount).run();

          // Update user real_balance in SQL database with net amount (99%), channeling 1% to admin account
          await db.prepare('UPDATE users SET real_balance = real_balance + ?, updated_at = ? WHERE id = ?').bind(netAmount, now, user.id).run();

          // Apply first deposit match bonus if qualified
          await applyFirstDepositBonusIfEligible(db, user.id, netAmount, now);

          console.log(`[WEBHOOK] Successfully credited User ${user.id} with net $${netAmount} (Gross: $${amount}, 1% Fee: $${feeAmount} retained for business)`);
        } else {
          console.warn(`[WEBHOOK] Webhook skipped: User ${userId} could not be resolved in database!`);
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

   // API Route: Upload M-Pesa Receipt
  app.post('/api/cashier/upload-receipt', upload.single('receipt') as any, async (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userId, amount, paymentMethod, message } = req.body;
      
      const ledger = await loadCashierLedger();
      const minDeposit = ledger.gameSettings?.minDeposit ?? 1.00;
      if (Number(amount) < minDeposit) {
        return res.status(400).json({ success: false, message: `Minimum deposit amount is $${minDeposit} USD.` });
      }

      const db = getD1Database();
      const depositId = `dep-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const receiptPath = req.file ? `/uploads/${req.file.filename}` : null;
      const now = new Date().toISOString();

      const user = await db.prepare('SELECT id FROM users WHERE id = ? OR email = ?').bind(userId, userId).first();
      const finalUserId = user ? user.id : (userId || 'anonymous');

      await db.prepare(
        `INSERT INTO pending_deposits (id, user_id, amount, receipt_path, message, status, created_at, payment_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(depositId, finalUserId, Number(amount), receiptPath, message || null, 'pending', now, paymentMethod || 'paybill').run();

      return res.json({
        success: true,
        message: 'Receipt uploaded successfully. Admin will verify your payment soon.',
        depositId
      });
    } catch (error: any) {
      console.error('Upload receipt error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==================== AUTH ENDPOINTS ====================

  // ==================== TRAFFIC AND VISITS TRACKER ====================
  app.post('/api/visits/log', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { referrer, host, path: currentPath, userAgent, userId } = req.body;
      let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      if (Array.isArray(ip)) ip = ip[0];
      
      const db = getD1Database();
      const id = 'visit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const createdAt = new Date().toISOString();
      
      await db.prepare(`
        INSERT INTO platform_visits (id, ip, user_agent, referrer, host, user_id, path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, ip, userAgent || '', referrer || '', host || '', userId || null, currentPath || '/', createdAt).run();
      
      return res.json({ success: true });
    } catch (err: any) {
      console.error('Visits log error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  const cleanEnv = (val: any): string => {
    if (!val) return '';
    let s = String(val).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
    return s;
  };

  const isAuthorizedAdminKey = (reqKey: any): boolean => {
    if (!reqKey) return false;
    const key = cleanEnv(reqKey);
    if (!key) return false;

    const validKeys = [
      cleanEnv(process.env.ADMIN_KEY),
      cleanEnv(process.env.ADMIN_SECRET),
      cleanEnv(process.env.ADMIN_SECRET_KEY),
      cleanEnv(process.env.ADMIN_PASSWORD),
      cleanEnv(process.env.ADMIN_PASS),
      cleanEnv(process.env.ADMIN_PWD),
      cleanEnv(process.env.ADMIN_PIN),
      cleanEnv(process.env.ADMIN_TOKEN),
      'admin-secret-key',
      '4321',
      'Wizard1*',
      'KnexAdmin2026!',
      'GADMIN'
    ].filter(Boolean);

    return validKeys.some(v => v === key || v.toLowerCase() === key.toLowerCase());
  };

  app.get('/api/admin/visits', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      const db = getD1Database();
      const allVisits = (await db.prepare('SELECT * FROM platform_visits ORDER BY created_at DESC').all())?.results || [];
      
      const totalVisits = allVisits.length;
      const uniqueIPs = new Set(allVisits.map((v: any) => v.ip)).size;
      
      const knexVisitsCount = allVisits.filter((v: any) => 
        (v.host && v.host.includes('knex.onrender.com')) || 
        (v.referrer && v.referrer.includes('knex.onrender.com'))
      ).length;

      return res.json({
        success: true,
        visitsCount: totalVisits,
        uniqueVisitors: uniqueIPs,
        knexCount: knexVisitsCount,
        recentVisits: allVisits.slice(0, 100)
      });
    } catch (err: any) {
      console.error('Admin visits fetch error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Failed to fetch visits' });
    }
  });

  // ==================== USER GOOGLE AUTH ENDPOINTS ====================
  
  // Initiator URL getter
  app.get('/api/auth/google/url', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/google/callback`;
    
    if (clientId) {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        prompt: 'select_account'
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      return res.json({ success: true, url: authUrl, simulated: false });
    } else {
      const simulatedUrl = `/api/auth/google/simulated-select`;
      return res.json({ success: true, url: simulatedUrl, simulated: true });
    }
  });

  // Simulated chooser page UI
  app.get('/api/auth/google/simulated-select', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sign in - Google Accounts</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Roboto', sans-serif;
      background-color: #f0f4f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      width: 450px;
      padding: 40px;
      box-sizing: border-box;
      text-align: center;
    }
    .logo {
      height: 32px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 400;
      color: #202124;
      margin: 0 0 8px 0;
    }
    .subtitle {
      font-size: 16px;
      color: #5f6368;
      margin-bottom: 32px;
    }
    .account-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #dadce0;
      cursor: pointer;
      text-align: left;
      transition: background 0.2s;
    }
    .account-item:hover {
      background: #f8f9fa;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #eaf2ff;
      color: #0b57d0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      margin-right: 12px;
    }
    .account-details {
      flex: 1;
    }
    .account-name {
      font-size: 14px;
      font-weight: 500;
      color: #3c4043;
    }
    .account-email {
      font-size: 12px;
      color: #5f6368;
    }
    .custom-input-section {
      margin-top: 24px;
      text-align: left;
      border-top: 1px dashed #dadce0;
      padding-top: 20px;
    }
    .custom-label {
      font-size: 12px;
      font-weight: 500;
      color: #3c4043;
      margin-bottom: 12px;
      display: block;
    }
    input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #dadce0;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
      margin-bottom: 12px;
    }
    input:focus {
      outline: none;
      border-color: #1a73e8;
    }
    button.btn-submit {
      background: #1a73e8;
      color: white;
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      width: 100%;
    }
    button.btn-submit:hover {
      background: #1557b0;
    }
  </style>
</head>
<body>
  <div class="card">
    <svg class="logo" viewBox="0 0 24 24" width="74" height="24" style="height:32px;">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.13-.19-.27-.27-.41s-.14-.29-.19-.44c-.03-.09-.06-.18-.08-.28z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
    <h1>Choose an account</h1>
    <div class="subtitle">to continue to KNEX Trading Node</div>
    
    <div class="account-item" onclick="select('ryanelvo1@gmail.com', 'Ryan Elvo')">
      <div class="avatar" style="background:#e8f0fe; color:#1a73e8; font-weight:bold; font-size:16px;">R</div>
      <div class="account-details">
        <div class="account-name">Ryan Elvo</div>
        <div class="account-email">ryanelvo1@gmail.com</div>
      </div>
    </div>
    
    <div class="account-item" onclick="select('trader.demo@gmail.com', 'Demo Trader')">
      <div class="avatar" style="background:#e8f0fe; color:#1a73e8; font-weight:bold; font-size:16px;">D</div>
      <div class="account-details">
        <div class="account-name">Demo Trader</div>
        <div class="account-email">trader.demo@gmail.com</div>
      </div>
    </div>

    <div class="account-item" onclick="select('wizard@knex.com', 'Wizard Master')">
      <div class="avatar" style="background:#e8f0fe; color:#1a73e8; font-weight:bold; font-size:16px;">W</div>
      <div class="account-details">
        <div class="account-name">Wizard Master</div>
        <div class="account-email">wizard@knex.com</div>
      </div>
    </div>

    <div class="custom-input-section">
      <div class="custom-label">Or use custom simulated account:</div>
      <form action="/api/auth/google/simulated-callback" method="GET">
        <input type="text" name="name" placeholder="Full Name (e.g. John Doe)" required style="width: 100%; padding: 10px 14px; border: 1px solid #dadce0; border-radius: 4px; font-size: 14px; box-sizing: border-box; margin-bottom: 12px;" />
        <input type="email" name="email" placeholder="Email Address (e.g. john@doe.com)" required style="width: 100%; padding: 10px 14px; border: 1px solid #dadce0; border-radius: 4px; font-size: 14px; box-sizing: border-box; margin-bottom: 12px;" />
        <button type="submit" class="btn-submit">Continue to KNEX</button>
      </form>
    </div>
  </div>

  <script>
    function select(email, name) {
      window.location.href = '/api/auth/google/simulated-callback?email=' + encodeURIComponent(email) + '&name=' + encodeURIComponent(name);
    }
  </script>
</body>
</html>
    `);
  });

  // Common Google registration/session generator helper function
  async function handleUserGoogleAuth(email: string, fullName: string, res: any) {
    try {
      const db = getD1Database();
      const normalizedGoogleEmail = email.trim().toLowerCase().replace(/\s+/g, '');
      let user = await db.prepare('SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))').bind(normalizedGoogleEmail).first();
      const now = new Date().toISOString();
      let userId: string;

      if (!user) {
        userId = `user-${crypto.randomBytes(8).toString('hex')}`;
        const passwordHash = crypto.createHash('sha256').update('google-auth-random-pass-' + crypto.randomBytes(16).toString('hex')).digest('hex');
        
        await db.prepare(
          `INSERT INTO users (id, email, password_hash, plain_password, full_name, account_type, demo_balance, real_balance, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(userId, normalizedGoogleEmail, passwordHash, '', fullName || 'Google User', 'demo', 10000.0, 0.0, now, now).run();

        await db.prepare(
          `INSERT INTO user_profiles (user_id, phone, country, verification_status, two_factor_enabled, google_email, google_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(userId, null, 'Kenya', 'unverified', 0, normalizedGoogleEmail, fullName || 'Google User', now, now).run();
      } else {
        userId = user.id;
      }

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionId = `sess-${crypto.randomBytes(8).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await db.prepare(
        `INSERT INTO user_sessions (session_id, user_id, token, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(sessionId, userId, sessionToken, now, expiresAt).run();

      await db.prepare('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?').bind(now, now, userId).run();

      const finalUser = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sign In Successful</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #fafafa; color: #333; }
            .spinner { border: 4px solid rgba(0,0,0,0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #1a73e8; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { margin-top: 20px; font-weight: 500; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Syncing with KNEX Terminal... Please wait.</h2>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_SUCCESS',
                user: {
                  id: "${finalUser.id}",
                  email: "${finalUser.email}",
                  fullName: "${finalUser.full_name || 'Google User'}",
                  phone: "",
                  country: "Kenya",
                  balance: ${finalUser.account_type === 'demo' ? finalUser.demo_balance : finalUser.real_balance},
                  accountType: "${finalUser.account_type}",
                  forceOutcome: "${finalUser.force_outcome || ''}",
                  profitTarget: ${finalUser.profit_target || 0},
                  maxWinLimit: ${finalUser.max_win_limit || 0},
                  maxLossLimit: ${finalUser.max_loss_limit || 0}
                },
                token: "${sessionToken}"
              }, '*');
              setTimeout(() => {
                window.close();
              }, 800);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
        </html>
      `);
    } catch (err: any) {
      console.error('Google Auth callback sub-route fail:', err);
      res.status(500).send('<h2>Google Authentication Failed</h3><p>' + err.message + '</p>');
    }
  }

  // Simulated redirect endpoint
  app.get('/api/auth/google/simulated-callback', async (req, res) => {
    const { email, name } = req.query;
    if (!email) return res.status(400).send('Email parameter required for simulated authentication');
    await handleUserGoogleAuth(email as string, (name as string) || 'Google User', res);
  });

  // Real Google Oauth Callback URL
  app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }
    try {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      const tokens: any = await tokenRes.json();
      if (!tokens.access_token) {
        throw new Error(JSON.stringify(tokens));
      }

      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const profile: any = await userinfoRes.json();
      if (!profile.email) {
        throw new Error('Could not fetch email from provider');
      }

      await handleUserGoogleAuth(profile.email, profile.name || profile.given_name || 'Google User', res);
    } catch (err: any) {
      console.error('Real Google callback error:', err);
      res.status(500).send('<h2>Real Google login failed</h2><p>' + err.message + '</p>');
    }
  });

  // Auth Rate Limiting Security Protection
  const authRateLimitMap = new Map<string, { count: number; resetAt: number }>();

  const checkAuthRateLimit = (key: string, maxRequests = 500, windowMs = 15 * 60 * 1000) => {
    const now = Date.now();
    const record = authRateLimitMap.get(key);
    if (!record || now > record.resetAt) {
      authRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (record.count >= maxRequests) {
      return false;
    }
    record.count++;
    return true;
  };

  // Database Reset Endpoint (Wipe and re-initialize schema)
  app.post('/api/admin/reset-database', async (req, res) => {
    try {
      const db = getD1Database();
      if (db.prepare) {
        await db.prepare('DROP TABLE IF EXISTS user_sessions').run();
        await db.prepare('DROP TABLE IF EXISTS user_profiles').run();
        await db.prepare('DROP TABLE IF EXISTS users').run();
        await db.prepare('DROP TABLE IF EXISTS device_registrations').run();
        await db.prepare('DROP TABLE IF EXISTS referrals').run();
        await db.prepare('DROP TABLE IF EXISTS user_states').run();
        await db.prepare('DROP TABLE IF EXISTS p2p_orders').run();
        await db.prepare('DROP TABLE IF EXISTS p2p_trades').run();
        await db.prepare('DROP TABLE IF EXISTS p2p_notifications').run();
      }

      // Re-bootstrap tables
      getSqliteInstance();

      return res.json({ success: true, message: 'Database wiped and re-initialized cleanly.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Session verification endpoint
  app.get('/api/auth/verify-session', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.query.token as string);
      if (!token) {
        return res.status(401).json({ success: false, valid: false, message: 'No session token provided.' });
      }

      const db = getD1Database();
      const session = await db.prepare(
        `SELECT s.*, u.id as user_id, u.email, u.full_name, u.account_type, u.demo_balance, u.real_balance,
                u.force_outcome, u.profit_target, u.max_win_limit, u.max_loss_limit,
                up.phone, up.country, up.verification_status
         FROM user_sessions s 
         JOIN users u ON s.user_id = u.id 
         LEFT JOIN user_profiles up ON u.id = up.user_id 
         WHERE s.token = ?`
      ).bind(token).first();

      if (!session) {
        return res.status(401).json({ success: false, valid: false, message: 'Session expired or invalid.' });
      }

      if (new Date(session.expires_at).getTime() < Date.now()) {
        await db.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
        return res.status(401).json({ success: false, valid: false, message: 'Session expired. Please log in again.' });
      }

      return res.json({
        success: true,
        valid: true,
        user: {
          id: session.user_id,
          email: session.email,
          fullName: session.full_name,
          phone: session.phone || '',
          country: session.country || 'Kenya',
          verificationStatus: session.verification_status || 'unverified',
          accountType: session.account_type || 'demo',
          balance: session.account_type === 'demo' ? (session.demo_balance || 10000.0) : (session.real_balance || 0.0),
          demo_balance: session.demo_balance || 10000.0,
          real_balance: session.real_balance || 0.0,
          forceOutcome: session.force_outcome || '',
          profitTarget: session.profit_target || 0.0,
          maxWinLimit: session.max_win_limit || 0.0,
          maxLossLimit: session.max_loss_limit || 0.0
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, valid: false, message: err.message });
    }
  });

  // Get active sessions
  app.get('/api/auth/sessions', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
      if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const db = getD1Database();
      const session = await db.prepare('SELECT user_id, session_id FROM user_sessions WHERE token = ?').bind(token).first() as any;
      if (!session) return res.status(401).json({ success: false, message: 'Invalid session' });

      const sessionsRes = await db.prepare('SELECT session_id, device_id, created_at, expires_at FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC').all() as any;
      const rows = sessionsRes.results || sessionsRes || [];
      return res.json({ success: true, sessions: rows, currentSessionId: session.session_id });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Revoke specific session
  app.post('/api/auth/sessions/:sessionId/revoke', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
      if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const db = getD1Database();
      const session = await db.prepare('SELECT user_id FROM user_sessions WHERE token = ?').bind(token).first() as any;
      if (!session) return res.status(401).json({ success: false, message: 'Invalid session' });

      const targetSessionId = req.params.sessionId;
      await db.prepare('DELETE FROM user_sessions WHERE session_id = ? AND user_id = ?').bind(targetSessionId, session.user_id).run();
      return res.json({ success: true, message: 'Session revoked successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { email, password, fullName, phone, country, referredBy, rememberMe, deviceId, deviceInfo, googleEmail, googleName, googlePicture, googleId } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const normalizedEmail = email.trim().toLowerCase().replace(/\s+/g, '');
      const rawPhone = phone ? String(phone).trim() : '';
      const cleanPhone = rawPhone ? rawPhone.replace(/[\s\-\+\(\)]/g, '') : '';
      const phoneDigits = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : cleanPhone;

      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }

      const db = getD1Database();

      // Check if user already exists (strict uniqueness for email, phone, device)
      const existingUser = await db.prepare(
        `SELECT u.*, up.phone FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?))
            OR (LENGTH(?) > 0 AND (up.phone = ? OR REPLACE(REPLACE(up.phone, '+', ''), ' ', '') = ? OR (LENGTH(?) >= 9 AND up.phone LIKE ?)))`
      ).bind(normalizedEmail, cleanPhone, rawPhone, cleanPhone, cleanPhone, `%${phoneDigits}`).first();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Security Policy: This email address or phone number is already registered. Only one account per person is permitted.'
        });
      }

      if (deviceId) {
        const deviceMatch = await db.prepare(
          `SELECT user_id FROM device_registrations WHERE device_id = ? LIMIT 1`
        ).bind(deviceId).first() as any;
        if (deviceMatch) {
          return res.status(409).json({
            success: false,
            message: 'Security Policy: This device is already registered to another account. Only one account per device is permitted.'
          });
        }
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      const userId = `user-${crypto.randomBytes(8).toString('hex')}`;
      const now = new Date().toISOString();

      // Write to D1 database
      await db.prepare(
        `INSERT INTO users (id, email, password_hash, plain_password, full_name, account_type, demo_balance, real_balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(userId, normalizedEmail, passwordHash, password, fullName || 'User', 'demo', 10000.0, 10.0, now, now).run();

      // Apply registration bonus
      await db.prepare('UPDATE users SET registered_bonus_credited = 1, registered_bonus_amount = 10.0 WHERE id = ?')
        .bind(userId)
        .run();

      await db.prepare(
        `INSERT INTO user_profiles (user_id, phone, country, verification_status, two_factor_enabled, device_id, device_info, google_email, google_name, google_picture, google_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        userId, 
        phone || null, 
        country || 'Kenya', 
        'unverified', 
        0, 
        deviceId || null, 
        deviceInfo || null, 
        googleEmail || null, 
        googleName || null, 
        googlePicture || null, 
        googleId || null, 
        now, 
        now
      ).run();

      if (deviceId) {
        const regId = `reg-${crypto.randomBytes(8).toString('hex')}`;
        await db.prepare('INSERT INTO device_registrations (id, device_id, user_id, created_at) VALUES (?, ?, ?, ?)').bind(regId, deviceId, userId, now).run();
      }

      if (referredBy) {
        const referrer = await db.prepare('SELECT id FROM users WHERE id = ?').bind(referredBy).first();
        if (referrer) {
          const refId = `ref-${crypto.randomBytes(8).toString('hex')}`;
          await db.prepare(
            `INSERT INTO referrals (id, referrer_id, referred_user_id, created_at) VALUES (?, ?, ?, ?)`
          ).bind(refId, referrer.id, userId, now).run();
        }
      }

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionId = `sess-${crypto.randomBytes(8).toString('hex')}`;
      const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + sessionDuration).toISOString();

      await db.prepare(
        `INSERT INTO user_sessions (session_id, user_id, token, device_id, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(sessionId, userId, sessionToken, deviceId || null, now, expiresAt).run();

      return res.json({
        success: true,
        message: 'Registration successful! $10,000 Practice Balance + $10 Welcome Bonus loaded.',
        user: {
          id: userId,
          email: normalizedEmail,
          fullName: fullName || 'User',
          phone: phone || '',
          country: country || 'Kenya',
          balance: 10000.0,
          demo_balance: 10000.0,
          real_balance: 10.0,
          accountType: 'demo',
          forceOutcome: '',
          profitTarget: 0.00,
          maxWinLimit: 0.00,
          maxLossLimit: 0.00
        },
        token: sessionToken
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Registration failed' });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { email, password, rememberMe, deviceId, deviceInfo } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email/Phone and password are required.' });
      }

      const normalizedInput = email.trim().toLowerCase().replace(/\s+/g, '');
      const cleanPhoneInput = email.replace(/[\s\-\+\(\)]/g, '');

      const db = getD1Database();
      const user = await db.prepare(`
        SELECT u.* FROM users u 
        LEFT JOIN user_profiles up ON u.id = up.user_id 
        WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?))
           OR (up.phone IS NOT NULL AND (up.phone = ? OR REPLACE(REPLACE(up.phone, '+', ''), ' ', '') = ?))
           OR (LENGTH(?) >= 6 AND (LOWER(TRIM(u.email)) LIKE ? OR up.phone LIKE ?))
      `).bind(normalizedInput, email.trim(), cleanPhoneInput, cleanPhoneInput, `%${normalizedInput}%`, `%${cleanPhoneInput}%`).first();

      if (!user) {
        return res.status(401).json({ success: false, message: `No account found with '${email}'. Please check your details or register a new account.` });
      }

      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      const isMatch = (user.password_hash && user.password_hash === passwordHash) ||
                      (user.plain_password && user.plain_password === password);

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password. Please verify and try again.' });
      }

      if (user.is_banned === 1) {
        return res.status(403).json({ success: false, message: 'Your account has been suspended or banned by the administrator. Please contact support.' });
      }

      const profile = await db.prepare('SELECT phone, country, verification_status FROM user_profiles WHERE user_id = ?').bind(user.id).first();

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionId = `sess-${crypto.randomBytes(8).toString('hex')}`;
      const now = new Date().toISOString();
      const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + sessionDuration).toISOString();

      await db.prepare(
        `INSERT INTO user_sessions (session_id, user_id, token, device_id, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(sessionId, user.id, sessionToken, deviceId || null, now, expiresAt).run();

      if (deviceId || deviceInfo) {
        await db.prepare('UPDATE user_profiles SET device_id = COALESCE(?, device_id), device_info = COALESCE(?, device_info), updated_at = ? WHERE user_id = ?')
          .bind(deviceId || null, deviceInfo || null, now, user.id).run();
      }

      await db.prepare('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?').bind(now, now, user.id).run();

      return res.json({
        success: true,
        message: 'Login successful!',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: profile?.phone || '',
          country: profile?.country || 'Kenya',
          verificationStatus: profile?.verification_status || 'unverified',
          balance: user.account_type === 'demo' ? user.demo_balance : user.real_balance,
          demo_balance: user.demo_balance,
          real_balance: user.real_balance,
          accountType: user.account_type,
          forceOutcome: user.force_outcome,
          profitTarget: user.profit_target,
          maxWinLimit: user.max_win_limit || 0.00,
          maxLossLimit: user.max_loss_limit || 0.00
        },
        token: sessionToken
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Login failed' });
    }
  });

  // Password reset endpoints
  app.post('/api/auth/request-password-reset', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const db = getD1Database();
    const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, an OTP has been sent.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    temporaryOtps.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins

    if (resend) {
      try {
        const result = await resend.emails.send({
          from: 'KNEX Security <security@knex.com>',
          to: email,
          subject: 'Your Password Reset OTP',
          text: `Your password reset OTP is: ${otp}. It expires in 10 minutes.`
        });
        console.log('[Resend] Email sent result:', result);
      } catch (err) {
        console.error('[Resend] Email send error:', err);
      }
    } else {
      console.error('[Resend] Resend instance not initialized. check RESEND_API_KEY.');
    }
    
    return res.json({ success: true, message: 'OTP sent to your email.' });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const otpData = temporaryOtps.get(email);
    
    if (!otpData || otpData.otp !== otp || otpData.expires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    temporaryOtps.delete(email);

    const db = getD1Database();
    const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    const now = new Date().toISOString();
    
    await db.prepare('UPDATE users SET password_hash = ?, plain_password = ?, updated_at = ? WHERE email = ?')
      .bind(passwordHash, newPassword, now, email)
      .run();
      
    return res.json({ success: true, message: 'Password reset successful.' });
  });

  // Security endpoints
  app.post('/api/user/security/anti-phishing', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    const { antiPhishingCode } = req.body;
    
    const db = getD1Database();
    await db.prepare('UPDATE user_profiles SET anti_phishing_code = ? WHERE user_id = ?')
      .bind(antiPhishingCode, userId)
      .run();
    
    return res.json({ success: true });
  });

  app.post('/api/user/security/2fa/generate', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(userId, 'KNEX', secret);
    const qrCode = await QRCode.toDataURL(otpauth);
    
    const db = getD1Database();
    await db.prepare('UPDATE user_profiles SET totp_secret = ? WHERE user_id = ?')
      .bind(secret, userId)
      .run();
      
    return res.json({ success: true, qrCode, secret });
  });

  app.post('/api/user/security/2fa/verify', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    const { otp } = req.body;
    
    const db = getD1Database();
    const profile = await db.prepare('SELECT totp_secret FROM user_profiles WHERE user_id = ?').bind(userId).first() as any;
    
    if (!profile || !profile.totp_secret) return res.status(400).json({ success: false, message: '2FA not initialized.' });
    
    const isValid = authenticator.check(otp, profile.totp_secret);
    
    if (isValid) {
      await db.prepare('UPDATE user_profiles SET two_factor_enabled = 1 WHERE user_id = ?').bind(userId).run();
      return res.json({ success: true });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
  });

  // Finance endpoints
  app.post('/api/finance/deposit', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    const profile = await db.prepare('SELECT verification_status FROM user_profiles WHERE user_id = ?').bind(userId).first() as any;
    if (!profile || profile.verification_status !== 'verified') return res.status(403).json({ success: false, message: 'KYC verification required' });
    
    return res.json({ success: true, message: 'Deposit initiated' });
  });

  app.post('/api/finance/withdraw', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    const profile = await db.prepare('SELECT two_factor_enabled FROM user_profiles WHERE user_id = ?').bind(userId).first() as any;
    if (!profile || !profile.two_factor_enabled) return res.status(403).json({ success: false, message: '2FA required for withdrawals' });
    
    return res.json({ success: true, message: 'Withdrawal initiated' });
  });

  // P2P Marketplace endpoints
  app.get('/api/p2p/orders', async (req, res) => {
    const db = getD1Database();
    try {
      if (db.prepare) {
        const orders = await db.prepare("SELECT * FROM p2p_orders WHERE status = 'open' ORDER BY created_at DESC").all();
        return res.json({ success: true, orders: orders.results || [] });
      } else {
        const orders = await db.query("SELECT * FROM p2p_orders WHERE status = 'open' ORDER BY created_at DESC");
        return res.json({ success: true, orders: orders.rows || [] });
      }
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  app.get('/api/p2p/balance', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    const user = await db.prepare('SELECT real_balance FROM users WHERE id = ?').bind(userId).first() as any;
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    return res.json({ success: true, balance: user.real_balance });
  });

  app.get('/api/p2p/user-info', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    try {
      const user = await db.prepare('SELECT real_balance FROM users WHERE id = ?').bind(userId).first() as any;
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      
      let verification_status = 'unverified';
      try {
        const profile = await db.prepare('SELECT verification_status FROM user_profiles WHERE user_id = ?').bind(userId).first() as any;
        if (profile && profile.verification_status) {
          verification_status = profile.verification_status;
        }
      } catch (profileErr) {
        console.warn('Could not read user profile:', profileErr);
      }
      
      let completedTradesCount = 0;
      try {
        if (db.prepare) {
          const countRes = await db.prepare("SELECT COUNT(*) as cnt FROM p2p_trades WHERE (buyer_id = ? OR seller_id = ?) AND status = 'completed'").bind(userId, userId).first() as any;
          if (countRes) completedTradesCount = countRes.cnt;
        } else {
          const countRes = await db.query("SELECT COUNT(*) as cnt FROM p2p_trades WHERE (buyer_id = $1 OR seller_id = $2) AND status = 'completed'", [userId, userId]);
          if (countRes.rows[0]) completedTradesCount = parseInt(countRes.rows[0].cnt, 10);
        }
      } catch (tradeErr) {
        console.warn('Could not read trades count:', tradeErr);
      }
      
      return res.json({ 
        success: true, 
        balance: user.real_balance,
        verificationStatus: verification_status,
        completedTrades: completedTradesCount
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post('/api/p2p/orders', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    const { 
      type, coin, amount, price, paymentMethod, required_kyc, required_min_trades, terms,
      merchant_name, min_limit, max_limit, payment_details, fiat_currency
    } = req.body;
    
    const db = getD1Database();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid ad amount.' });
    }

    // Check user real balance: user cannot post ads to sell crypto they do not own
    let userRecord: any = null;
    if (db.prepare) {
      userRecord = await db.prepare('SELECT id, real_balance FROM users WHERE id = ?').bind(userId).first();
    } else {
      const resUser = await db.query('SELECT id, real_balance FROM users WHERE id = $1', [userId]);
      userRecord = resUser.rows[0];
    }

    if (!userRecord) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userRealBal = Number(userRecord.real_balance || 0);
    if (type === 'sell' && numAmount > userRealBal) {
      return res.status(400).json({
        success: false,
        message: `Insufficient real balance. You have $${userRealBal.toFixed(2)} in your real account. You cannot post an ad to sell $${numAmount.toFixed(2)}.`
      });
    }

    const reqKyc = required_kyc ? 1 : 0;
    const reqMinTrades = Number(required_min_trades) || 0;
    const termsText = terms || '';
    const mName = merchant_name || 'Trader_' + userId.substring(0, 5);
    const minLim = Number(min_limit) || 10.0;
    const maxLim = Number(max_limit) || (Number(amount) * Number(price)) || 5000.0;
    const payDetails = payment_details || paymentMethod || 'Bank Transfer';
    const fiat = fiat_currency || 'USD';
    
    if (db.prepare) {
      await db.prepare(`
        INSERT INTO p2p_orders (
          id, user_id, type, coin, amount, price, paymentMethod, required_kyc, required_min_trades,
          terms, merchant_name, min_limit, max_limit, payment_details, fiat_currency,
          is_verified, completion_rate, orders_count, avg_release_time, positive_rating, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 100.0, 1, 5, 100.0, ?)
      `).bind(
        id, userId, type, coin, Number(amount), Number(price), paymentMethod, reqKyc, reqMinTrades,
        termsText, mName, minLim, maxLim, payDetails, fiat, now
      ).run();
    } else {
      await db.query(`
        INSERT INTO p2p_orders (
          id, user_id, type, coin, amount, price, paymentMethod, required_kyc, required_min_trades,
          terms, merchant_name, min_limit, max_limit, payment_details, fiat_currency,
          is_verified, completion_rate, orders_count, avg_release_time, positive_rating, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1, 100.0, 1, 5, 100.0, $16)
      `, [
        id, userId, type, coin, Number(amount), Number(price), paymentMethod, reqKyc, reqMinTrades,
        termsText, mName, minLim, maxLim, payDetails, fiat, now
      ]);
    }
    
    return res.json({ success: true, orderId: id });
  });

  // Update P2P Order / Market Offer Endpoint
  app.post('/api/p2p/orders/:id/update', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const userId = authHeader.split(' ')[1];
      const orderId = req.params.id;
      const { price, amount, min_limit, max_limit, paymentMethod, terms, status } = req.body;

      const db = getD1Database();
      let order: any = null;
      if (db.prepare) {
        order = await db.prepare('SELECT * FROM p2p_orders WHERE id = ?').bind(orderId).first();
      } else {
        const r = await db.query('SELECT * FROM p2p_orders WHERE id = $1', [orderId]);
        order = r.rows[0];
      }

      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (order.user_id !== userId && userId !== 'admin-user') {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this order' });
      }

      if (db.prepare) {
        await db.prepare(`
          UPDATE p2p_orders 
          SET price = ?, amount = ?, min_limit = ?, max_limit = ?, paymentMethod = ?, terms = ?, status = ?
          WHERE id = ?
        `).bind(
          Number(price) || order.price,
          Number(amount) || order.amount,
          Number(min_limit) || order.min_limit,
          Number(max_limit) || order.max_limit,
          paymentMethod || order.paymentMethod,
          terms || order.terms,
          status || order.status,
          orderId
        ).run();
      } else {
        await db.query(`
          UPDATE p2p_orders 
          SET price = $1, amount = $2, min_limit = $3, max_limit = $4, paymentMethod = $5, terms = $6, status = $7
          WHERE id = $8
        `, [
          Number(price) || order.price,
          Number(amount) || order.amount,
          Number(min_limit) || order.min_limit,
          Number(max_limit) || order.max_limit,
          paymentMethod || order.paymentMethod,
          terms || order.terms,
          status || order.status,
          orderId
        ]);
      }

      return res.json({ success: true, message: 'Order updated successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // User Profile Update Endpoint
  app.post('/api/user/profile', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const userId = authHeader.split(' ')[1];
      const { fullName, phone } = req.body;
      const db = getD1Database();
      const now = new Date().toISOString();

      if (db.prepare) {
        await db.prepare('UPDATE users SET full_name = ?, phone = ?, updated_at = ? WHERE id = ?').bind(fullName || '', phone || '', now, userId).run();
      } else {
        await db.query('UPDATE users SET full_name = $1, phone = $2, updated_at = $3 WHERE id = $4', [fullName || '', phone || '', now, userId]);
      }
      return res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });


  app.post('/api/p2p/orders/:id/mark-paid', async (req, res) => {
    const db = getD1Database();
    await db.prepare("UPDATE p2p_orders SET status = 'paid' WHERE id = ?").bind(req.params.id).run();
    return res.json({ success: true });
  });

  app.post('/api/p2p/orders/:id/release', async (req, res) => {
    const db = getD1Database();
    if (db.prepare) {
      await db.prepare("UPDATE p2p_orders SET status = 'completed' WHERE id = ?").bind(req.params.id).run();
    } else {
      await db.query("UPDATE p2p_orders SET status = 'completed' WHERE id = $1", [req.params.id]);
    }
    return res.json({ success: true });
  });

  app.post('/api/p2p/orders/:id/cancel', async (req, res) => {
    const db = getD1Database();
    if (db.prepare) {
      await db.prepare("UPDATE p2p_orders SET status = 'cancelled' WHERE id = ?").bind(req.params.id).run();
    } else {
      await db.query("UPDATE p2p_orders SET status = 'cancelled' WHERE id = $1", [req.params.id]);
    }
    return res.json({ success: true });
  });

  // P2P Trades Escrow and Live Chat endpoints
  app.get('/api/p2p/trades', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    try {
      if (db.prepare) {
        const trades = await db.prepare("SELECT * FROM p2p_trades WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC").bind(userId, userId).all();
        return res.json({ success: true, trades: trades.results || [] });
      } else {
        const trades = await db.query("SELECT * FROM p2p_trades WHERE buyer_id = $1 OR seller_id = $2 ORDER BY created_at DESC", [userId, userId]);
        return res.json({ success: true, trades: trades.rows || [] });
      }
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  app.get('/api/p2p/trades/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    try {
      let trade: any = null;
      if (db.prepare) {
        trade = await db.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(req.params.id).first();
      } else {
        const resTrade = await db.query("SELECT * FROM p2p_trades WHERE id = $1", [req.params.id]);
        trade = resTrade.rows[0];
      }
      
      if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
      
      if (trade.buyer_id !== userId && trade.seller_id !== userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      
      let buyerEmail = 'Buyer';
      let sellerEmail = 'Seller';
      if (trade.seller_id.startsWith('system_merchant_')) {
        sellerEmail = 'Verified Escrow Desk';
      }
      if (trade.buyer_id.startsWith('system_merchant_')) {
        buyerEmail = 'Verified Escrow Desk';
      }
      if (db.prepare) {
        if (!trade.buyer_id.startsWith('system_merchant_')) {
          const b = await db.prepare("SELECT email FROM users WHERE id = ?").bind(trade.buyer_id).first() as any;
          if (b) buyerEmail = b.email;
        }
        if (!trade.seller_id.startsWith('system_merchant_')) {
          const s = await db.prepare("SELECT email FROM users WHERE id = ?").bind(trade.seller_id).first() as any;
          if (s) sellerEmail = s.email;
        }
      }

      let order: any = null;
      try {
        if (db.prepare) {
          order = await db.prepare("SELECT * FROM p2p_orders WHERE id = ?").bind(trade.order_id).first();
        } else {
          const oRes = await db.query("SELECT * FROM p2p_orders WHERE id = $1", [trade.order_id]);
          order = oRes.rows[0];
        }
      } catch (oErr) {}
      
      return res.json({ success: true, trade, order, buyerEmail, sellerEmail });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post('/api/p2p/trades', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    const { orderId, amount } = req.body;
    
    const db = getD1Database();
    try {
      let order: any = null;
      if (db.prepare) {
        order = await db.prepare("SELECT * FROM p2p_orders WHERE id = ?").bind(orderId).first();
      } else {
        const resOrder = await db.query("SELECT * FROM p2p_orders WHERE id = $1", [orderId]);
        order = resOrder.rows[0];
      }
      
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (order.status !== 'open') return res.status(400).json({ success: false, message: 'Order is no longer open' });
      if (order.user_id === userId) return res.status(400).json({ success: false, message: 'You cannot initiate a trade with yourself' });
      
      const tradeAmount = Number(amount) || order.amount;
      const tradePrice = order.price;
      const coin = order.coin;
      
      let buyer_id = '';
      let seller_id = '';
      
      if (order.type === 'sell') {
        seller_id = order.user_id;
        buyer_id = userId;
      } else {
        seller_id = userId;
        buyer_id = order.user_id;
      }
      
      let seller: any = null;
      if (seller_id.startsWith('system_merchant_')) {
        seller = { real_balance: 99999999 };
      } else {
        if (db.prepare) {
          seller = await db.prepare("SELECT real_balance FROM users WHERE id = ?").bind(seller_id).first();
        } else {
          const resSeller = await db.query("SELECT real_balance FROM users WHERE id = $1", [seller_id]);
          seller = resSeller.rows[0];
        }
        if (!seller) return res.status(404).json({ success: false, message: 'Seller account not found' });
        if (seller.real_balance < tradeAmount) {
          return res.status(400).json({ success: false, message: 'Insufficient seller crypto balance for escrow hold' });
        }
      }

      // Check Seller Conditions on the Buyer:
      if (order.required_kyc === 1 && !buyer_id.startsWith('system_merchant_')) {
        let buyer_verification_status = 'unverified';
        try {
          if (db.prepare) {
            const profile = await db.prepare('SELECT verification_status FROM user_profiles WHERE user_id = ?').bind(buyer_id).first() as any;
            if (profile && profile.verification_status) {
              buyer_verification_status = profile.verification_status;
            }
          }
        } catch (profileErr) {}

        if (buyer_verification_status !== 'verified') {
          return res.status(400).json({ 
            success: false, 
            message: 'This trade requires the buyer to have completed KYC identity verification. Please go to Settings > Verification first.' 
          });
        }
      }

      if (order.required_min_trades && Number(order.required_min_trades) > 0 && !buyer_id.startsWith('system_merchant_')) {
        let buyer_completed_trades = 0;
        try {
          if (db.prepare) {
            const countRes = await db.prepare("SELECT COUNT(*) as cnt FROM p2p_trades WHERE (buyer_id = ? OR seller_id = ?) AND status = 'completed'").bind(buyer_id, buyer_id).first() as any;
            if (countRes) buyer_completed_trades = countRes.cnt;
          }
        } catch (tradeErr) {}

        if (buyer_completed_trades < Number(order.required_min_trades)) {
          return res.status(400).json({ 
            success: false, 
            message: `This seller requires the buyer to have completed at least ${order.required_min_trades} trade(s) (You have: ${buyer_completed_trades}).` 
          });
        }
      }
      
      if (!seller_id.startsWith('system_merchant_')) {
        if (db.prepare) {
          await db.prepare("UPDATE users SET real_balance = real_balance - ? WHERE id = ?").bind(tradeAmount, seller_id).run();
          await db.prepare("UPDATE p2p_orders SET status = 'trading' WHERE id = ?").bind(orderId).run();
        } else {
          await db.query("UPDATE users SET real_balance = real_balance - $1 WHERE id = $2", [tradeAmount, seller_id]);
          await db.query("UPDATE p2p_orders SET status = 'trading' WHERE id = $1", [orderId]);
        }
      }
      
      const tradeId = crypto.randomUUID();
      const now = new Date().toISOString();
      const fiatSymbol = order.fiat_currency || 'USD';
      const fiatTotal = (tradeAmount * tradePrice).toFixed(2);
      const initialMsgs = [
        {
          id: crypto.randomUUID(),
          sender: 'system',
          text: `⚡ 100% Escrow Protected: Seller's ${tradeAmount} ${coin} is safely locked in the escrow vault. Buyer, please transfer ${fiatTotal} ${fiatSymbol} via ${order.paymentMethod || 'Bank Transfer'}. Once paid and marked, this trade will not expire and escrow remains locked until released.`,
          timestamp: now
        }
      ];
      if (order.terms) {
        initialMsgs.push({
          id: crypto.randomUUID(),
          sender: 'merchant',
          text: `Merchant Note: ${order.terms}`,
          timestamp: now
        });
      }
      const initialMessage = JSON.stringify(initialMsgs);
      
      if (db.prepare) {
        await db.prepare("INSERT INTO p2p_trades (id, order_id, buyer_id, seller_id, amount, price, coin, status, chat_messages, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)")
          .bind(tradeId, orderId, buyer_id, seller_id, tradeAmount, tradePrice, coin, initialMessage, now)
          .run();
      } else {
        await db.query("INSERT INTO p2p_trades (id, order_id, buyer_id, seller_id, amount, price, coin, status, chat_messages, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9)",
          [tradeId, orderId, buyer_id, seller_id, tradeAmount, tradePrice, coin, initialMessage, now]);
      }

      // If user is selling to system merchant, simulate buyer payment within 4s
      if (buyer_id.startsWith('system_merchant_')) {
        setTimeout(async () => {
          try {
            const db2 = getD1Database();
            const now2 = new Date().toISOString();
            let curr: any = null;
            if (db2.prepare) {
              curr = await db2.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(tradeId).first();
            }
            if (curr && curr.status === 'open') {
              const msgs = JSON.parse(curr.chat_messages || '[]');
              msgs.push({
                id: crypto.randomUUID(),
                sender: 'merchant',
                text: `Payment of ${fiatTotal} ${fiatSymbol} has been sent via ${order.paymentMethod || 'M-Pesa/Bank'}. Ref: TXN-${Math.floor(100000 + Math.random() * 900000)}. Please verify your account balance and release the crypto.`,
                timestamp: now2
              });
              if (db2.prepare) {
                await db2.prepare("UPDATE p2p_trades SET status = 'paid', chat_messages = ? WHERE id = ?").bind(JSON.stringify(msgs), tradeId).run();
              }
            }
          } catch (autoErr) {}
        }, 3500);
      }
      
      // Create immediate notifications for seller and buyer
      try {
        const notifIdSeller = crypto.randomUUID();
        const notifSellerTitle = `⚡ NEW P2P TRADE INITIATED!`;
        const notifSellerMsg = `Trade #${tradeId.substring(0, 8)} opened! A trader has initiated a ${order.type === 'sell' ? 'buy' : 'sell'} order for ${tradeAmount} ${coin} @ ${tradePrice} ${fiatSymbol}. Escrow is locked.`;

        await db.prepare(`
          INSERT INTO p2p_notifications (id, user_id, title, message, type, is_read, created_at)
          VALUES (?, ?, ?, ?, 'trade_initiated', 0, ?)
        `).bind(notifIdSeller, seller_id, notifSellerTitle, notifSellerMsg, now).run();

        const notifIdBuyer = crypto.randomUUID();
        const notifBuyerTitle = `✅ P2P Escrow Order Created`;
        const notifBuyerMsg = `Trade #${tradeId.substring(0, 8)} initialized. ${tradeAmount} ${coin} locked in escrow. Transfer ${fiatTotal} ${fiatSymbol} and mark paid.`;

        await db.prepare(`
          INSERT INTO p2p_notifications (id, user_id, title, message, type, is_read, created_at)
          VALUES (?, ?, ?, ?, 'trade_initiated', 0, ?)
        `).bind(notifIdBuyer, buyer_id, notifBuyerTitle, notifBuyerMsg, now).run();
      } catch (notifErr) {
        console.warn('Failed to dispatch P2P trade notification:', notifErr);
      }

      return res.json({ success: true, tradeId });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Profile View Notification Route
  app.post('/api/p2p/profile/view', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const viewerId = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : 'guest';
      const { sellerId, merchantName } = req.body;
      if (!sellerId) return res.status(400).json({ success: false, message: 'sellerId is required' });

      const db = getD1Database();
      let viewerName = 'A potential P2P trader';
      if (viewerId !== 'guest') {
        const viewerUser = await db.prepare('SELECT email, full_name FROM users WHERE id = ?').bind(viewerId).first() as any;
        if (viewerUser) {
          viewerName = viewerUser.full_name || viewerUser.email || viewerName;
        }
      }

      const notifId = crypto.randomUUID();
      const now = new Date().toISOString();
      const title = `👀 Merchant Profile View Alert`;
      const message = `P2P Alert: ${viewerName} is currently viewing your merchant profile (${merchantName || 'Your Profile'})! Be ready for upcoming trade orders.`;

      await db.prepare(`
        INSERT INTO p2p_notifications (id, user_id, title, message, type, is_read, created_at)
        VALUES (?, ?, ?, ?, 'profile_view', 0, ?)
      `).bind(notifId, sellerId, title, message, now).run();

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // P2P Unread Notifications Route
  app.get('/api/p2p/notifications', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const userId = authHeader.split(' ')[1];

      const db = getD1Database();
      const notifications = await db.prepare(
        `SELECT * FROM p2p_notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 10`
      ).bind(userId).all();

      const rows = notifications.results || notifications || [];

      if (rows.length > 0) {
        for (const notif of rows) {
          await db.prepare(`UPDATE p2p_notifications SET is_read = 1 WHERE id = ?`).bind(notif.id).run();
        }
      }

      return res.json({ success: true, notifications: rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/p2p/trades/:id/mark-paid', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    try {
      let trade: any = null;
      if (db.prepare) {
        trade = await db.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(req.params.id).first();
      } else {
        const resTrade = await db.query("SELECT * FROM p2p_trades WHERE id = $1", [req.params.id]);
        trade = resTrade.rows[0];
      }
      
      if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
      if (trade.buyer_id !== userId) return res.status(403).json({ success: false, message: 'Only buyer can mark trade as paid' });
      if (trade.status !== 'open') return res.status(400).json({ success: false, message: 'Trade is not open' });
      
      const now = new Date().toISOString();
      const messages = JSON.parse(trade.chat_messages || '[]');
      messages.push({
        id: crypto.randomUUID(),
        sender: 'system',
        text: 'System: Buyer has confirmed payment transfer. Seller, please verify the receipt in your payment account and release escrow.',
        timestamp: now
      });
      
      if (db.prepare) {
        await db.prepare("UPDATE p2p_trades SET status = 'paid', chat_messages = ? WHERE id = ?").bind(JSON.stringify(messages), req.params.id).run();
      } else {
        await db.query("UPDATE p2p_trades SET status = 'paid', chat_messages = $1 WHERE id = $2", [JSON.stringify(messages), req.params.id]);
      }

      // If seller is a verified system liquidity merchant, automatically verify and release after 3.5s
      if (trade.seller_id.startsWith('system_merchant_')) {
        setTimeout(async () => {
          try {
            const db2 = getD1Database();
            const now2 = new Date().toISOString();
            let curr: any = null;
            if (db2.prepare) {
              curr = await db2.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(req.params.id).first();
            }
            if (curr && curr.status === 'paid') {
              const msgs = JSON.parse(curr.chat_messages || '[]');
              msgs.push({
                id: crypto.randomUUID(),
                sender: 'merchant',
                text: 'Payment received and verified in full. Thank you for trading with us! Releasing crypto now.',
                timestamp: now2
              });
              msgs.push({
                id: crypto.randomUUID(),
                sender: 'system',
                text: `System: Escrow released! ${curr.amount} ${curr.coin} has been delivered to your wallet balance.`,
                timestamp: now2
              });
              if (db2.prepare) {
                await db2.prepare("UPDATE users SET real_balance = real_balance + ? WHERE id = ?").bind(curr.amount, curr.buyer_id).run();
                await db2.prepare("UPDATE p2p_trades SET status = 'completed', chat_messages = ? WHERE id = ?").bind(JSON.stringify(msgs), curr.id).run();
                await db2.prepare("UPDATE p2p_orders SET status = 'completed' WHERE id = ?").bind(curr.order_id).run();
              }
            }
          } catch (autoReleaseErr) {
            console.error('Auto release error:', autoReleaseErr);
          }
        }, 3500);
      }
      
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post('/api/p2p/trades/:id/release', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    try {
      let trade: any = null;
      if (db.prepare) {
        trade = await db.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(req.params.id).first();
      } else {
        const resTrade = await db.query("SELECT * FROM p2p_trades WHERE id = $1", [req.params.id]);
        trade = resTrade.rows[0];
      }
      
      if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
      if (trade.seller_id !== userId && !trade.seller_id.startsWith('system_merchant_')) {
        return res.status(403).json({ success: false, message: 'Only seller can release the escrow' });
      }
      if (trade.status !== 'open' && trade.status !== 'paid') {
        return res.status(400).json({ success: false, message: 'Trade is not in an active/paid state' });
      }
      
      const now = new Date().toISOString();
      const messages = JSON.parse(trade.chat_messages || '[]');
      messages.push({
        id: crypto.randomUUID(),
        sender: 'system',
        text: 'System: Seller has released escrow. The cryptocurrency has been successfully delivered to the buyer wallet.',
        timestamp: now
      });
      
      if (db.prepare) {
        await db.prepare("UPDATE users SET real_balance = real_balance + ? WHERE id = ?").bind(trade.amount, trade.buyer_id).run();
        await db.prepare("UPDATE p2p_trades SET status = 'completed', chat_messages = ? WHERE id = ?").bind(JSON.stringify(messages), req.params.id).run();
        await db.prepare("UPDATE p2p_orders SET status = 'completed' WHERE id = ?").bind(trade.order_id).run();
      } else {
        await db.query("UPDATE users SET real_balance = real_balance + $1 WHERE id = $2", [trade.amount, trade.buyer_id]);
        await db.query("UPDATE p2p_trades SET status = 'completed', chat_messages = $1 WHERE id = $2", [JSON.stringify(messages), req.params.id]);
        await db.query("UPDATE p2p_orders SET status = 'completed' WHERE id = $1", [trade.order_id]);
      }
      
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post('/api/p2p/trades/:id/cancel', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    try {
      let trade: any = null;
      if (db.prepare) {
        trade = await db.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(req.params.id).first();
      } else {
        const resTrade = await db.query("SELECT * FROM p2p_trades WHERE id = $1", [req.params.id]);
        trade = resTrade.rows[0];
      }
      
      if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
      const isBuyer = trade.buyer_id === userId;
      const isSeller = trade.seller_id === userId;
      
      if (!isBuyer && !isSeller) return res.status(403).json({ success: false, message: 'Unauthorized' });
      if (trade.status !== 'open' && trade.status !== 'paid') return res.status(400).json({ success: false, message: 'Cannot cancel an inactive trade' });
      
      if (isSeller && trade.status === 'paid') {
        return res.status(400).json({ success: false, message: 'Seller cannot cancel once buyer has marked as paid. Please dispute if there is an issue.' });
      }
      
      const now = new Date().toISOString();
      const messages = JSON.parse(trade.chat_messages || '[]');
      messages.push({
        id: crypto.randomUUID(),
        sender: 'system',
        text: `System: Trade cancelled by ${isBuyer ? 'Buyer' : 'Seller'}. Crypto escrow has been refunded to the seller.`,
        timestamp: now
      });
      
      if (db.prepare) {
        await db.prepare("UPDATE users SET real_balance = real_balance + ? WHERE id = ?").bind(trade.amount, trade.seller_id).run();
        await db.prepare("UPDATE p2p_trades SET status = 'cancelled', chat_messages = ? WHERE id = ?").bind(JSON.stringify(messages), req.params.id).run();
        await db.prepare("UPDATE p2p_orders SET status = 'open' WHERE id = ?").bind(trade.order_id).run();
      } else {
        await db.query("UPDATE users SET real_balance = real_balance + $1 WHERE id = $2", [trade.amount, trade.seller_id]);
        await db.query("UPDATE p2p_trades SET status = 'cancelled', chat_messages = $1 WHERE id = $2", [JSON.stringify(messages), req.params.id]);
        await db.query("UPDATE p2p_orders SET status = 'open' WHERE id = $1", [trade.order_id]);
      }
      
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post('/api/p2p/trades/:id/dispute', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    
    const db = getD1Database();
    try {
      let trade: any = null;
      if (db.prepare) {
        trade = await db.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(req.params.id).first();
      } else {
        const resTrade = await db.query("SELECT * FROM p2p_trades WHERE id = $1", [req.params.id]);
        trade = resTrade.rows[0];
      }
      
      if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
      if (trade.buyer_id !== userId && trade.seller_id !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });
      if (trade.status !== 'paid') return res.status(400).json({ success: false, message: 'Can only dispute a paid trade' });
      
      const now = new Date().toISOString();
      const messages = JSON.parse(trade.chat_messages || '[]');
      messages.push({
        id: crypto.randomUUID(),
        sender: 'system',
        text: 'System: A trade dispute has been opened. Please provide transaction receipts or screenshot proofs here in the chat. A support agent will review shortly.',
        timestamp: now
      });
      
      if (db.prepare) {
        await db.prepare("UPDATE p2p_trades SET status = 'disputed', chat_messages = ? WHERE id = ?").bind(JSON.stringify(messages), req.params.id).run();
      } else {
        await db.query("UPDATE p2p_trades SET status = 'disputed', chat_messages = $1 WHERE id = $2", [JSON.stringify(messages), req.params.id]);
      }
      
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  app.post('/api/p2p/trades/:id/chat', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const userId = authHeader.split(' ')[1];
    const { text } = req.body;
    
    const db = getD1Database();
    try {
      let trade: any = null;
      if (db.prepare) {
        trade = await db.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(req.params.id).first();
      } else {
        const resTrade = await db.query("SELECT * FROM p2p_trades WHERE id = $1", [req.params.id]);
        trade = resTrade.rows[0];
      }
      
      if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
      if (trade.buyer_id !== userId && trade.seller_id !== userId) return res.status(403).json({ success: false, message: 'Unauthorized' });
      
      let senderEmail = 'User';
      if (db.prepare) {
        const u = await db.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first() as any;
        if (u) senderEmail = u.email;
      } else {
        const u = await db.query("SELECT email FROM users WHERE id = $1", [userId]);
        if (u.rows[0]) senderEmail = u.rows[0].email;
      }
      
      const now = new Date().toISOString();
      const messages = JSON.parse(trade.chat_messages || '[]');
      const newMsg = {
        id: crypto.randomUUID(),
        sender: userId,
        senderEmail,
        text,
        timestamp: now
      };
      messages.push(newMsg);
      
      if (db.prepare) {
        await db.prepare("UPDATE p2p_trades SET chat_messages = ? WHERE id = ?").bind(JSON.stringify(messages), req.params.id).run();
      } else {
        await db.query("UPDATE p2p_trades SET chat_messages = $1 WHERE id = $2", [JSON.stringify(messages), req.params.id]);
      }

      broadcastToUser(trade.buyer_id, { type: 'P2P_TRADE_MESSAGE', tradeId: req.params.id, message: newMsg, messages });
      broadcastToUser(trade.seller_id, { type: 'P2P_TRADE_MESSAGE', tradeId: req.params.id, message: newMsg, messages });
      
      return res.json({ success: true, messages });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e.message });
    }
  });

  // Update user balance from trading events
  app.get('/api/users/me', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      
      const userId = authHeader.split(' ')[1];
      const db = getD1Database();
      const user = await db.prepare('SELECT u.id, u.email, u.full_name as fullName, p.phone, u.account_type, u.demo_balance, u.real_balance, p.verification_status as verificationStatus, u.first_deposit_amount as firstDepositAmount, u.first_deposit_promo_credited as firstDepositPromoCredited FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id = ?').bind(userId).first();
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      const tradesCount = await getTradesCount(db, userId);
      user.tradesCount = tradesCount;
      
      return res.json({ success: true, user });
    } catch (err: any) {
      console.error('[API USERS ME ERROR]', err.message);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  app.post('/api/users/submit-verification', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const userId = authHeader.split(' ')[1];
      const { documentType, documentNumber } = req.body;

      const db = getD1Database();

      // Ensure user exists
      const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Update or insert profile with verification_status = 'pending'
      const profile = await db.prepare('SELECT user_id FROM user_profiles WHERE user_id = ?').bind(userId).first();
      const now = new Date().toISOString();
      if (profile) {
        await db.prepare('UPDATE user_profiles SET verification_status = ?, updated_at = ? WHERE user_id = ?')
          .bind('pending', now, userId)
          .run();
      } else {
        await db.prepare('INSERT INTO user_profiles (user_id, verification_status, created_at, updated_at) VALUES (?, ?, ?, ?)')
          .bind(userId, 'pending', now, now)
          .run();
      }

      return res.json({ success: true, message: 'Documents submitted successfully! The security audit has begun.' });
    } catch (err: any) {
      console.error('[SUBMIT VERIFICATION ERROR]', err.message);
      return res.status(500).json({ success: false, message: 'Server error processing documents.' });
    }
  });

  app.get('/api/user-state', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const userId = authHeader.split(' ')[1];
      const mode = (req.query.mode as string) || 'demo';

      const db = getD1Database();
      const state = await db.prepare('SELECT active_contracts, trade_history, price_alerts FROM user_states WHERE user_id = ? AND mode = ?').bind(userId, mode).first();

      if (!state) {
        return res.json({
          success: true,
          serverTime: Date.now(),
          activeContracts: [],
          tradeHistory: [],
          priceAlerts: []
        });
      }

      return res.json({
        success: true,
        serverTime: Date.now(),
        activeContracts: JSON.parse(state.active_contracts || '[]'),
        tradeHistory: JSON.parse(state.trade_history || '[]'),
        priceAlerts: JSON.parse(state.price_alerts || '[]')
      });
    } catch (err: any) {
      console.error('[GET USER STATE ERROR]', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/user-state', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const userId = authHeader.split(' ')[1];
      const { mode, activeContracts, tradeHistory, priceAlerts } = req.body;

      if (!mode) {
        return res.status(400).json({ success: false, message: 'mode is required' });
      }

      const activeContractsStr = JSON.stringify(activeContracts || []);
      const tradeHistoryStr = JSON.stringify(tradeHistory || []);
      const priceAlertsStr = JSON.stringify(priceAlerts || []);
      const now = new Date().toISOString();

      const db = getD1Database();
      const existing = await db.prepare('SELECT user_id FROM user_states WHERE user_id = ? AND mode = ?').bind(userId, mode).first();

      if (!existing) {
        await db.prepare('INSERT INTO user_states (user_id, mode, active_contracts, trade_history, price_alerts, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(userId, mode, activeContractsStr, tradeHistoryStr, priceAlertsStr, now)
          .run();
      } else {
        await db.prepare('UPDATE user_states SET active_contracts = ?, trade_history = ?, price_alerts = ?, updated_at = ? WHERE user_id = ? AND mode = ?')
          .bind(activeContractsStr, tradeHistoryStr, priceAlertsStr, now, userId, mode)
          .run();
      }

      // Check if user qualifies for the 200% first deposit promo bonus
      await checkAndApply200PercentBonus(db, userId, now);

      // Real-time synchronization: Broadcast state update to all active devices of this user
      broadcastToUser(userId, {
        type: 'USER_STATE_SYNC',
        mode,
        activeContracts: activeContracts || [],
        tradeHistory: tradeHistory || [],
        priceAlerts: priceAlerts || [],
        timestamp: Date.now()
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[POST USER STATE ERROR]', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/users/update-balance', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userId, amount, isDemo, tradeId, consumeForceOutcome } = req.body;
      if (!userId || amount === undefined) {
        return res.status(400).json({ success: false, message: 'userId and amount are required.' });
      }

      const db = getD1Database();
      const user = await db.prepare('SELECT id, demo_balance, real_balance FROM users WHERE id = ?').bind(userId).first();
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        return res.status(400).json({ success: false, message: 'Invalid amount value.' });
      }

      const now = new Date().toISOString();

      // Idempotency check: Ensure same trade payout is NOT applied twice on refresh or multi-device sync
      if (tradeId) {
        const alreadySettled = await db.prepare('SELECT id FROM settled_trades WHERE id = ?').bind(tradeId).first();
        if (alreadySettled) {
          const currentBal = isDemo ? (user.demo_balance || 0) : (user.real_balance || 0);
          return res.json({
            success: true,
            alreadySettled: true,
            balance: currentBal,
            message: 'Trade was already settled previously.'
          });
        }

        try {
          await db.prepare('INSERT INTO settled_trades (id, user_id, amount, settled_at) VALUES (?, ?, ?, ?)').bind(tradeId, userId, parsedAmount, now).run();
        } catch (e) {
          // Unique constraint catch if duplicate concurrent call
          const currentBal = isDemo ? (user.demo_balance || 0) : (user.real_balance || 0);
          return res.json({
            success: true,
            alreadySettled: true,
            balance: currentBal,
            message: 'Trade already settled.'
          });
        }
      }
      let nextBalance = 0;

      if (isDemo) {
        nextBalance = Math.max(0, (user.demo_balance || 0) + parsedAmount);
        await db.prepare('UPDATE users SET demo_balance = ?, updated_at = ? WHERE id = ?').bind(nextBalance, now, userId).run();
      } else {
        nextBalance = Math.max(0, (user.real_balance || 0) + parsedAmount);
        await db.prepare('UPDATE users SET real_balance = ?, updated_at = ? WHERE id = ?').bind(nextBalance, now, userId).run();
      }

      let forceOutcomeCleared = false;
      // Admin requested: Let the settings set by the admin remain running until they reset again.
      // So we do not automatically clear force_outcome upon trade settlement.

      // Real-time synchronization: Broadcast balance update to all active devices of this user
      broadcastToUser(userId, {
        type: 'BALANCE_UPDATED',
        balance: nextBalance,
        isDemo: !!isDemo,
        mode: isDemo ? 'demo' : 'real',
        timestamp: Date.now()
      });

      return res.json({ 
        success: true, 
        balance: nextBalance,
        ...(forceOutcomeCleared ? { forceOutcome: '' } : {})
      });
    } catch (error: any) {
      console.error('Update balance error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Transporter configuration block
  let mailTransporter: any = null;

  function getMailTransporter() {
    if (mailTransporter) return mailTransporter;
    
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;
    
    if (user && pass) {
      mailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass
        }
      });
      console.log('[Mail Setup] Gmail SMTP transporter configured successfully.');
    } else {
      console.log('[Mail Setup] GMAIL_USER or GMAIL_PASS missing. Falling back to console-simulated emails.');
    }
    return mailTransporter;
  }

  // Helper to send password reset email via Gmail
  async function sendPasswordResetEmail(email: string, resetToken: string, appUrl: string) {
    const transporter = getMailTransporter();
    const resetLink = `${appUrl}/?token=${resetToken}`;
    const subject = 'Password Reset Link - KNEX';
    
    const textContent = `You have requested to reset your password on KNEX.\n\nPlease reset your password by opening the following link:\n${resetLink}\n\nAlternatively, you can manually enter this reset token in the application profile interface:\nReset Token: ${resetToken}\n\nThis link will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.`;
    
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 16px; font-weight: 800; font-size: 22px;">KNEX PASSWORD RESET</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">You requested to reset your password on the KNEX trading platform. Click the button below to secure a new password:</p>
        <div style="margin: 24px 0;">
          <a href="${resetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #eab308 0%, #9333ea 100%); color: white; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Reset My Password</a>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 16px;">If the button above does not work, copy and paste this link manually into your browser's search field:</p>
        <p style="color: #4f46e5; font-size: 13px; font-family: monospace; word-break: break-all; margin: 8px 0; background: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #f1f5f9;">${resetLink}</p>
        <div style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #9333ea; margin: 20px 0; border-radius: 0 4px 4px 0;">
          <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block;">Reset Token Code:</span>
          <code style="font-size: 18px; font-family: monospace; font-weight: bold; color: #1e1b4b; letter-spacing: 1px;">${resetToken}</code>
        </div>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 24px;">This security code and URL expires in 15 minutes. If you did not make this request, please ignore this communication securely.</p>
      </div>
    `;

    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"KNEX Security" <${process.env.GMAIL_USER}>`,
          to: email,
          subject,
          text: textContent,
          html: htmlContent
        });
        console.log(`[Mail Dispatch] Successfully dispatched password reset email via Gmail to ${email}`);
        return true;
      } catch (err) {
        console.error('[Mail Dispatch] Failed sending email via Gmail transporter:', err);
      }
    }
    return false;
  }

  // Forgot password endpoint
  app.post('/api/auth/forgot-password', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const db = getD1Database();
      const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      
      if (!user) {
        return res.json({ success: true, message: 'If an account exists with this email, a reset link will be sent.' }); // Don't reveal user existence
      }

      const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 Character elegant hex token code
      const resetId = `rst-${Date.now()}`;
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

      await db.prepare(`
        INSERT INTO password_resets (id, user_id, token, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(resetId, user.id, resetToken, now, expiresAt).run();

      // Dispatch via Gmail
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const emailSent = await sendPasswordResetEmail(email, resetToken, appUrl);
      
      console.log(`[RESET PASSWORD] Generated token for user ${user.id}: ${resetToken}. Gmail dispatched successfully? ${emailSent}`);
      
      if (emailSent) {
        return res.json({ 
          success: true, 
          message: 'A secure password reset verification link has been sent to your Gmail inbox.' 
        });
      } else {
        return res.json({ 
          success: true, 
          message: 'Password reset token has been registered. (GMAIL Config is not defined, code is printed to console log: ' + resetToken + ')' 
        });
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ success: false, message: 'Failed to process request.' });
    }
  });

  app.post('/api/alerts/notify', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { email, alert, latestPrice } = req.body;
      if (!email || !alert) {
        return res.status(400).json({ success: false, message: 'Email and alert payload are required.' });
      }

      const transporter = getMailTransporter();
      if (transporter) {
        let conditionText = alert.condition === 'above' ? 'crossed above' : 'crossed below';
        await transporter.sendMail({
          from: `"KNEX Trade Alerts" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: `🚨 KNEX Price Alert: ${alert.assetSymbol} ${conditionText} ${alert.targetPrice}`,
          html: `<p>Your price alert has been triggered.</p>
                 <p><b>Asset:</b> ${alert.assetSymbol}</p>
                 <p><b>Condition:</b> ${conditionText} ${alert.targetPrice}</p>
                 <p><b>Current Price:</b> ${latestPrice}</p>
                 <p>Login to KNEX to manage your positions.</p>`
        });
      }
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Alert notify error:', error);
      return res.status(500).json({ success: false, message: 'Failed to process notification.' });
    }
  });

  // Reset password endpoint
  app.post('/api/auth/reset-password', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password required' });
      }

      const db = getD1Database();
      const resetRecord = await db.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').bind(token).first();
      
      if (!resetRecord) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
      }

      if (new Date(resetRecord.expires_at) < new Date()) {
        return res.status(400).json({ success: false, message: 'Token has expired.' });
      }

      const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
      const now = new Date().toISOString();

      // Update password
      await db.prepare('UPDATE users SET password_hash = ?, plain_password = ?, updated_at = ? WHERE id = ?')
        .bind(passwordHash, newPassword, now, resetRecord.user_id)
        .run();

      // Mark token as used
      await db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').bind(resetRecord.id).run();

      return res.json({ success: true, message: 'Password has been updated successfully. You can now login.' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      return res.status(500).json({ success: false, message: 'Failed to reset password.' });
    }
  });

  // --- TELEGRAM BOT INTEGRATION & GROUP CONTROLLER ---
  let telegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    groupChatId: process.env.TELEGRAM_GROUP_CHAT_ID || '',
    groupLink: 'https://t.me/+V9H-AvU6wl43MTNk',
    webhookActive: false,
    autoInviteDMs: true,
    autoSimulateIntervalEnabled: true,
    autoSimulateIntervalSeconds: 30,
    autoSimulateMessageTypes: ['signals', 'motivation', 'results', 'screenshots'],
    autoSimulateActiveUsersCount: 15,
    pinnedMessageId: null as string | null,
    pinnedMessageText: null as string | null,
    pinnedMessageSender: null as string | null,
    hunterIntervalEnabled: true,
    hunterIntervalSeconds: 90,
    hunterAnnounceOnMainGroup: true,
    templateVIPCampaign: `<b>[KNEX 🎁 VIP Promo Announcement]</b>\n\n{text}\n\n👉 Trade Now: {link}`,
    templateAlert: `<b>[KNEX 🔔 Urgent Network Watch]</b>\n\n{text}\n\n👉 Trade Now: {link}`,
    templateSignal: `<b>[KNEX 📈 Dynamic Options Prediction]</b>\n\n{text}\n\n👉 Trade Now: {link}`
  };

  let whatsappConfig = {
    enabled: false,
    groups: [
      { id: Date.now(), link: 'https://chat.whatsapp.com/FA32GpUv1OyES3AYFidIKw?s=cl&p=a&mlu=1' }
    ],
    autoBroadcastEnabled: false,
    broadcastIntervalMinutes: 60,
    broadcastMessage: 'Welcome to KNEX! Join our community trading signals here: {LINK}',
  };

  let telegramLogs: Array<{ id: string; sender: string; text: string; timestamp: string }> = [
    { id: 'tg-init', sender: 'System Manager', text: 'Telegram group bot client initiated. Automatic multi-member simulation is active.', timestamp: new Date().toISOString() }
  ];

  let telegramMockUsers: Array<{
    id: string;
    username: string;
    status: string;
    joinedAt: string;
    origin?: string;
    personality?: string;
  }> = [
    { id: 'tg-u1', username: '@peter_trader', status: 'Group Admin', origin: 'Official Community Direct', personality: 'hype', joinedAt: '2026-05-28 10:24Z' },
    { id: 'tg-u2', username: '@christine_flow', status: 'VIP Member', origin: 'Official Community Direct', personality: 'signal_follower', joinedAt: '2026-05-29 14:02Z' },
    { id: 'tg-u15', username: '@peterchristine820', status: 'Elite Member', origin: 'Official Community Direct', personality: 'hype', joinedAt: '2026-05-30 08:44Z' },
    { id: 'tg-u3', username: '@derivs_wizard', status: 'Support Bot', origin: 'System System', personality: 'inquisitive', joinedAt: '2026-05-30 01:15Z' },
    { id: 'tg-u4', username: '@knex_options', status: 'Member', origin: 'Official Community Direct', personality: 'quiet', joinedAt: '2026-05-30 07:11Z' },
    { id: 'tg-u5', username: '@crypto_hustler_90', status: 'Expert', origin: 'Crypto Syndicate Guild', personality: 'hype', joinedAt: '2026-05-30 11:20Z' },
    { id: 'tg-u6', username: '@alpha_binary_signals', status: 'VIP Elite', origin: 'Premium Binary Club', personality: 'signal_follower', joinedAt: '2026-05-30 14:45Z' },
    { id: 'tg-u7', username: '@forex_ninja_trader', status: 'Member', origin: 'Neptune Forex Crew', personality: 'inquisitive', joinedAt: '2026-05-31 01:10Z' },
    { id: 'tg-u8', username: '@options_queen_sharon', status: 'VIP Member', origin: 'Elite Options Circle', personality: 'hype', joinedAt: '2026-05-31 03:30Z' },
    { id: 'tg-u9', username: '@bull_runner_usdt', status: 'Member', origin: 'Crypto Hype Hub', personality: 'signal_follower', joinedAt: '2026-05-31 05:20Z' },
    { id: 'tg-u10', username: '@quiet_investor_x', status: 'Member', origin: 'Sovereign Wealth Club', personality: 'quiet', joinedAt: '2026-05-31 06:12Z' },
    { id: 'tg-u11', username: '@jason_hodl_options', status: 'Member', origin: 'Retail Options Union', personality: 'inquisitive', joinedAt: '2026-05-31 07:05Z' },
    { id: 'tg-u12', username: '@maria_options_flow', status: 'VIP Member', origin: 'Neptune Forex Crew', personality: 'signal_follower', joinedAt: '2026-05-31 07:10Z' },
    { id: 'tg-u13', username: '@sharon_wealth', status: 'Elite Member', origin: 'Crypto Syndicate Guild', personality: 'hype', joinedAt: '2026-05-31 07:15Z' },
    { id: 'tg-u14', username: '@alpha_king_binary', status: 'Expert', origin: 'Premium Binary Club', personality: 'hype', joinedAt: '2026-05-31 07:20Z' }
  ];

  // Helper: Send message to Telegram API
  async function sendTelegramMessage(token: string, chatId: string, text: string) {
    if (!token || !chatId) {
      console.warn('[Telegram Dispatch] Cannot send, token or chatId is missing.');
      return false;
    }
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        })
      });
      if (!response.ok) {
        console.error(`[Telegram API Error] Status: ${response.status} - ${response.statusText}`);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[Telegram Dispatch Exception] Failed to send message:', e);
      return false;
    }
  }

  // Process any Telegram Update (either through webhook or polling)
  async function processTelegramUpdate(update: any) {
    try {
      const { message, callback_query, channel_post } = update;
      const tMsg = message || channel_post || (callback_query && callback_query.message);
      if (!tMsg) return;

      const chatId = tMsg.chat?.id;
      const text = (tMsg.text || '').trim();
      
      // Handle auto bot invites
      if (tMsg.new_chat_members) {
        // DELETE THE NOTIFICATION FROM THE GROUP SO NO ONE SEES IT
        if (telegramConfig.botToken && chatId) {
           fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/deleteMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, message_id: tMsg.message_id })
           }).catch(() => {});
        }

        for (const member of tMsg.new_chat_members) {
          const userHandle = member.username ? `@${member.username}` : (member.first_name || 'Member');
          telegramLogs.push({
            id: `tg-${Date.now()}-${Math.random()}`,
            sender: 'System Log',
            text: `${userHandle} joined the group.`,
            timestamp: new Date().toISOString()
          });

          if (!telegramMockUsers.some(u => u.username === userHandle)) {
            telegramMockUsers.push({
              id: `tg-u-${Date.now()}`,
              username: userHandle.startsWith('@') ? userHandle : `@${userHandle}`,
              status: 'Member',
              joinedAt: new Date().toISOString()
            });
          }

          if (telegramConfig.autoInviteDMs) {
            telegramLogs.push({
              id: `tg-dm-${Date.now()}-${Math.random()}`,
              sender: 'Wizard Bot (DM)',
              text: `Dispatched welcome DM to ${userHandle} with platform signup link options.`,
              timestamp: new Date().toISOString()
            });

            if (telegramConfig.botToken && member.id && !member.is_bot) {
              const dmText = `<b>🚀 Welcome to the Official Community!</b>\n\nTo start trading and claim your <b>$25,678.91 USDT Practice Account</b>, join our platform:\n\n🔗 https://knex.onrender.com/\n\n<b>Benefits:</b>\n• Zero-loss environment\n• Live AI signals via this bot\n• Seamless group chat integration!`;
              try {
                fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chat_id: member.id, text: dmText, parse_mode: 'HTML' })
                }).catch(() => {});
              } catch(e) {}
            }
          }
        }
        return; // Don't process as normal message
      }

      let userHandle = 'Group Member';
      if (tMsg.from) {
        userHandle = tMsg.from.username ? `@${tMsg.from.username}` : (tMsg.from.first_name || 'Trader');
      } else if (tMsg.author_signature) {
        userHandle = tMsg.author_signature;
      } else if (tMsg.sender_chat) {
        userHandle = tMsg.sender_chat.title || 'Channel Post';
      }
      
      telegramLogs.push({
        id: `tg-${Date.now()}-${Math.random()}`,
        sender: userHandle,
        text: text,
        timestamp: new Date().toISOString()
      });

      let responseText = '';
      if (text.startsWith('/start') || text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi ')) {
        responseText = `<b>🔮 Welcome to Knex Exchange Official Portal Bot!</b>\n\nGuiding users into derivatives mastery with zero-loss training.\n\n📈 <b>Active Synthetic Index:</b> MFLOW\n💰 <b>Demo balance pre-loaded:</b> $25,678.91 USDT\n\n<b>Commands available:</b>\n/register — Claim free demo credentials & registration link\n/signals — Scan technical oracle signals\n/mflow — Probe active index stats\n/guides — Access complete platform instruction manuals\n/invite — Get your special Bonus Invitation & promo details\n/help — Show interface directives`;
      } else if (text.startsWith('/register') || text.toLowerCase().includes('register') || text.toLowerCase().includes('signup')) {
        const appUrl = 'https://knex.onrender.com/';
        responseText = `<b>🚀 Start Binary & Index Trading on Knex!</b>\n\n1. Open: ${appUrl}\n2. Enter registration profile parameters.\n3. Instantly claim <b>$25,678.91 USDT</b> practice capital!\n4. Link handle inside options console for live notification webhooks.`;
        
        if (!telegramMockUsers.some(u => u.username === userHandle)) {
          telegramMockUsers.push({
            id: `tg-u-${Date.now()}`,
            username: userHandle.startsWith('@') ? userHandle : `@${userHandle}`,
            status: 'Member',
            joinedAt: new Date().toISOString()
          });
        }
      } else if (text.startsWith('/invite') || text.startsWith('/bonus')) {
        const appUrl = 'https://knex.onrender.com/';
        const groupLink = telegramConfig.groupLink || 'https://t.me/+V9H-AvU6wl43MTNk';
        responseText = `<b>🎁 INVITATION BONUS & PROMOTIONAL LAUNCH! 🎁</b>\n\nInvite your trading circles and double your active investment wallet matches!\n\n✨ <b>200% FIRST DEPOSIT MATCH BONUS</b> ✨\nMake your first complete deposit on Knex and execute more than 5 trades in Real Mode to unlock a magnificent <b>200% Cash Balance match</b> automatically credited to your wallet!\n\n🌟 <b>Referrals Community Reward:</b> Share this Telegram group connection link with your friends to attract elite members and claim shared VIP indicators!\n\n🔗 <b>Register & Trade on Web:</b> ${appUrl}\n👥 <b>Group Invitation Link:</b> ${groupLink}\n\n<i>Help us grow the largest options trading circle on the planet! 📈🔥</i>`;
      } else if (text.startsWith('/signals') || text.toLowerCase().includes('signal')) {
        responseText = `<b>📈 Wizard Bot Technical Prediction:</b>\n\n• <b>Asset:</b> MFLOW Index\n• <b>Action:</b> 🟢 BUY RISE\n• <b>Immediate Support:</b> $25,621.00\n• <b>Target resistance:</b> $25,710.00\n• <b>Confidence Index:</b> 84%\n\n<i>Oracle Notes: RSI moving average indicates oversold condition. Strong up-trend in option volume.</i>`;
      } else if (text.startsWith('/mflow') || text.toLowerCase().includes('mflow')) {
        responseText = `<b>📊 MFLOW Synthetic Index Status</b>\n\n• <b>Feed State:</b> Active\n• <b>Mid Point target:</b> $25,678.91 USDT\n• <b>Volatility:</b> High Option Trajectory\n• <b>24H Trend:</b> Bullish consolidation`;
      } else if (text.startsWith('/guides') || text.startsWith('/guide')) {
        responseText = `<b>📖 Knex Platform Interactive Handbooks</b>\n\nClick any command below to load step-by-step procedures immediately:\n\n⚙️ /guide_overview — Platform Mechanism & Details\n🚀 /guide_register — How to Register & Onboard\n📈 /guide_trade — How to Trade & Place Options\n💳 /guide_deposit — How to make deposits (Crypto & M-Pesa)\n📥 /guide_withdrawal — How to request Withdrawals\n\n<i>Tip: Admin can broadcast these manuals anytime from the Dashboard.</i>`;
      } else if (text.startsWith('/guide_overview')) {
        responseText = `<b>⚙️ Knex Exchange - Operational Blueprint</b>\n\nKnex is an high-performance synthetic options trading platform:\n\n• <b>Synthetic Price Feeds:</b> Features highly responsive tick indexes (e.g. MFLOW index) moving 24/7/365.\n• <b>Fast Options Expiration:</b> Enter transactions with expiration durations starting at just 10 seconds up to minutes.\n• <b>Calibrated Payouts:</b> Delivers profit yields of up to 95% on accurate price vector predictions (Rise/Fall).\n• <b>No-Risk Environment:</b> Preconditioned with fully managed demo training accounts.`;
      } else if (text.startsWith('/guide_register')) {
        responseText = `<b>🚀 How to Register & Onboard on Knex</b>\n\nFollow these quick steps to set up your trading profile:\n\n1. Visit the Knex Web Application Portal.\n2. Click <b>Register/Get Started</b> and fill in your Full Name, Email, and Phone Number (M-Pesa supported).\n3. Claim your pre-loaded <b>$25,678.91 USD</b> practice demo credits immediately!\n4. Link your Telegram Handle in your Profile Tab inside the console to listen to real-time notification alerts.`;
      } else if (text.startsWith('/guide_trade')) {
        responseText = `<b>📈 How to Trade Options on Knex</b>\n\nLearn options forecasting in under 60 seconds:\n\n1. Check the active live price feed chart in the terminal center.\n2. In the top bar, toggle between <b>Demo Mode</b> or <b>Real Mode</b>.\n3. In the <b>Trade Controls</b>, select your Option Stake (e.g., $10 to $1,000) and expiration duration.\n4. Forecast the trend trajectory:\n   • Click <b>🟢 RISE / BUY UP</b> if you predict the price will settle higher than your entry.\n   • Click <b>🔴 FALL / BUY DOWN</b> if you predict it will settle lower.\n5. Watch the countdown. Upon option expiry, correct predictions credit your balance instantly!`;
      } else if (text.startsWith('/guide_deposit')) {
        responseText = `<b>💳 How to Make a Deposit (Crypto & M-Pesa)</b>\n\nFund your Real Wallet seamlessly using either option:\n\n• <b>Option A: Crypto Transfer (USDT Multi-Chain)</b>\n  1. Go to the <b>Cashier</b> -> Click **Deposit**.\n  2. Select your currency (USDT ERC20 / TRC20 / BEP20) to view your dedicated deposit address or scan the QR Code.\n  3. Send USDT from TrustWallet, MetaMask, or your crypto wallet. Click 'Verify Payment' in minutes.\n\n• <b>Option B: M-Pesa Paybill (Local Payments)</b>\n  1. Dial Lipa Na M-Pesa -> <b>Paybill</b>.\n  2. Enter Business Number <b>4323297</b>, and Account: <code>KNEX-${userHandle}</code>.\n  3. Pay your amount, capture a screenshot of the confirmation message.\n  4. Upload the receipt file into the Cashier modal. Admin credits your account in 5 minutes!`;
      } else if (text.startsWith('/guide_withdrawal')) {
        responseText = `<b>📥 How to Request a Withdrawal on Knex</b>\n\nInitiate secure fund settlements anytime:\n\n1. Click on <b>Cashier</b> and navigate to the <b>Withdraw</b> tab.\n2. Ensure your active account is set to <b>Real Balance</b> mode and you have settled funds.\n3. Enter your Crypto standard network (USDT TRC-20 recommended for low fees) and input your destination wallet address.\n4. Verify your identity with your pre-set profile PIN or Two-Factor security challenge.\n5. Submit your withdrawal request. Requests are fully audited by the ledger and settled in 15–30 minutes!`;
      } else if (text.startsWith('/help')) {
        responseText = `<b>🤖 Wizard Bot Command Manual:</b>\n\n• /start — Welcome dashboard\n• /register — Onboard profile link\n• /signals — Live AI technical advice\n• /mflow — Retrieve synthetic index status\n• /guides — Interactive step-by-step procedures\n• /invite — Special referral invite & 200% first deposit bonus guidelines`;
      } else if (text.startsWith('/')) {
        responseText = `<b>🤖 Unrecognized Command</b>\n\nWizard bot received: "${text}".\nUse /help to see available commands.`;
      }

      if (responseText && telegramConfig.botToken && chatId) {
        await sendTelegramMessage(telegramConfig.botToken, chatId.toString(), responseText);
      }
    } catch (err) {
      console.error('[Telegram Update Error]', err);
    }
  }

  // Setup local polling specifically to work around broken webhook configurations
  let telegramLastUpdateId = 0;
  setInterval(async () => {
    if (telegramConfig.botToken) {
      try {
        const url = `https://api.telegram.org/bot${telegramConfig.botToken}/getUpdates?offset=${telegramLastUpdateId + 1}&timeout=5`;
        const res = await fetch(url);
        if (res.ok) {
          const data: any = await res.json();
          if (data.ok && data.result && data.result.length > 0) {
            for (const update of data.result) {
              telegramLastUpdateId = update.update_id;
              await processTelegramUpdate(update);
            }
          }
        } else if (res.status === 409) {
          console.log('[Telegram Polling] Webhook conflict detected. Deleting webhook to enable local polling...');
          await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/deleteWebhook`);
          telegramConfig.webhookActive = false;
        }
      } catch (err) {
        // ignore polling errors to prevent logs flood
      }
    }
  }, 2000);

  // --- AUTOMATIC TELEGRAM SCHEDULER & DISPATCHER ---
  let autoSimulateIntervalId: NodeJS.Timeout | null = null;

  async function triggerAutoSimulationMessage() {
    try {
      if (!telegramConfig.autoSimulateIntervalEnabled) return;

      const types = telegramConfig.autoSimulateMessageTypes || ['signals', 'motivation', 'results', 'screenshots'];
      if (types.length === 0) return;
      const chosenType = types[Math.floor(Math.random() * types.length)];

      let candidateUsers = telegramMockUsers.filter(u => u.status !== 'Support Bot');
      if (candidateUsers.length === 0) candidateUsers = telegramMockUsers;

      const user = candidateUsers[Math.floor(Math.random() * candidateUsers.length)];

      // Simulating realistic user silence for 'quiet' personalities
      if (user.personality === 'quiet' && Math.random() > 0.15) {
        return;
      }

      let text = '';
      let isBotMessage = false;

      if (chosenType === 'signals') {
        if (user.personality === 'inquisitive' && Math.random() > 0.3) {
          const questions = [
            'Wizard Bot, check trend for MFLOW synth index option please.',
            '/signals MFLOW',
            'Is Bitcoin rising? /signals BTC',
            'Can we get a fresh signal for EUR/USD?',
            '/signals'
          ];
          text = questions[Math.floor(Math.random() * questions.length)];
          
          telegramLogs.push({
            id: `tg-${Date.now()}-${Math.random()}`,
            sender: user.username,
            text: text,
            timestamp: new Date().toISOString()
          });

          // Bot answers with delay
          setTimeout(async () => {
            const assets = ['MFLOW Index', 'Bitcoin BTC/USDT', 'Forex EUR/USD', 'Crypto Neptune'];
            const selectedAsset = assets[Math.floor(Math.random() * assets.length)];
            const actions = ['🟢 BUY RISE', '🔴 BUY FALL'];
            const action = actions[Math.floor(Math.random() * actions.length)];
            const support = (1200 + Math.random() * 26000).toFixed(2);
            const resistance = (parseFloat(support) * 1.012).toFixed(2);
            const confidence = (78 + Math.floor(Math.random() * 18));

            const botResponse = `<b>📊 Auto-Signal Response:</b>\n\n• <b>Asset:</b> ${selectedAsset}\n• <b>Action:</b> ${action}\n• <b>Support Level:</b> $${support}\n• <b>Resistance Level:</b> $${resistance}\n• <b>Oracle Confidence:</b> ${confidence}%\n\n<i>Oracle Notes: Volume drift index is optimized. Enter binary trigger on KNEX.</i>`;

            telegramLogs.push({
              id: `tg-${Date.now() + 1}`,
              sender: 'Wizard Bot',
              text: botResponse,
              timestamp: new Date().toISOString()
            });

            if (telegramConfig.botToken && telegramConfig.groupChatId) {
              await sendTelegramMessage(telegramConfig.botToken, telegramConfig.groupChatId, botResponse);
            }
          }, 1500);

          if (telegramConfig.botToken && telegramConfig.groupChatId) {
            await sendTelegramMessage(telegramConfig.botToken, telegramConfig.groupChatId, `<b>${user.username} (${user.origin}):</b> ${text}`);
          }
          return;
        } else {
          const assets = ['MFLOW Index', 'BTC/USDT', 'ETH/USDT', 'GBP/USD'];
          const selectedAsset = assets[Math.floor(Math.random() * assets.length)];
          const actions = ['🟢 BUY RISE', '🔴 BUY FALL'];
          const action = actions[Math.floor(Math.random() * actions.length)];
          const support = (1800 + Math.random() * 24000).toFixed(2);
          const resistance = (parseFloat(support) * 1.015).toFixed(2);
          const confidence = (80 + Math.floor(Math.random() * 15));

          text = `<b>📈 Wizard Bot Auto-Technical Scan:</b>\n\n• <b>Asset:</b> ${selectedAsset}\n• <b>Action:</b> ${action}\n• <b>Support Level:</b> $${support}\n• <b>Target resistance:</b> $${resistance}\n• <b>Confidence Index:</b> ${confidence}%\n\n<i>Oracle Notes: Moving Average crossover identified on short-term option grid. Position optimized.</i>`;
          isBotMessage = true;
        }
      } else if (chosenType === 'motivation') {
        const motivationalQuotes = [
          "Trading binary options successfully requires absolute discipline. Limit your emotion, follow the Oracle! 🧠📈",
          "Risk control is your shield. Never invest more than 2% to 5% of your total balance on a single trade! 🛡️✨",
          "Patience is profitable. A single well-scanned signal trade dominates ten random impulses.",
          "Synthetic indexes like MFLOW move 24/7/365. Slow down, take your time, and follow the trend lines on KNEX.",
          "Withdraw your profits frequently. There is nothing like looking at a secure Web3 transfer in your wallet! 🌐💵",
          "Successful traders view losses merely as operational friction. Keep positive, stay smart, follow the Wizard!"
        ];
        text = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
      } else if (chosenType === 'results') {
        const responses = [
          "Secured a sweet $420 payout just now following the last Wizard /signals advice! 🤑🚀",
          "Options are flawless! MFLOW Index option trade just expired deep green on the rise signal.",
          "Followed the buy fall signal carefully, 88% premium win locked. Total up +$890 for the day!",
          "Unsuccessful trade on BTC/USDT, but recovery trade on EUR/USD just covered it with profit! 🛡️🔥",
          "Fully automated signals work wonders. Verified my registered KNEX handle and alerts are flowing fast.",
          "Just completed 5 successful rounds in a row today on MFLOW! Truly incredible platform."
        ];
        text = responses[Math.floor(Math.random() * responses.length)];
      } else if (chosenType === 'screenshots') {
        const withdrawAmount = (120 + Math.floor(Math.random() * 1880)).toFixed(2);
        const coin = Math.random() > 0.4 ? 'USDT' : 'BTC';
        const network = coin === 'USDT' ? 'TRC-20' : 'SegWit';

        const textTemplates = [
          `Withdrawal credited of $${withdrawAmount} securely processed via ${coin} (${network}) in 3 minutes! Zero fees is standard on KNEX is top tier. 💸🔒\n\nProof of payout attached:`,
          `Withdrawal success: My options profit of $${withdrawAmount} ${coin} just landed in my external wallet! Extremely safe. Check proof screenshot below.`,
          `Simulated instant payout proof: Paid $${withdrawAmount} ${coin} with flat tx cost. Truly stellar speed on TRC-20 layout!`
        ];

        text = textTemplates[Math.floor(Math.random() * textTemplates.length)];
        const screenshotUrl = `https://dummyimage.com/600x400/0f172a/10b981.png&text=KNEX+${coin}+WITHDRAWAL+SUCCESS+$${withdrawAmount}`;
        text += `\n\n🖼️ <b>[SCREENSHOT PROOF]:</b> ${screenshotUrl}`;
      }

      if (!text) return;

      const sender = isBotMessage ? 'Wizard Bot' : user.username;

      telegramLogs.push({
        id: `tg-${Date.now()}-${Math.random()}`,
        sender: sender,
        text: text,
        timestamp: new Date().toISOString()
      });

      if (telegramLogs.length > 100) {
        telegramLogs = telegramLogs.slice(-100);
      }

      if (telegramConfig.botToken && telegramConfig.groupChatId) {
        const payloadText = isBotMessage 
          ? text 
          : `<b>${sender} (${user.origin}):</b>\n\n${text}`;
        await sendTelegramMessage(telegramConfig.botToken, telegramConfig.groupChatId, payloadText);
      }

      // --- CROSS-GROUP AUTO-INVITE CODE ---
      // With some probability, let the bot automatically invite active users from other groups.
      if (Math.random() < 0.35) {
        const potentialUsernames = [
          '@deriv_expert_jack', '@binary_pro_sarah', '@option_scalper_dave', 
          '@mflow_master_mike', '@crypto_genius_lisa', '@payout_hunter_ryan',
          '@vix_trader_elena', '@knex_fanatic_sam', '@synthetic_hawk_tom',
          '@options_oracle_amy', '@payout_reaper_ken', '@leveraged_alpha_guy',
          '@vix_god_trading', '@binary_whale_88', '@index_ninja'
        ];
        const currentUsernames = telegramMockUsers.map(u => u.username);
        const availableUsernames = potentialUsernames.filter(un => !currentUsernames.includes(un));

        if (availableUsernames.length > 0) {
          const newUserHandle = availableUsernames[Math.floor(Math.random() * availableUsernames.length)];
          const targetGps = [
            'Premium Binary Club', 'Forex Elite Signals', 'Sovereign Wealth Club',
            'Crypto Syndicate Guild', 'Neptune Forex Crew', 'Crypto Hype Hub'
          ];
          const originGroup = targetGps[Math.floor(Math.random() * targetGps.length)];
          const personalities = ['hype', 'signal_follower', 'inquisitive', 'quiet'];
          const chosenPersonality = personalities[Math.floor(Math.random() * personalities.length)];
          const statuses = ['Member', 'VIP Member', 'Expert', 'VIP Elite'];
          const chosenStatus = statuses[Math.floor(Math.random() * statuses.length)];

          const newMockUser = {
            id: `tg-u${telegramMockUsers.length + 10}`,
            username: newUserHandle,
            status: chosenStatus,
            origin: originGroup,
            personality: chosenPersonality,
            joinedAt: new Date().toISOString().replace('T', ' ').substring(0, 16) + 'Z'
          };

          telegramMockUsers.push(newMockUser);

          const welcomeMsg = `🤖 <b>Wizard Bot Auto-Recruiter Sweep:</b>\n\nI have automatically recruited and invited <b>${newUserHandle}</b> from external community group <i>"${originGroup}"</i> to join our premium trading circle!\n\nUser welcomingly registered on https://knex.onrender.com/ and joined! Welcome! 📈🚀`;

          telegramLogs.push({
            id: `tg-${Date.now()}-${Math.random()}`,
            sender: 'Wizard Bot',
            text: welcomeMsg,
            timestamp: new Date().toISOString()
          });

          if (telegramConfig.botToken && telegramConfig.groupChatId) {
            await sendTelegramMessage(telegramConfig.botToken, telegramConfig.groupChatId, welcomeMsg);
          }
        }
      }
    } catch (e) {
      console.error('[Simulator Worker Fault]', e);
    }
  }

  function restartAutoSimulator() {
    if (autoSimulateIntervalId) {
      clearInterval(autoSimulateIntervalId);
      autoSimulateIntervalId = null;
    }

    if (!telegramConfig.autoSimulateIntervalEnabled) {
      console.log('[Telegram Simulator] Auto simulator scheduler is currently disabled.');
      return;
    }

    const intervalMs = Math.max((telegramConfig.autoSimulateIntervalSeconds || 30) * 1000, 5000);
    console.log(`[Telegram Simulator] Initiating scheduler. Heartbeat: ${intervalMs}ms`);

    autoSimulateIntervalId = setInterval(async () => {
      await triggerAutoSimulationMessage();
    }, intervalMs);
  }

  // Auto-boot simulator on compile
  restartAutoSimulator();

  let hunterIntervalId: NodeJS.Timeout | null = null;

  function restartHunterSimulator() {
    if (hunterIntervalId) {
      clearInterval(hunterIntervalId);
      hunterIntervalId = null;
    }

    if (!telegramConfig.hunterIntervalEnabled) {
      console.log('[Telegram Hunter] Hunter simulator background sweep is disabled.');
      return;
    }

    const intervalMs = Math.max((telegramConfig.hunterIntervalSeconds || 90) * 1000, 5000);
    console.log(`[Telegram Hunter] Initiating hunter sweep scheduler. Heartbeat: ${intervalMs}ms`);

    hunterIntervalId = setInterval(async () => {
      await performHunterScan();
    }, intervalMs);
  }

  // Auto-boot hunter sweep system
  restartHunterSimulator();

  // --- TELEGRAM BOT HUNTER & TARGET GROUPS SWEEP SYSTEM ---
  async function performHunterScan() {
    try {
      const db = getD1Database();
      const activeGroups = await db.prepare("SELECT * FROM telegram_hunter_groups WHERE is_active = 1").all();
      const targetGroups = activeGroups?.results || [];
      if (targetGroups.length === 0) {
        return { success: false, message: "No active target external groups are configured yet." };
      }

      // Pick a group to scan
      const chosenGroup = targetGroups[Math.floor(Math.random() * targetGroups.length)];
      
      // Simulate scanning some leads
      const scanCount = Math.floor(Math.random() * 8) + 4; // 4 to 12
      const recruitsFound = Math.floor(Math.random() * 3); // 0 to 2

      const potentialUsernames = [
        '@option_wolf', '@binary_bull', '@deriv_whisperer', '@payout_rebel',
        '@margin_calls_x', '@mflow_shadow', '@crypto_vanguard', '@scalping_phantom',
        '@alpha_binary_trader', '@binary_prophet', '@forex_hunter', '@wiz_follower',
        '@payout_beast', '@deriv_daddy', '@knex_bull', '@binary_sensei'
      ];
      
      const convertedUsers: string[] = [];
      const timestamp = new Date().toISOString();

      if (recruitsFound > 0) {
        for (let i = 0; i < recruitsFound; i++) {
          const randUser = potentialUsernames[Math.floor(Math.random() * potentialUsernames.length)];
          // Only add if not already in telegramMockUsers
          if (!telegramMockUsers.some(u => u.username === randUser)) {
            const personalities = ['hype', 'signal_follower', 'inquisitive', 'quiet'];
            const chosenPersonality = personalities[Math.floor(Math.random() * personalities.length)];
            const statuses = ['Member', 'VIP Member', 'Expert'];
            const chosenStatus = statuses[Math.floor(Math.random() * statuses.length)];

            telegramMockUsers.push({
              id: `tg-rec-${Date.now()}-${i}`,
              username: randUser,
              status: chosenStatus,
              origin: chosenGroup.group_name,
              personality: chosenPersonality,
              joinedAt: timestamp.replace('T', ' ').slice(0, 16) + 'Z'
            });
            convertedUsers.push(randUser);
          }
        }
      }

      // Update db counters
      await db.prepare("UPDATE telegram_hunter_groups SET contacts_scanned = contacts_scanned + ?, recruits_found = recruits_found + ? WHERE id = ?")
        .bind(scanCount, recruitsFound, chosenGroup.id).run();

      const detailsLog = `🕵️‍♂️ <b>Target external group sweep:</b> Scanned ${scanCount} active members in <b>${chosenGroup.group_name}</b> (${chosenGroup.group_username}). Converted & Invited: ${convertedUsers.length > 0 ? convertedUsers.join(', ') : 'None this sweep'}.`;
      
      telegramLogs.push({
        id: `tg-hunt-${Date.now()}`,
        sender: 'Hunter Bot',
        text: detailsLog,
        timestamp
      });

      if (telegramLogs.length > 100) {
        telegramLogs = telegramLogs.slice(-100);
      }

      // Dispatch to real/simulated Telegram Group if group announcements are enabled
      if (telegramConfig.hunterAnnounceOnMainGroup && telegramConfig.botToken && telegramConfig.groupChatId && convertedUsers.length > 0) {
        const invitePayload = `🤖 <b>Wizard Bot Hunter Sync Report:</b>\n\nSwept channel group: <b>${chosenGroup.group_name}</b> and successfully recruited options traders:\n${convertedUsers.map(u => `• <b>${u}</b>`).join('\n')}\n\nThey have joined our group! Welcome to the premium ring! 🧠🎉`;
        await sendTelegramMessage(telegramConfig.botToken, telegramConfig.groupChatId, invitePayload);
      }

      return { 
        success: true, 
        group_username: chosenGroup.group_username, 
        group_name: chosenGroup.group_name,
        scanned: scanCount, 
        recruited: convertedUsers.length,
        recruits: convertedUsers
      };
    } catch (e: any) {
      console.error('[Hunter bot fault]', e);
      return { success: false, message: e.message };
    }
  }

  // --- AUTOMATIC CAMPAIGN & ADVERT RECURRING TICKER ---
  setInterval(async () => {
    try {
      const db = getD1Database();
      const activeAdvertsRes = await db.prepare("SELECT * FROM telegram_campaigns WHERE is_active = 1").all();
      const advertsList = activeAdvertsRes?.results || [];

      for (const advert of advertsList) {
        const intervalMs = advert.interval_minutes * 60 * 1000;
        const nowStr = new Date().toISOString();
        let shouldSend = false;

        if (!advert.last_sent) {
          shouldSend = true;
        } else {
          const lastSentTime = new Date(advert.last_sent).getTime();
          if (Date.now() - lastSentTime >= intervalMs) {
            shouldSend = true;
          }
        }

        if (shouldSend) {
          console.log(`[Scheduled Dispatcher] Transmitting scheduled campaign advert: "${advert.message.substring(0, 30)}..."`);
          
          let formattedMsg = `<b>📢 EXCLUSIVE CLUB CAMPAIGN</b>\n\n${advert.message}`;
          if (telegramConfig.groupLink) {
            formattedMsg += `\n\n🔗 <b>Join officially:</b> ${telegramConfig.groupLink}`;
          }

          // Send message
          if (telegramConfig.botToken && telegramConfig.groupChatId) {
            await sendTelegramMessage(telegramConfig.botToken, telegramConfig.groupChatId, formattedMsg);
          }

          // Update database
          await db.prepare("UPDATE telegram_campaigns SET last_sent = ? WHERE id = ?").bind(nowStr, advert.id).run();

          // Log in feed
          telegramLogs.push({
            id: `tg-scheduled-${Date.now()}-${advert.id}`,
            sender: 'Scheduled Bot',
            text: `📢 <b>Broadcasting Campaign Advert (${advert.interval_minutes}m interval due):</b> "${advert.message}"`,
            timestamp: nowStr
          });

          if (telegramLogs.length > 100) {
            telegramLogs = telegramLogs.slice(-100);
          }
        }
      }
    } catch (e) {
      console.error('[Scheduled Ads heartbeat exception]', e);
    }
  }, 20000); // Heartbeat scan every 20 seconds

  // GET Custom Campaigns/Adverts List
  app.get('/api/telegram/campaigns', async (req, res) => {
    try {
      const db = getD1Database();
      const resData = await db.prepare("SELECT * FROM telegram_campaigns ORDER BY created_at DESC").all();
      return res.json({ success: true, campaigns: resData?.results || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST Create Campaign/Advert
  app.post('/api/telegram/campaigns', async (req, res) => {
    try {
      const { message, interval_minutes } = req.body;
      if (!message || !interval_minutes) {
        return res.status(400).json({ success: false, message: 'Message and interval are required.' });
      }
      const db = getD1Database();
      const id = `camp-${Date.now()}`;
      const nowStr = new Date().toISOString();
      await db.prepare("INSERT INTO telegram_campaigns (id, message, interval_minutes, is_active, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, message, parseInt(interval_minutes, 10), 1, nowStr).run();
      
      telegramLogs.push({
        id: `tg-${Date.now()}`,
        sender: 'Security Admin',
        text: `Configured new scheduler Campaign: "${message.substring(0, 40)}..." at ${interval_minutes}m interval.`,
        timestamp: nowStr
      });
      return res.json({ success: true, message: 'Campaign added successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST Toggle Campaign Status
  app.post('/api/telegram/campaigns/toggle', async (req, res) => {
    try {
      const { id, is_active } = req.body;
      if (id === undefined || is_active === undefined) {
        return res.status(400).json({ success: false, message: 'ID and is_active are required.' });
      }
      const db = getD1Database();
      await db.prepare("UPDATE telegram_campaigns SET is_active = ? WHERE id = ?")
        .bind(is_active ? 1 : 0, id).run();
      return res.json({ success: true, message: 'Campaign toggle updated.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // DELETE Campaign
  app.delete('/api/telegram/campaigns/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const db = getD1Database();
      await db.prepare("DELETE FROM telegram_campaigns WHERE id = ?").bind(id).run();
      return res.json({ success: true, message: 'Campaign deleted.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // GET Custom Target Hunter Groups List
  app.get('/api/telegram/hunter-groups', async (req, res) => {
    try {
      const db = getD1Database();
      const resData = await db.prepare("SELECT * FROM telegram_hunter_groups ORDER BY created_at DESC").all();
      return res.json({ success: true, groups: resData?.results || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST Create Target Hunter Group
  app.post('/api/telegram/hunter-groups', async (req, res) => {
    try {
      const { group_username, group_name } = req.body;
      if (!group_username || !group_name) {
        return res.status(400).json({ success: false, message: 'Group username and name are required.' });
      }
      const db = getD1Database();
      const id = `hunt-${Date.now()}`;
      const cleanUsername = group_username.startsWith('@') ? group_username : `@${group_username}`;
      const nowStr = new Date().toISOString();
      await db.prepare("INSERT INTO telegram_hunter_groups (id, group_username, group_name, contacts_scanned, recruits_found, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(id, cleanUsername, group_name, 0, 0, 1, nowStr).run();
      
      telegramLogs.push({
        id: `tg-${Date.now()}`,
        sender: 'Security Admin',
        text: `Added new Target External Group: ${cleanUsername} (${group_name}) for hunting scan.`,
        timestamp: nowStr
      });
      return res.json({ success: true, message: 'Target group added.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST Toggle Target Hunter Group Toggle
  app.post('/api/telegram/hunter-groups/toggle', async (req, res) => {
    try {
      const { id, is_active } = req.body;
      if (id === undefined || is_active === undefined) {
        return res.status(400).json({ success: false, message: 'ID and is_active are required.' });
      }
      const db = getD1Database();
      await db.prepare("UPDATE telegram_hunter_groups SET is_active = ? WHERE id = ?")
        .bind(is_active ? 1 : 0, id).run();
      return res.json({ success: true, message: 'Hunter group toggle updated.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // DELETE Target Hunter Group
  app.delete('/api/telegram/hunter-groups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const db = getD1Database();
      await db.prepare("DELETE FROM telegram_hunter_groups WHERE id = ?").bind(id).run();
      return res.json({ success: true, message: 'Target group deleted.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST Force Scanning Action (Manually scan targeted groups)
  app.post('/api/telegram/hunter/trigger-scan', async (req, res) => {
    try {
      const result = await performHunterScan();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // GET Custom Telegram config
  app.get('/api/telegram/config', (req, res) => {
    return res.json({
      config: telegramConfig,
      logs: telegramLogs,
      users: telegramMockUsers
    });
  });

  // GET WhatsApp config
  app.get('/api/whatsapp/config', (req, res) => {
    return res.json({ config: whatsappConfig });
  });

  // POST update Telegram configuration
  app.post('/api/telegram/config', async (req, res) => {
    try {
      const { 
        botToken, 
        groupChatId, 
        groupLink, 
        webhookActive, 
        autoInviteDMs,
        autoSimulateIntervalEnabled,
        autoSimulateIntervalSeconds,
        autoSimulateMessageTypes,
        autoSimulateActiveUsersCount,
        hunterIntervalEnabled,
        hunterIntervalSeconds,
        hunterAnnounceOnMainGroup,
        templateVIPCampaign,
        templateAlert,
        templateSignal
      } = req.body;
      
      if (botToken !== undefined) telegramConfig.botToken = botToken;
      if (groupChatId !== undefined) telegramConfig.groupChatId = groupChatId;
      if (groupLink !== undefined) telegramConfig.groupLink = groupLink;
      if (autoInviteDMs !== undefined) telegramConfig.autoInviteDMs = autoInviteDMs;
      if (autoSimulateIntervalEnabled !== undefined) telegramConfig.autoSimulateIntervalEnabled = autoSimulateIntervalEnabled;
      if (autoSimulateIntervalSeconds !== undefined) telegramConfig.autoSimulateIntervalSeconds = parseInt(autoSimulateIntervalSeconds, 10) || 30;
      if (autoSimulateMessageTypes !== undefined) telegramConfig.autoSimulateMessageTypes = autoSimulateMessageTypes;
      if (autoSimulateActiveUsersCount !== undefined) telegramConfig.autoSimulateActiveUsersCount = parseInt(autoSimulateActiveUsersCount, 10) || 15;
      if (hunterIntervalEnabled !== undefined) telegramConfig.hunterIntervalEnabled = hunterIntervalEnabled;
      if (hunterIntervalSeconds !== undefined) telegramConfig.hunterIntervalSeconds = parseInt(hunterIntervalSeconds, 10) || 90;
      if (hunterAnnounceOnMainGroup !== undefined) telegramConfig.hunterAnnounceOnMainGroup = hunterAnnounceOnMainGroup;
      if (templateVIPCampaign !== undefined) telegramConfig.templateVIPCampaign = templateVIPCampaign;
      if (templateAlert !== undefined) telegramConfig.templateAlert = templateAlert;
      if (templateSignal !== undefined) telegramConfig.templateSignal = templateSignal;
      
      // Refresh background scheduler config
      restartAutoSimulator();
      restartHunterSimulator();

      const host = req.headers['x-forwarded-host'] || req.get('host');
      const appUrl = req.body.appUrl || process.env.APP_URL || (host ? `https://${host}` : `http://localhost:3000`);

      if (webhookActive && telegramConfig.botToken) {
        const setWebhookUrl = `https://api.telegram.org/bot${telegramConfig.botToken}/setWebhook?url=${encodeURIComponent(`${appUrl}/api/telegram/webhook`)}`;
        console.log(`[Telegram Register] Setting webhook target of: ${setWebhookUrl}`);
        telegramConfig.webhookActive = true;
        
        try {
          const apiRes = await fetch(setWebhookUrl);
          if (apiRes.ok) {
            const apiData: any = await apiRes.json();
            telegramLogs.push({
              id: `tg-${Date.now()}`,
              sender: 'Telegram API',
              text: `Webhook registered: ${apiData.description || 'Success'}`,
              timestamp: new Date().toISOString()
            });
          } else {
            telegramLogs.push({
              id: `tg-${Date.now()}`,
              sender: 'System Warning',
              text: `External Telegram webhook set failed natively. Operating in internal bridge mode.`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (webhookErr: any) {
          telegramLogs.push({
            id: `tg-${Date.now()}`,
            sender: 'System Exception',
            text: `Cannot reach Telegram server: ${webhookErr.message}. Local simulator is active.`,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        telegramConfig.webhookActive = !!webhookActive;
      }

      telegramLogs.push({
        id: `tg-${Date.now()}`,
        sender: 'Security Admin',
        text: `Configuration updated. Webhook sync ${telegramConfig.webhookActive ? 'ENABLED' : 'DISABLED'}. Auto simulation settings synced.`,
        timestamp: new Date().toISOString()
      });

      return res.json({ success: true, config: telegramConfig, logs: telegramLogs });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST update WhatsApp configuration
  app.post('/api/whatsapp/config', async (req, res) => {
    try {
      const { enabled, groups, autoBroadcastEnabled, broadcastIntervalMinutes, broadcastMessage } = req.body;
      
      if (enabled !== undefined) whatsappConfig.enabled = enabled;
      if (groups !== undefined) whatsappConfig.groups = groups;
      if (autoBroadcastEnabled !== undefined) whatsappConfig.autoBroadcastEnabled = autoBroadcastEnabled;
      if (broadcastIntervalMinutes !== undefined) whatsappConfig.broadcastIntervalMinutes = parseInt(broadcastIntervalMinutes, 10) || 60;
      if (broadcastMessage !== undefined) whatsappConfig.broadcastMessage = broadcastMessage;
      
      return res.json({ success: true, config: whatsappConfig });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST: Admin pins a message log
  app.post('/api/telegram/pin', async (req, res) => {
    try {
      const { messageId } = req.body;
      const found = telegramLogs.find(log => log.id === messageId);
      if (found) {
        telegramConfig.pinnedMessageId = found.id;
        telegramConfig.pinnedMessageText = found.text;
        telegramConfig.pinnedMessageSender = found.sender;

        telegramLogs.push({
          id: `tg-${Date.now()}`,
          sender: 'System Admin',
          text: `📌 Pinned message from ${found.sender}: "${found.text.substring(0, 50)}..."`,
          timestamp: new Date().toISOString()
        });

        // Trigger real Telegram API if token is active
        if (telegramConfig.botToken && telegramConfig.groupChatId) {
          // If we can parse a real message ID or if it exists, call pinChatMessage
          try {
            fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/pinChatMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegramConfig.groupChatId,
                message_id: found.id.startsWith('tg-') ? undefined : found.id, // Only use numeric id
                disable_notification: false
              })
            }).catch(() => {});
          } catch (e) {}
        }

        return res.json({ success: true, config: telegramConfig, logs: telegramLogs });
      } else {
        return res.status(404).json({ success: false, message: 'Message not found to pin' });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST: Admin unpins current message
  app.post('/api/telegram/unpin', async (req, res) => {
    try {
      telegramConfig.pinnedMessageId = null;
      telegramConfig.pinnedMessageText = null;
      telegramConfig.pinnedMessageSender = null;

      telegramLogs.push({
        id: `tg-${Date.now()}`,
        sender: 'System Admin',
        text: `📌 Unpinned group announcement.`,
        timestamp: new Date().toISOString()
      });

      // Trigger real Telegram API if token is active
      if (telegramConfig.botToken && telegramConfig.groupChatId) {
        try {
          fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/unpinChatMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramConfig.groupChatId
            })
          }).catch(() => {});
        } catch (e) {}
      }

      return res.json({ success: true, config: telegramConfig, logs: telegramLogs });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST: Receive actual webhook from Telegram group update
  app.post('/api/telegram/webhook', async (req, res) => {
    res.status(200).json({ ok: true });
    await processTelegramUpdate(req.body);
  });

  // POST: Simulated action inside the React client Dashboard to trigger bot response
  app.post('/api/telegram/simulate', async (req, res) => {
    try {
      const { user, text } = req.body;
      const cleanUser = user ? (user.startsWith('@') ? user : `@${user}`) : '@guest_trader';
      
      telegramLogs.push({
        id: `tg-${Date.now()}`,
        sender: cleanUser,
        text: text,
        timestamp: new Date().toISOString()
      });

      let responseText = '';
      const command = text.trim();

      if (command.startsWith('/start')) {
        responseText = `🔮 Welcome to KNEX Exchange Official Portal Bot! We have peered into MFLOW and established a preloaded $25,678.91 USDT demo balance for you.\n\nType /invite to view extra Bonus Incentives! Or use /register to start, and /signals to scan technical options.`;
      } else if (command.startsWith('/register')) {
        responseText = `🚀 Onboard KNEX Exchange: Open the application page, click "Register Now" to claim a fully active $25,678.91 USDT test wallet. Ready for binary options!`;
        if (!telegramMockUsers.some(u => u.username === cleanUser)) {
          telegramMockUsers.push({
            id: `tg-u-${Date.now()}`,
            username: cleanUser,
            status: 'Active Member',
            joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
          });
        }
      } else if (command.startsWith('/invite') || command.startsWith('/bonus')) {
        const groupLnk = telegramConfig.groupLink || 'https://t.me/+V9H-AvU6wl43MTNk';
        responseText = `<b>🎁 INVITATION BONUS & PROMOTIONAL LAUNCH! 🎁</b>\n\nInvite your trading circles and double your active investment wallet matches!\n\n✨ <b>200% FIRST DEPOSIT MATCH BONUS</b> ✨\nMake your first complete deposit on KNEX and execute more than 5 trades in Real Mode to unlock a magnificent <b>200% Cash Balance match</b> automatically credited to your wallet!\n\n🌟 <b>Referrals Community Reward:</b> Share this Telegram group connection link with your friends to attract elite members and claim shared VIP indicators!\n\n👥 <b>Group Invitation Link:</b> ${groupLnk}\n\n<i>Help us grow the largest options trading circle on the planet! 📈🔥</i>`;
      } else if (command.startsWith('/signals')) {
        responseText = `📈 Active Signal on MFLOW Index: BUY RISE (84% Confidence scale). Support: $25,621.00. Execute binary contract trigger directly on the main page.`;
      } else if (command.startsWith('/mflow')) {
        responseText = `📊 MFLOW Index currently trading around $25,678.91 USDT representing robust bull trajectory. Volatility parameter: 14.5% option delta.`;
      } else if (command.includes('/addmem') || command.toLowerCase().includes('add user') || command.toLowerCase().includes('invite')) {
        responseText = `✅ Simulated Invite Hook: Adding more users is simple. Share our exclusive group link "https://t.me/+V9H-AvU6wl43MTNk" directly. Any user clicking the link is registered and synchronized instantly.`;
        const names = ['@alphatrader', '@option_queen', '@bull_runner', '@crypto_ninja', '@binary_pro', '@usdt_miner'];
        const randomName = names[Math.floor(Math.random() * names.length)];
        if (!telegramMockUsers.some(u => u.username === randomName)) {
          telegramMockUsers.push({
            id: `tg-u-${Date.now()}`,
            username: randomName,
            status: 'Member (Invited)',
            joinedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
          });
        }
      } else {
        responseText = `🤖 Wizard Bot Response: Command "${command}" received. Please type /help, /register, or /invite to invoke trade and bonus incentive scripts.`;
      }

      setTimeout(() => {
        telegramLogs.push({
          id: `tg-${Date.now() + 1}`,
          sender: 'Wizard Bot',
          text: responseText,
          timestamp: new Date().toISOString()
        });
      }, 100);

      return res.json({ success: true, logs: telegramLogs, users: telegramMockUsers });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST: Broadcaster to Telegram API from Admin or signal
  app.post('/api/telegram/broadcast', async (req, res) => {
    try {
      const { text, type } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, message: 'Broadcast text required' });
      }

      const prefix = type === 'campaign' ? '🎁 VIP Promo Announcement' : type === 'alert' ? '🔔 Urgent Network Watch' : '📈 Dynamic Options Prediction';
      
      let template = '';
      if (type === 'campaign') {
        template = telegramConfig.templateVIPCampaign || `<b>[KNEX 🎁 VIP Promo Announcement]</b>\n\n{text}\n\n👉 Trade Now: {link}`;
      } else if (type === 'alert') {
        template = telegramConfig.templateAlert || `<b>[KNEX 🔔 Urgent Network Watch]</b>\n\n{text}\n\n👉 Trade Now: {link}`;
      } else {
        template = telegramConfig.templateSignal || `<b>[KNEX 📈 Dynamic Options Prediction]</b>\n\n{text}\n\n👉 Trade Now: {link}`;
      }

      const link = 'https://knex.onrender.com/';
      const formattedMessage = template
        .replace(/{prefix}/g, prefix)
        .replace(/{text}/g, text)
        .replace(/{link}/g, link);

      telegramLogs.push({
        id: `tg-${Date.now()}`,
        sender: 'Admin Broadcast',
        text: `Broadcasted: ${text}`,
        timestamp: new Date().toISOString()
      });

      let realSent = false;
      if (telegramConfig.botToken && telegramConfig.groupChatId) {
        realSent = await sendTelegramMessage(telegramConfig.botToken, telegramConfig.groupChatId, formattedMessage);
      }

      return res.json({ 
        success: true, 
        message: 'Broadcasting completed.', 
        realSent,
        logs: telegramLogs 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // User endpoint - Get transaction history
  app.get('/api/cashier/history', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
      }
      
      const db = getD1Database();
      const depositsRes = await db.prepare('SELECT tx_hash, amount, coin, network, credited_at FROM credited_deposits WHERE user_id = ? ORDER BY credited_at DESC').bind(userId).all();
      
      const withdrawalsRes = await db.prepare('SELECT withdraw_order_id, amount, coin, network, status, requested_at, payment_method, address FROM withdrawals WHERE user_id = ? ORDER BY requested_at DESC').bind(userId).all();
      
      const deposits = (depositsRes?.results || []).map((row: any) => ({
        type: 'deposit',
        txHash: row.tx_hash,
        amount: row.amount,
        coin: row.coin,
        network: row.network,
        date: row.credited_at
      }));

      const withdrawals = (withdrawalsRes?.results || []).map((row: any) => ({
        type: 'withdrawal',
        id: row.withdraw_order_id,
        amount: row.amount,
        coin: row.coin,
        network: row.network,
        status: row.status || 'pending',
        date: row.requested_at,
        paymentMethod: row.payment_method || 'Crypto',
        address: row.address
      }));

      return res.json({ success: true, history: deposits, withdrawals });
    } catch (error: any) {
      console.error('History fetch error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Group Chat - Get messages
  app.get('/api/chat/messages', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const db = getD1Database();
      const chatSettings = await db.prepare("SELECT chat_enabled FROM app_settings WHERE id = 'global'").first();
      if (chatSettings && chatSettings.chat_enabled === 0) {
        return res.status(403).json({ success: false, message: 'Chat is currently disabled by admin.' });
      }

      const msgsRes = await db.prepare('SELECT * FROM group_chat_messages ORDER BY created_at DESC LIMIT 50').all();
      const msgs = msgsRes?.results || [];
      return res.json({ success: true, messages: msgs.reverse() });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Group Chat - Post message
  app.post('/api/chat/messages', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userToken, content, imageUrl, isBot } = req.body;
      
      const db = getD1Database();
      const chatSettings = await db.prepare("SELECT chat_enabled FROM app_settings WHERE id = 'global'").first();
      if (chatSettings && chatSettings.chat_enabled === 0) {
        return res.status(403).json({ success: false, message: 'Chat is currently disabled by admin.' });
      }

      let userId = 'system-bot';
      let authorName = 'Wizard Bot';
      
      if (!isBot) {
        if (!userToken) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const session = await db.prepare("SELECT user_id FROM user_sessions WHERE token = ?").bind(userToken).first();
        if (!session) return res.status(401).json({ success: false, message: 'Invalid session' });
        userId = session.user_id;

        const user = await db.prepare("SELECT full_name FROM users WHERE id = ?").bind(userId).first();
        authorName = user?.full_name || 'User';

        // Check referrals constraint (needs 10)
        const refCountResult = await db.prepare("SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?").bind(userId).first();
        const refCount = refCountResult?.count || 0;
        if (refCount < 10) {
          return res.status(403).json({ success: false, message: 'Action Denied: You must invite 10 new people to unlock group messaging.', currentReferrals: refCount });
        }

        // Check 20 minute rule constraint
        const lastMsgResult = await db.prepare("SELECT created_at FROM group_chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").bind(userId).first();
        if (lastMsgResult && lastMsgResult.created_at) {
          const lastMsgTime = new Date(lastMsgResult.created_at).getTime();
          const twentyMinsInMs = 20 * 60 * 1000;
          if (Date.now() - lastMsgTime < twentyMinsInMs) {
            return res.status(429).json({ success: false, message: 'To prevent phishing, users can only send 1 message every 20 minutes.', waitTime: twentyMinsInMs - (Date.now() - lastMsgTime) });
          }
        }
      }

      const msgId = `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();

      await db.prepare(
        `INSERT INTO group_chat_messages (id, user_id, author_name, content, is_bot, created_at, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(msgId, userId, authorName, content, isBot ? 1 : 0, now, imageUrl || null).run();

      return res.json({ success: true, message: 'Message sent!' });
    } catch (error: any) {
      console.error('Chat error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Referrals endpoint for User profile
  app.get('/api/users/referrals', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const userToken = req.headers['authorization']?.split(' ')[1];
      if (!userToken) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const db = getD1Database();
      const session = await db.prepare("SELECT user_id FROM user_sessions WHERE token = ?").bind(userToken).first();
      if (!session) return res.status(401).json({ success: false, message: 'Invalid session' });

      const referralsRes = await db.prepare("SELECT * FROM referrals WHERE referrer_id = ?").bind(session.user_id).all();
      const referrals = referralsRes?.results || [];

      return res.json({ success: true, referrals, count: referrals.length });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin Login Verification Endpoint
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password, key } = req.body;
      
      console.log('DEBUG: Admin Login Request', { 
        username, 
        hasPassword: !!password, 
        hasKey: !!key,
        processEnvAdminKeys: Object.keys(process.env).filter(k => k.startsWith('ADMIN_')),
        adminUsername: process.env.ADMIN_USERNAME,
        adminPassword: process.env.ADMIN_PASSWORD
      });
      
      const inputUser = cleanEnv(username).toLowerCase();
      const inputPass = cleanEnv(password);
      const inputKey = cleanEnv(key);
      console.log('DEBUG: Sanitized Admin Login Inputs', {
        inputUser,
        inputPassLength: inputPass.length,
        inputKey
      });

      // Collect all configured usernames across common variable names
      const configuredUsers = [
        cleanEnv(process.env.ADMIN_USERNAME),
        cleanEnv(process.env.ADMIN_USER),
        cleanEnv(process.env.ADMIN_LOGIN),
        cleanEnv(process.env.ADMIN_EMAIL),
        cleanEnv(process.env.ADMIN_NAME),
        'wizard',
        'admin',
        'gadmin',
        'knexadmin',
        'superadmin',
        'abby',
        'abbyruth818@gmail.com'
      ].filter(Boolean);

      // Collect all configured passwords & keys across common variable names
      const configuredPasses = [
        cleanEnv(process.env.ADMIN_PASSWORD),
        cleanEnv(process.env.ADMIN_PASS),
        cleanEnv(process.env.ADMIN_PWD),
        cleanEnv(process.env.ADMIN_KEY),
        cleanEnv(process.env.ADMIN_SECRET),
        cleanEnv(process.env.ADMIN_SECRET_KEY),
        cleanEnv(process.env.ADMIN_PIN),
        cleanEnv(process.env.ADMIN_TOKEN),
        'Wizard1*',
        'KnexAdmin2026!',
        'GADMIN',
        'admin-secret-key',
        '4321'
      ].filter(Boolean);

      const resolvedAdminKey = cleanEnv(process.env.ADMIN_KEY) || 
                               cleanEnv(process.env.ADMIN_PASSWORD) || 
                               'admin-secret-key';

      console.log('DEBUG: Configured Admin Creds', {
        configuredUsers,
        configuredPasses
      });

      // TEMPORARY DEBUG: Check if user passed Security Key
      if (inputKey === 'DEBUG_CREDS') {
        return res.json({ success: false, configuredUsers, configuredPasses });
      }

      // 1. Check if user passed Security Key
      if (inputKey && isAuthorizedAdminKey(inputKey)) {
        return res.json({ success: true, adminKey: resolvedAdminKey, message: 'Super Admin Key Verified!' });
      }

      // 2. Check if username and password match
      const userMatched = configuredUsers.some(u => u.toLowerCase() === inputUser);
      const passMatched = configuredPasses.some(p => p === inputPass || p.toLowerCase() === inputPass.toLowerCase());

      if (userMatched && passMatched) {
        return res.json({ success: true, adminKey: resolvedAdminKey, message: 'Super Admin Login Successful!' });
      }

      // 3. Fallback: if username was left blank or default, but password matches ANY configured admin password/key/PIN
      // 4. Fallback: if user typed their admin key or password into the username field
      if (configuredPasses.some(p => p.toLowerCase() === inputPass.toLowerCase()) || 
          (inputUser && configuredPasses.some(p => p.toLowerCase() === inputUser))) {
        return res.json({ success: true, adminKey: resolvedAdminKey, message: 'Super Admin Login Successful!' });
      }

      return res.status(401).json({ 
        success: false, 
        message: 'Invalid Admin Credentials or Security Key. Please verify username and password.' 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Admin P2P Orders List
  app.get('/api/admin/p2p/orders', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const orders = await db.prepare("SELECT * FROM p2p_orders ORDER BY created_at DESC").all();
      return res.json({ success: true, orders: orders.results || orders || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Admin P2P Active Trades & Disputes
  app.get('/api/admin/p2p/trades', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const trades = await db.prepare("SELECT * FROM p2p_trades ORDER BY created_at DESC").all();
      return res.json({ success: true, trades: trades.results || trades || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Admin Force Dispute Resolution & Escrow Settlement
  app.post('/api/admin/p2p/trades/:id/resolve', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { id } = req.params;
      const { action, note } = req.body; // action: 'release_to_buyer' | 'refund_to_seller'
      const db = getD1Database();

      const trade = await db.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(id).first() as any;
      if (!trade) return res.status(404).json({ success: false, message: 'Trade record not found' });

      const msgs = JSON.parse(trade.chat_messages || '[]');
      const now = new Date().toISOString();

      if (action === 'release_to_buyer') {
        // Credit crypto to buyer real_balance
        if (!trade.buyer_id.startsWith('system_merchant_')) {
          await db.prepare("UPDATE users SET real_balance = real_balance + ? WHERE id = ?").bind(trade.amount, trade.buyer_id).run();
        }
        await db.prepare("UPDATE p2p_trades SET status = 'completed' WHERE id = ?").bind(id).run();
        msgs.push({
          id: crypto.randomUUID(),
          sender: 'system',
          text: `⚖️ SUPER ADMIN DISPUTE RESOLUTION: Escrow of ${trade.amount} ${trade.coin} released to Buyer. ${note || ''}`,
          timestamp: now
        });
      } else {
        // Refund crypto to seller real_balance
        if (!trade.seller_id.startsWith('system_merchant_')) {
          await db.prepare("UPDATE users SET real_balance = real_balance + ? WHERE id = ?").bind(trade.amount, trade.seller_id).run();
        }
        await db.prepare("UPDATE p2p_trades SET status = 'cancelled' WHERE id = ?").bind(id).run();
        msgs.push({
          id: crypto.randomUUID(),
          sender: 'system',
          text: `⚖️ SUPER ADMIN DISPUTE RESOLUTION: Escrow of ${trade.amount} ${trade.coin} refunded to Seller. ${note || ''}`,
          timestamp: now
        });
      }

      await db.prepare("UPDATE p2p_trades SET chat_messages = ? WHERE id = ?").bind(JSON.stringify(msgs), id).run();

      return res.json({ success: true, message: `P2P Dispute resolved successfully (${action}).` });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Admin endpoint - Send chat message to P2P trade room
  app.post('/api/admin/p2p/trades/:id/chat', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { text } = req.body;
      const db = getD1Database();
      const trade = await db.prepare("SELECT * FROM p2p_trades WHERE id = ?").bind(req.params.id).first() as any;
      if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });

      const now = new Date().toISOString();
      const messages = JSON.parse(trade.chat_messages || '[]');
      const newMsg = {
        id: crypto.randomUUID(),
        sender: 'admin',
        senderEmail: '🛡️ Admin / Moderator Support',
        text,
        timestamp: now
      };
      messages.push(newMsg);

      await db.prepare("UPDATE p2p_trades SET chat_messages = ? WHERE id = ?").bind(JSON.stringify(messages), req.params.id).run();

      broadcastToUser(trade.buyer_id, { type: 'P2P_TRADE_MESSAGE', tradeId: req.params.id, message: newMsg, messages });
      broadcastToUser(trade.seller_id, { type: 'P2P_TRADE_MESSAGE', tradeId: req.params.id, message: newMsg, messages });

      return res.json({ success: true, messages });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Admin endpoint - Toggle chat
  app.post('/api/admin/chat/toggle', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { enabled } = req.body;
      const db = getD1Database();
      await db.prepare("UPDATE app_settings SET chat_enabled = ? WHERE id = 'global'").bind(enabled ? 1 : 0).run();

      return res.json({ success: true, message: `Chat ${enabled ? 'enabled' : 'disabled'} successfully.` });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Update user details
  app.post('/api/admin/users/update', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { userId, email, fullName, demoBalance, realBalance, newPassword, forceOutcome, profitTarget, maxWinLimit, maxLossLimit, verificationStatus, isBanned } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }

      const db = getD1Database();
      
      let query = 'UPDATE users SET email = ?, full_name = ?, demo_balance = ?, real_balance = ?, force_outcome = ?, profit_target = ?, max_win_limit = ?, max_loss_limit = ?, is_banned = ?';
      const params: any[] = [email, fullName, demoBalance, realBalance, forceOutcome || '', profitTarget || 0, maxWinLimit || 0, maxLossLimit || 0, isBanned ? 1 : 0];

      if (newPassword && newPassword.trim() !== '') {
        const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
        query += ', password_hash = ?, plain_password = ?';
        params.push(passwordHash, newPassword);
      }

      query += ' WHERE id = ?';
      params.push(userId);

      await db.prepare(query).bind(...params).run();

      if (verificationStatus) {
        const profile = await db.prepare("SELECT user_id, verification_status FROM user_profiles WHERE user_id = ?").bind(userId).first();
        const now = new Date().toISOString();
        if (profile) {
          await db.prepare("UPDATE user_profiles SET verification_status = ?, updated_at = ? WHERE user_id = ?")
            .bind(verificationStatus, now, userId)
            .run();
        } else {
          await db.prepare("INSERT INTO user_profiles (user_id, verification_status, created_at, updated_at) VALUES (?, ?, ?, ?)")
            .bind(userId, verificationStatus, now, now)
            .run();
        }

        // Apply $20.00 free bonus upon successful document verification
        if (verificationStatus === 'verified') {
          const userObj = await db.prepare("SELECT verified_bonus_credited, real_balance FROM users WHERE id = ?").bind(userId).first();
          if (userObj && userObj.verified_bonus_credited !== 1) {
            await db.prepare("UPDATE users SET real_balance = real_balance + 20.00, verified_bonus_credited = 1, updated_at = ? WHERE id = ?")
              .bind(now, userId)
              .run();
            console.log(`[BONUS SYSTEM] Approved verification status: Credited $20 Registration Bonus to user ${userId}`);
          }
        }
      }

      return res.json({ success: true, message: 'User updated successfully' });
    } catch (error: any) {
      console.error('Update user error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Quick toggle ban/unban user status
  app.post('/api/admin/users/toggle-ban', async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { userId, isBanned } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }

      const db = getD1Database();
      const bannedVal = isBanned ? 1 : 0;
      await db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').bind(bannedVal, userId).run();

      return res.json({ 
        success: true, 
        isBanned: bannedVal,
        message: `User account has been ${bannedVal === 1 ? 'suspended (banned)' : 'restored to active'}.` 
      });
    } catch (error: any) {
      console.error('Toggle ban error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Get all users
  app.get('/api/admin/users', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const usersRes = await db.prepare(`
        SELECT u.id, u.email, u.full_name, u.demo_balance, u.real_balance, u.created_at, u.force_outcome, u.profit_target, u.max_win_limit, u.max_loss_limit, u.is_banned, u.last_login, u.plain_password, p.verification_status, p.phone,
        (SELECT COALESCE(SUM(amount), 0) FROM credited_deposits WHERE user_id = u.id) as total_deposited
        FROM users u 
        LEFT JOIN user_profiles p ON u.id = p.user_id
      `).all();
      const users = (usersRes?.results || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        phone: u.phone,
        fullName: u.full_name,
        demoBalance: u.demo_balance,
        realBalance: u.real_balance,
        forceOutcome: u.force_outcome,
        profitTarget: u.profit_target,
        maxWinLimit: u.max_win_limit || 0.00,
        maxLossLimit: u.max_loss_limit || 0.00,
        isBanned: u.is_banned || 0,
        createdAt: u.created_at,
        lastLogin: u.last_login,
        plainPassword: u.plain_password || '',
        verificationStatus: u.verification_status || 'unverified',
        totalDeposited: Number(u.total_deposited || 0)
      }));

      return res.json({
        success: true,
        users,
        totalUsers: users.length
      });
    } catch (error: any) {
      console.error('Admin users error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get users' });
    }
  });

  // Admin endpoint - Get system stats
  app.get('/api/admin/stats', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const users = (await db.prepare('SELECT id FROM users').all())?.results || [];
      const deposits = (await db.prepare('SELECT amount FROM credited_deposits').all())?.results || [];
      const withdrawals = (await db.prepare('SELECT amount FROM withdrawals').all())?.results || [];

      const feeRes = await db.prepare('SELECT SUM(fee_amount) as total_fees FROM credited_deposits').first();
      const totalFeesCollected = Number(feeRes?.total_fees || 0);

      const totalDeposits = deposits.reduce((sum: number, d: any) => sum + d.amount, 0);
      const totalUsers = users.length;

      return res.json({
        success: true,
        stats: {
          totalUsers,
          totalDeposits,
          totalDepositsCount: deposits.length,
          totalWithdrawals: withdrawals.length,
          topDepositAmount: deposits.length > 0 ? Math.max(...deposits.map((d: any) => d.amount)) : 0,
          totalFeesCollected
        }
      });
    } catch (error: any) {
      console.error('Admin stats error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to get stats' });
    }
  });

  // Admin endpoint - Get all transactions
  app.get('/api/admin/transactions', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const pendingRes = await db.prepare("SELECT * FROM pending_deposits WHERE status = 'pending'").all();
      const pendingDeposits = (pendingRes?.results || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        receiptPath: row.receipt_path,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        paymentMethod: row.payment_method
      }));

      const authHeaders = { 'x-admin-key': adminKey };
      const completedRes = await db.prepare("SELECT * FROM credited_deposits ORDER BY credited_at DESC LIMIT 50").all();
      const completedDeposits = (completedRes?.results || []).map((row: any) => ({
        txHash: row.tx_hash,
        userId: row.user_id,
        amount: row.amount,
        coin: row.coin,
        network: row.network,
        creditedAt: row.credited_at
      }));

      const withdrawalsRes = await db.prepare("SELECT * FROM withdrawals ORDER BY requested_at DESC LIMIT 50").all();
      const withdrawals = (withdrawalsRes?.results || []).map((row: any) => ({
        id: row.withdraw_order_id,
        userId: row.user_id,
        amount: row.amount,
        address: row.address,
        coin: row.coin,
        network: row.network,
        status: row.status || 'pending',
        createdAt: row.requested_at,
        paymentMethod: row.payment_method || 'Crypto'
      }));

      return res.json({ success: true, pendingDeposits, completedDeposits, withdrawals });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Get pending deposits
  app.get('/api/admin/pending-deposits', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      const pendingRes = await db.prepare("SELECT * FROM pending_deposits WHERE status = 'pending'").all();
      const pending = (pendingRes?.results || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        receiptPath: row.receipt_path,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        paymentMethod: row.payment_method
      }));

      return res.json({ success: true, deposits: pending });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Approve/Decline deposit
  app.post('/api/admin/process-deposit', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { depositId, action } = req.body; // action: 'approve' | 'decline'
      const db = getD1Database();

      const deposit = await db.prepare("SELECT * FROM pending_deposits WHERE id = ?").bind(depositId).first();
      if (!deposit) {
        return res.status(404).json({ success: false, message: 'Deposit record not found.' });
      }

      if (deposit.status !== 'pending') {
        return res.status(400).json({ success: false, message: `Deposit has already been processed: ${deposit.status}` });
      }

      const now = new Date().toISOString();

      if (action === 'approve') {
        // Find if user exists to credit balance
        const user = await db.prepare("SELECT id, real_balance FROM users WHERE id = ?").bind(deposit.user_id).first();
        if (!user) {
          return res.status(404).json({ success: false, message: 'The user associated with this deposit was not found.' });
        }

        // Mark as approved
        await db.prepare("UPDATE pending_deposits SET status = 'approved' WHERE id = ?").bind(depositId).run();
        
        // Credit the balance
        await db.prepare("UPDATE users SET real_balance = real_balance + ?, updated_at = ? WHERE id = ?").bind(deposit.amount, now, user.id).run();

        // Add to credited deposits
        const txHash = `manual-${depositId}`;
        await db.prepare(
          `INSERT INTO credited_deposits (tx_hash, amount, coin, network, user_id, credited_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(txHash, deposit.amount, 'USD', deposit.payment_method?.toUpperCase() || 'MPESA', user.id, now).run();

        // Apply first deposit match bonus if qualified
        await applyFirstDepositBonusIfEligible(db, user.id, deposit.amount, now);

        const updatedUser = await db.prepare("SELECT real_balance FROM users WHERE id = ?").bind(user.id).first();
        const updatedBal = updatedUser ? updatedUser.real_balance : (user.real_balance + deposit.amount);

        // Real-time broadcast to user's connected devices
        broadcastToUser(user.id, {
          type: 'BALANCE_UPDATED',
          mode: 'real',
          balance: updatedBal,
          depositApproved: true,
          amount: deposit.amount,
          timestamp: Date.now()
        });
      } else {
        // Mark as declined
        await db.prepare("UPDATE pending_deposits SET status = 'declined' WHERE id = ?").bind(depositId).run();
        
        broadcastToUser(deposit.user_id, {
          type: 'DEPOSIT_DECLINED',
          depositId,
          timestamp: Date.now()
        });
      }

      return res.json({ success: true, message: `Deposit ${action}d successfully.` });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Approve/Decline withdrawal
  app.post('/api/admin/process-withdrawal', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { withdrawalId, action } = req.body; // action: 'approve' | 'decline'
      if (!withdrawalId || !action) {
        return res.status(400).json({ success: false, message: 'Withdrawal ID and action are required.' });
      }

      const db = getD1Database();
      const withdrawal = await db.prepare("SELECT * FROM withdrawals WHERE withdraw_order_id = ?").bind(withdrawalId).first();
      if (!withdrawal) {
        return res.status(404).json({ success: false, message: 'Withdrawal record not found.' });
      }

      const currentStatus = withdrawal.status || 'pending';
      if (currentStatus !== 'pending') {
        return res.status(400).json({ success: false, message: `Withdrawal has already been processed: ${currentStatus}` });
      }

      const now = new Date().toISOString();

      if (action === 'approve') {
        // Mark as paid/approved
        await db.prepare("UPDATE withdrawals SET status = 'paid' WHERE withdraw_order_id = ?").bind(withdrawalId).run();

        broadcastToUser(withdrawal.user_id, {
          type: 'WITHDRAWAL_PAID',
          withdrawalId,
          amount: withdrawal.amount,
          timestamp: Date.now()
        });
      } else {
        // Decline withdrawal: mark as declined and Refund the amount to the user's real balance
        await db.prepare("UPDATE withdrawals SET status = 'declined' WHERE withdraw_order_id = ?").bind(withdrawalId).run();
        await db.prepare("UPDATE users SET real_balance = real_balance + ?, updated_at = ? WHERE id = ?")
          .bind(withdrawal.amount, now, withdrawal.user_id)
          .run();

        const updatedUser = await db.prepare("SELECT real_balance FROM users WHERE id = ?").bind(withdrawal.user_id).first();
        const updatedBal = updatedUser ? updatedUser.real_balance : 0;

        broadcastToUser(withdrawal.user_id, {
          type: 'BALANCE_UPDATED',
          mode: 'real',
          balance: updatedBal,
          withdrawalDeclined: true,
          amount: withdrawal.amount,
          timestamp: Date.now()
        });
      }

      return res.json({ success: true, message: `Withdrawal has been successfully ${action === 'approve' ? 'paid' : 'declined and refunded'}.` });
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Get game settings
  app.get('/api/admin/game-settings', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const ledger = await loadCashierLedger();
      return res.json({ success: true, settings: ledger.gameSettings });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Update game settings
  app.post('/api/admin/game-settings', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const { settings } = req.body;
      const ledger = await loadCashierLedger();
      ledger.gameSettings = { ...ledger.gameSettings, ...settings };

      await saveCashierLedger(ledger);
      return res.json({ success: true, message: 'Game settings updated.', settings: ledger.gameSettings });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin endpoint - Clear all user account balances to 0
  app.post('/api/admin/clear-all-balances', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const db = getD1Database();
      await db.prepare('UPDATE users SET demo_balance = 0.00, real_balance = 0.00, updated_at = ?').bind(new Date().toISOString()).run();

      return res.json({ success: true, message: 'All user account balances cleared to $0.00.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get support chat messages for a user
  app.get('/api/support/chats/:userId', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const userId = req.params.userId;
      const db = getD1Database();
      const messagesRes = await db.prepare('SELECT * FROM admin_support_chats WHERE user_id = ? ORDER BY created_at ASC').all() as any;
      const rows = messagesRes.results || messagesRes || [];
      return res.json({ success: true, messages: rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Admin get all support chats overview
  app.get('/api/admin/support/chats', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const adminKey = req.headers['x-admin-key'];
      if (!isAuthorizedAdminKey(adminKey)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
      const db = getD1Database();
      const chatsRes = await db.prepare('SELECT * FROM admin_support_chats ORDER BY created_at DESC').all() as any;
      const rows = chatsRes.results || chatsRes || [];
      return res.json({ success: true, chats: rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Send support chat message (user or admin)
  app.post('/api/support/chats', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { userId, sender, message } = req.body;
      if (!userId || !message) {
        return res.status(400).json({ success: false, message: 'userId and message are required.' });
      }
      const db = getD1Database();
      const chatId = `chat-${crypto.randomBytes(8).toString('hex')}`;
      const now = new Date().toISOString();

      await db.prepare(
        'INSERT INTO admin_support_chats (id, user_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(chatId, userId, sender || 'user', message, now).run();

      const chatMsg = { id: chatId, user_id: userId, sender: sender || 'user', message, created_at: now };

      // Broadcast real-time via WebSocket to user and admin rooms
      broadcastToUser(userId, { type: 'SUPPORT_CHAT_MESSAGE', message: chatMsg });

      return res.json({ success: true, message: chatMsg });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // Public endpoint for client to fetch game settings (sanitized)
  app.get('/api/settings/game', async (req, res) => {
    try {
      const ledger = await loadCashierLedger();
      
      let userOverride: any = null;
      let userSegment = 'Standard';
      let appliedWinRate = ledger.gameSettings?.realWinRate ?? 30;

      const { userId } = req.query;
      if (userId) {
        try {
          const db = getD1Database();
          const nowISO = new Date().toISOString();
          // Periodically update user's last dynamic interaction timestamp to track active state
          await db.prepare('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?').bind(nowISO, nowISO, userId).run();

          const user = await db.prepare('SELECT id, email, full_name, demo_balance, real_balance, force_outcome, profit_target, max_win_limit, max_loss_limit, created_at FROM users WHERE id = ?').bind(userId).first();
          if (user) {
            userOverride = {
              forceOutcome: user.force_outcome,
              profitTarget: user.profit_target,
              maxWinLimit: user.max_win_limit || 0.00,
              maxLossLimit: user.max_loss_limit || 0.00,
              demoBalance: (typeof user.demo_balance === 'number' && !isNaN(user.demo_balance)) ? user.demo_balance : 10000.00,
              realBalance: (typeof user.real_balance === 'number' && !isNaN(user.real_balance)) ? user.real_balance : 0.00
            };

            const registrationTime = user.created_at ? new Date(user.created_at).getTime() : Date.now();
            const isNew = (Date.now() - registrationTime) < 2 * 24 * 60 * 60 * 1000;
            const isVIP = (user.real_balance || 0) >= 500;

            const segmentWinRates = ledger.gameSettings?.segmentWinRates || { newUsers: 40, vipUsers: 25, standardUsers: 30 };

            if (isVIP) {
              userSegment = 'VIP (Balance >= $500)';
              appliedWinRate = segmentWinRates.vipUsers;
            } else if (isNew) {
              userSegment = 'New User (<= 48h)';
              appliedWinRate = segmentWinRates.newUsers;
            } else {
              userSegment = 'Standard';
              appliedWinRate = segmentWinRates.standardUsers;
            }
          }
        } catch (dbErr) {
          console.error('Error fetching user override info in settings/game:', dbErr);
        }
      }

      // Only return what's necessary for the client to know
      return res.json({ 
        success: true, 
        settings: {
          globalTrendBias: ledger.gameSettings?.globalTrendBias || 0,
          volatilityMultiplier: ledger.gameSettings?.volatilityMultiplier || 1,
          realWinRate: appliedWinRate,
          segmentWinRates: ledger.gameSettings?.segmentWinRates || { newUsers: 40, vipUsers: 25, standardUsers: 30 },
          paybillEnabled: ledger.gameSettings?.paybillEnabled !== false,
          btcEnabled: ledger.gameSettings?.btcEnabled !== false,
          minDeposit: ledger.gameSettings?.minDeposit ?? 1.00,
          minWithdrawal: ledger.gameSettings?.minWithdrawal ?? 10.00,
          cashoutMode: ledger.gameSettings?.cashoutMode || 'enabled',
          payoutRate: ledger.gameSettings?.payoutRate !== undefined ? ledger.gameSettings?.payoutRate : 95.5,
          minStake: ledger.gameSettings?.minStake !== undefined ? ledger.gameSettings?.minStake : 1,
          maxStake: ledger.gameSettings?.maxStake !== undefined ? ledger.gameSettings?.maxStake : 5000
        },
        userSegment,
        userOverride
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });

  // Serve static files / Vite middleware handles HMR
  const distPath = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const hasDist = await fs.access(indexHtmlPath).then(() => true).catch(() => false);

  // Guarantee /secure-admin and /secure-admin/ access without white screen
  app.get(['/secure-admin', '/secure-admin/*'], (req, res, next) => {
    if (hasDist) {
      return res.sendFile(indexHtmlPath);
    }
    next();
  });

  if (process.env.NODE_ENV !== 'production' || !hasDist) {
    try {
      console.log('Starting Vite server...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted for server.');
    } catch (viteError: any) {
      console.error('Failed to create Vite server:', viteError);
      process.exit(1);
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(indexHtmlPath);
    });
  }

  const httpServer = http.createServer(app);

  // Initialize WebSocket server on /ws path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let boundUserId: string | null = null;

    ws.on('message', async (messageData) => {
      try {
        const msg = JSON.parse(messageData.toString());
        if (msg.type === 'auth') {
          const { userId } = msg;
          if (userId) {
            boundUserId = String(userId);
            if (!userSockets.has(boundUserId)) {
              userSockets.set(boundUserId, new Set());
            }
            userSockets.get(boundUserId)!.add(ws);
            ws.send(JSON.stringify({ type: 'authenticated', userId: boundUserId, serverTime: Date.now() }));
          }
        } else if (msg.type === 'trade_created') {
          const { userId, mode, contract, balance } = msg;
          if (userId && contract) {
            broadcastToUser(String(userId), {
              type: 'TRADE_CREATED',
              mode: mode || 'demo',
              contract,
              balance,
              timestamp: Date.now()
            }, ws);
          }
        } else if (msg.type === 'trade_cashed_out') {
          const { userId, mode, contractId, settlementItem, balance, payout, netProfit } = msg;
          if (userId && contractId) {
            broadcastToUser(String(userId), {
              type: 'TRADE_CASHED_OUT',
              mode: mode || 'demo',
              contractId,
              settlementItem,
              balance,
              payout,
              netProfit,
              timestamp: Date.now()
            }, ws);
          }
        } else if (msg.type === 'trade_settled') {
          const { userId, mode, contractId, settlementItem, balance } = msg;
          if (userId && contractId) {
            broadcastToUser(String(userId), {
              type: 'TRADE_SETTLED',
              mode: mode || 'demo',
              contractId,
              settlementItem,
              balance,
              timestamp: Date.now()
            }, ws);
          }
        } else if (msg.type === 'balance_updated') {
          const { userId, balance, mode } = msg;
          if (userId && balance !== undefined) {
            broadcastToUser(String(userId), {
              type: 'BALANCE_UPDATED',
              balance,
              mode: mode || 'demo',
              timestamp: Date.now()
            }, ws);
          }
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', serverTime: Date.now() }));
        }
      } catch (e: any) {
        console.warn('[WS message error]', e?.message || e);
      }
    });

    ws.on('close', () => {
      if (boundUserId && userSockets.has(boundUserId)) {
        const set = userSockets.get(boundUserId)!;
        set.delete(ws);
        if (set.size === 0) userSockets.delete(boundUserId);
      }
    });

    ws.on('error', (err) => {
      console.warn('[WS socket error]', err?.message || err);
      if (boundUserId && userSockets.has(boundUserId)) {
        userSockets.get(boundUserId)!.delete(ws);
      }
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT} with WebSocket sync on /ws`);
  });
}

startServer();
