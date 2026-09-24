const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Dedicated Route for Figma UI Kit Edition
app.get('/figma', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'figma.html'));
});

// Initialize SQLite database
const dbPath = path.join(__dirname, 'feedtech_portal.sqlite');
const db = new DatabaseSync(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emp_id TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    role TEXT NOT NULL,
    permission_level TEXT NOT NULL, -- 'Standard', 'Restricted', 'Highly Confidential'
    is_admin INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active', -- 'Active', 'Inactive'
    avatar_url TEXT,
    avatar_color TEXT DEFAULT '#10b981',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS content_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT 'description',
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    department TEXT DEFAULT 'General',
    clearance_level TEXT DEFAULT 'Standard', -- 'Standard', 'Restricted', 'Highly Confidential'
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    department TEXT NOT NULL,
    category TEXT NOT NULL,
    content_type TEXT,
    permission_level TEXT NOT NULL, -- 'Standard', 'Restricted', 'Highly Confidential'
    duration TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    video_url TEXT,
    tags TEXT,
    uploaded_by TEXT,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_hidden INTEGER DEFAULT 0,
    allow_downloads INTEGER DEFAULT 1,
    enable_comments INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    progress_percent INTEGER DEFAULT 0,
    watched_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT,
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    speaker TEXT NOT NULL,
    speaker_role TEXT,
    department TEXT DEFAULT 'General',
    category TEXT DEFAULT 'Corporate Knowledge',
    content_type TEXT DEFAULT 'Corporate Event',
    clearance_level TEXT DEFAULT 'Standard',
    banner_url TEXT,
    video_url TEXT,
    status TEXT DEFAULT 'Upcoming',
    attendees_count INTEGER DEFAULT 0,
    materials_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

try { db.exec(`ALTER TABLE events ADD COLUMN category TEXT DEFAULT 'Corporate Knowledge'`); } catch (e) {}
try { db.exec(`ALTER TABLE events ADD COLUMN content_type TEXT DEFAULT 'Corporate Event'`); } catch (e) {}

// Seed Initial Events if empty
const countEvents = db.prepare("SELECT COUNT(*) as count FROM events").get();
if (countEvents.count === 0) {
  const insertEvent = db.prepare(`
    INSERT INTO events (title, description, date, time, location, speaker, speaker_role, department, clearance_level, banner_url, video_url, status, attendees_count, materials_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertEvent.run(
    'Feedtech Annual Conference 2023',
    'Pioneering the future of agricultural technology. Access all keynote sessions, technical breakouts, and executive panels from our biggest event of the year.',
    '2026-10-12',
    '09:00 - 17:00 EST',
    'Chicago, IL (Hybrid Broadcast)',
    'Dr. Jonathan Vane',
    'VP of Agricultural Biotechnology',
    'Biotech',
    'Standard',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCUOT-RGlBy4dc_4zqFbk74uA0TgJW_sMGnZrmBsNzo-Vg1QFsgQXhnbK7bcpK089bm9hkI-cC_1FQkOS0kF7lXE-DCZZxXJLiN0LbHeEmh6RckPH1MNHJIT6F7QgZ_es-R5FzJxg3Rmks4Yl4BlnVU8RhVDhz7zcVCzdJqtEcqW9i5z6IBePFYVRYFxRI4OR3dt17WLmHv5cwwTobpF_YhHjir-cixxe86wC1lETeDemWy_UOsHUbXWLvmdpdDBJZ4xxI3FOg9e6YE',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'Past',
    1240,
    'https://feedtech-my.sharepoint.com/events/2023-annual-materials.pdf'
  );
  insertEvent.run(
    'Swine Health & Precision Nutrition Symposium 2026',
    'Deep-dive into microbial gut health, immune enhancement through specialized peptides, and automated sow lactation monitoring systems.',
    '2026-03-24',
    '13:00 - 16:30 ICT',
    'Bangkok Headquarter & Live Stream',
    'Dr. Somchai Rattana',
    'Head of Swine Veterinary R&D',
    'Swine',
    'Restricted',
    'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=1200',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'Upcoming',
    340,
    'https://feedtech-my.sharepoint.com/events/swine-2026-symposium.pdf'
  );
  insertEvent.run(
    'Biotech & Cellular Agriculture Innovation Summit',
    'Exclusive symposium covering microbial fermentation for alternative protein synthesis, CRISPR gene-edited enzymes, and confidential patent roadmaps.',
    '2026-04-18',
    '10:00 - 15:00 SGT',
    'Singapore Innovation Complex',
    'Dr. Alice Smith',
    'Lead Biotech Scientist',
    'Biotech',
    'Highly Confidential',
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'Upcoming',
    85,
    'https://feedtech-my.sharepoint.com/events/biotech-summit-confidential.pdf'
  );
  insertEvent.run(
    'QC-Lab NIR Spectroscopy & Grain Assay Training',
    'Standard operating protocol training for rapid chemical assay, NIR calibration curves, and mycotoxin detection across raw material processing plants.',
    '2026-05-05',
    '09:30 - 12:00 ICT',
    'QC-Lab Central & Teams Live',
    'Karn Bunsan',
    'QC Lead Chemist',
    'QC-Lab',
    'Standard',
    'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=1200',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'Upcoming',
    215,
    'https://feedtech-my.sharepoint.com/events/qc-nir-standard.pdf'
  );
}

try {
  db.exec(`
    UPDATE events SET
      title = CASE WHEN title = 'Feedtech Annual Conference 2023' THEN 'Feedtech Annual Conference 2026' ELSE title END,
      department = CASE
        WHEN department = 'Biotech' THEN 'Research & Development (R&D)'
        WHEN department = 'Swine' THEN 'Veterinary & Animal Health'
        WHEN department = 'QC-Lab' THEN 'Quality Assurance & QC-Lab'
        ELSE department
      END,
      category = CASE
        WHEN title LIKE '%Swine%' THEN 'Swine'
        WHEN title LIKE '%Biotech%' THEN 'Biotech'
        WHEN title LIKE '%QC-Lab%' THEN 'Quality Control'
        ELSE 'Corporate Knowledge'
      END,
      content_type = CASE
        WHEN title LIKE '%Training%' THEN 'Training & Safety Protocols'
        ELSE 'Corporate Events & Symposia'
      END,
      status = CASE WHEN date < date('now') THEN 'Past' ELSE 'Upcoming' END
  `);
} catch (e) {}

// Migration: Ensure users table has is_executive_board column
try {
  db.prepare("ALTER TABLE users ADD COLUMN is_executive_board INTEGER DEFAULT 0").run();
} catch (e) {}

// Populate / Refresh Corporate Departments / Groups (17 Groups specified by P'Note)
const corporateDepartments = [
  { name: 'Biotech', code: 'BIO', icon: 'science', description: 'Biotechnology research, molecular assays, and feed innovations.' },
  { name: 'Swine', code: 'SWN', icon: 'cruelty_free', description: 'Swine nutrition science, breeding protocols, and field trials.' },
  { name: 'Aquatic', code: 'AQU', icon: 'water_drop', description: 'Aquaculture, shrimp, and fish nutrition development.' },
  { name: 'Conference', code: 'CONF', icon: 'groups', description: 'Symposiums, academic conferences, and global summit presentations.' },
  { name: 'Dairy', code: 'DRY', icon: 'water_drop', description: 'Dairy cattle nutrition, lactation trials, and milk yield.' },
  { name: 'Dairy Process', code: 'DRYP', icon: 'precision_manufacturing', description: 'Dairy processing hygiene, processing tech, and QA.' },
  { name: 'Extension Research', code: 'EXT', icon: 'biotech', description: 'Applied extension research and commercial farm trials.' },
  { name: 'Nutrition', code: 'NUT', icon: 'nutrition', description: 'Precision nutrition formulation, amino acid profiles, and feed chemistry.' },
  { name: 'Oversea', code: 'OVS', icon: 'public', description: 'International operations, exports, and overseas technical support.' },
  { name: 'Premix', code: 'PMX', icon: 'grain', description: 'Vitamin, mineral premix formulation, and additive testing.' },
  { name: 'Poultry', code: 'PLT', icon: 'egg', description: 'Broiler and layer performance, flock trials, and avian nutrition.' },
  { name: 'Raw Material', code: 'RMAT', icon: 'inventory_2', description: 'Grain commodities, quality inspection, and raw material intake.' },
  { name: 'Ruminant', code: 'RUM', icon: 'pets', description: 'Ruminant feed formulations, beef cattle trials, and forage.' },
  { name: 'Ruminant Pakthongchai', code: 'RUMP', icon: 'location_on', description: 'Pakthongchai ruminant research station and experimental farm.' },
  { name: 'Supplier', code: 'SPL', icon: 'handshake', description: 'Supplier partnerships, vendor technical audits, and ingredient sourcing.' },
  { name: 'QC-Lab', code: 'QCL', icon: 'biotech', description: 'Central laboratory quality control, spectrometry, and safety assays.' },
  { name: 'China', code: 'CHN', icon: 'language', description: 'China regional business unit and collaborative feed programs.' }
];

try {
  // Clear any old placeholders or test departments so only the 17 official Groups exist
  db.prepare("DELETE FROM departments WHERE name NOT IN ('Biotech', 'Swine', 'Aquatic', 'Conference', 'Dairy', 'Dairy Process', 'Extension Research', 'Nutrition', 'Oversea', 'Premix', 'Poultry', 'Raw Material', 'Ruminant', 'Ruminant Pakthongchai', 'Supplier', 'QC-Lab', 'China')").run();
  
  const insertDept = db.prepare("INSERT OR REPLACE INTO departments (name, code, icon, description) VALUES (?, ?, ?, ?)");
  for (const d of corporateDepartments) {
    insertDept.run(d.name, d.code, d.icon, d.description);
  }
} catch (e) {
  console.error('Error seeding corporate departments:', e.message);
}

// Seed Content Types if empty
const countCT = db.prepare("SELECT COUNT(*) as count FROM content_types").get();
if (countCT.count === 0) {
  const contentTypes = [
    ['Research & Whitepaper', 'menu_book', 'Peer-reviewed research whitepapers, cellular growth studies, and technical papers.'],
    ['Field Trials & Reports', 'analytics', 'Field trial yield benchmarks, drone canopy assessments, and commercial trial logs.'],
    ['Training & Safety Protocols', 'school', 'Employee occupational safety protocols, biosecurity training, and standard operating procedures.'],
    ['Townhall & Executive Updates', 'campaign', 'Executive leadership townhalls, strategy briefings, and company-wide updates.'],
    ['Lab Demos & Assay Procedures', 'biotech', 'Laboratory standard operating procedures, wet lab protocols, and bio-assays.'],
    ['Production & Mill Operations', 'precision_manufacturing', 'Feed milling technology, pelleting efficiency, and automated factory maintenance.'],
    ['Corporate Events & Symposia', 'event', 'Annual corporate symposia, agricultural summits, and keynote conference sessions.'],
    ['Meeting Recordings', 'groups', 'Archived team weekly standups, sprint reviews, and technical committee meetings.']
  ];
  const insertCT = db.prepare("INSERT OR IGNORE INTO content_types (name, icon, description) VALUES (?, ?, ?)");
  for (const [name, icon, desc] of contentTypes) {
    insertCT.run(name, icon, desc);
  }
}

// Ensure official Knowledge Categories (17 Categories as per specification)
const officialCategories = [
  ['Biotech', 'biotech', 'Biotechnology, molecular biology, genetic research, and formulation science.'],
  ['Swine', 'cruelty_free', 'Swine health, nursery piglet immunology, and herd biosecurity.'],
  ['Aquatic', 'water_drop', 'Shrimp and aquaculture feeding technologies and pond water chemistry.'],
  ['Conference', 'groups', 'Conferences, symposia, agricultural summits, and keynote sessions.'],
  ['Dairy', 'agriculture', 'Dairy cattle feed optimization, milk yield, and livestock health.'],
  ['Dairy Process', 'precision_manufacturing', 'Dairy processing technology, factory operations, and quality standards.'],
  ['Extension Research', 'menu_book', 'Applied extension research, trial extensions, and academic collaborations.'],
  ['Nutrition', 'nutrition', 'Animal nutrition science, nutrient metabolism, and dietary formulations.'],
  ['Oversea', 'public', 'International operations, overseas markets, and regional feed tech.'],
  ['Premix', 'grain', 'Premix formulations, micro-ingredient blending, and additive premixes.'],
  ['Poultry', 'egg', 'Broiler feed conversion, layer flock nutrition, and poultry farming.'],
  ['Raw Material', 'inventory_2', 'Raw material commodity analysis, grain procurement, and quality assay.'],
  ['Ruminant', 'pets', 'Beef cattle and ruminant forage management and rumen metabolism.'],
  ['Ruminant Pakthongchai', 'location_on', 'Ruminant feed mill trials and operations at Pakthongchai center.'],
  ['Supplier', 'handshake', 'Supplier quality audits, vendor presentations, and partner materials.'],
  ['QC-Lab', 'science', 'Quality control laboratory testing, spectrometry assays, and analysis.'],
  ['China', 'language', 'China market updates, overseas factory operations, and regional research.']
];

try {
  db.prepare("DELETE FROM categories").run();
  const insertCat = db.prepare("INSERT INTO categories (name, icon, description) VALUES (?, ?, ?)");
  for (const [name, icon, desc] of officialCategories) {
    insertCat.run(name, icon, desc);
  }
} catch (e) {
  console.error('Error syncing categories:', e.message);
}

// Update existing users to have authentic Departments and is_executive_board
try {
  db.prepare("UPDATE users SET department = 'Biotech' WHERE name LIKE '%Thanawat%' OR name LIKE '%Alice%'").run();
  db.prepare("UPDATE users SET department = 'Swine' WHERE name LIKE '%Somchai%'").run();
  db.prepare("UPDATE users SET department = 'Aquatic' WHERE name LIKE '%Ananya%'").run();
  db.prepare("UPDATE users SET department = 'QC-Lab' WHERE name LIKE '%Maria Wong%' OR name LIKE '%Lisa Chen%'").run();
  db.prepare("UPDATE users SET department = 'Dairy' WHERE name LIKE '%John Doe%'").run();
  db.prepare("UPDATE users SET department = 'Raw Material' WHERE name LIKE '%David Miller%'").run();
  db.prepare("UPDATE users SET department = 'Nutrition' WHERE name LIKE '%James Wilson%'").run();
  db.prepare("UPDATE users SET department = 'Biotech' WHERE department NOT IN ('Biotech', 'Swine', 'Aquatic', 'Conference', 'Dairy', 'Dairy Process', 'Extension Research', 'Nutrition', 'Oversea', 'Premix', 'Poultry', 'Raw Material', 'Ruminant', 'Ruminant Pakthongchai', 'Supplier', 'QC-Lab', 'China')").run();
} catch (e) {
  console.error('Error migrating user departments:', e.message);
}

// Seed Users if empty
const countUsers = db.prepare("SELECT COUNT(*) as count FROM users").get();
if (countUsers.count === 0) {
  const users = [
    {
      emp_id: 'EMP-1001',
      name: 'Dr. Alice Smith',
      email: 'a.smith@feedtech.com',
      department: 'Biotech',
      role: 'Lead Scientist',
      permission_level: 'Highly Confidential',
      is_admin: 0,
      status: 'Active',
      avatar_color: '#006c49'
    },
    {
      emp_id: 'EMP-1042',
      name: 'John Doe',
      email: 'j.doe@feedtech.com',
      department: 'Operations',
      role: 'Facility Manager',
      permission_level: 'Restricted',
      is_admin: 0,
      status: 'Active',
      avatar_color: '#2563eb'
    },
    {
      emp_id: 'EMP-0882',
      name: 'Maria Wong',
      email: 'm.wong@feedtech.com',
      department: 'QC-Lab',
      role: 'Senior Chemist',
      permission_level: 'Restricted',
      is_admin: 0,
      status: 'Active',
      avatar_color: '#d97706'
    },
    {
      emp_id: 'EMP-3011',
      name: 'Somchai Prasert',
      email: 's.prasert@feedtech.com',
      department: 'Swine',
      role: 'Swine Specialist',
      permission_level: 'Restricted',
      is_admin: 0,
      status: 'Active',
      avatar_color: '#db2777'
    },
    {
      emp_id: 'EMP-4099',
      name: 'Ananya Srisuk',
      email: 'a.srisuk@feedtech.com',
      department: 'Poultry',
      role: 'Poultry Nutritionist',
      permission_level: 'Standard',
      is_admin: 0,
      status: 'Active',
      avatar_color: '#7c3aed'
    },
    {
      emp_id: 'EMP-5501',
      name: 'David Miller',
      email: 'd.miller@feedtech.com',
      department: 'Raw Material',
      role: 'Procurement Officer',
      permission_level: 'Standard',
      is_admin: 0,
      status: 'Active',
      avatar_color: '#059669'
    },
    {
      emp_id: 'EMP-9999',
      name: 'Kittisak Tech (Admin)',
      email: 'admin@feedtech.com',
      department: 'Executive',
      role: 'System Administrator',
      permission_level: 'Highly Confidential',
      is_admin: 1,
      status: 'Active',
      avatar_color: '#10b981'
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (emp_id, name, email, department, role, permission_level, is_admin, status, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of users) {
    insertUser.run(u.emp_id, u.name, u.email, u.department, u.role, u.permission_level, u.is_admin, u.status, u.avatar_color);
  }
}

// Seed Tags if empty
const countTags = db.prepare("SELECT COUNT(*) as count FROM tags").get();
if (countTags.count === 0) {
  const initialTags = [
    { name: '#biotech', department: 'Biotech', clearance_level: 'Highly Confidential', description: 'Advanced biotechnology, metabolic pathways, and strain engineering' },
    { name: '#cellular', department: 'Biotech', clearance_level: 'Highly Confidential', description: 'Cell culture, fermentation kinetics, and protein synthesis' },
    { name: '#genetics', department: 'Biotech', clearance_level: 'Highly Confidential', description: 'Gene editing, CRISPR, and genomic sequencing datasets' },
    { name: '#swine', department: 'Swine', clearance_level: 'Restricted', description: 'Swine herd management, breeding trials, and field health' },
    { name: '#nutrition', department: 'Swine', clearance_level: 'Restricted', description: 'Feed formulation algorithms and amino acid balance' },
    { name: '#poultry', department: 'Poultry', clearance_level: 'Standard', description: 'Broiler and layer nutrition and housing management' },
    { name: '#biosecurity', department: 'Regulatory', clearance_level: 'Restricted', description: 'Farm pathogen barrier protocols and disease quarantine' },
    { name: '#scada', department: 'Automation', clearance_level: 'Restricted', description: 'SCADA sensor telemetry, PLC control, and automated mill systems' },
    { name: '#safety', department: 'Safety & Env', clearance_level: 'Standard', description: 'Occupational safety and chemical handling standards' },
    { name: '#rawmaterial', department: 'Raw Material', clearance_level: 'Standard', description: 'Grain, corn, and soybean meal procurement index' },
    { name: '#qclab', department: 'QC-Lab', clearance_level: 'Restricted', description: 'Chemical spectrometry and chromatography assay procedures' },
    { name: '#confidential', department: 'Executive', clearance_level: 'Highly Confidential', description: 'Executive board strategy, patents, and confidential IP' },
    { name: '#general', department: 'General', clearance_level: 'Standard', description: 'Company-wide knowledge and standard orientations' },
    { name: '#standard', department: 'General', clearance_level: 'Standard', description: 'Open employee educational catalog' }
  ];

  const insertTag = db.prepare(`
    INSERT INTO tags (name, department, clearance_level, description)
    VALUES (?, ?, ?, ?)
  `);
  for (const t of initialTags) {
    insertTag.run(t.name, t.department, t.clearance_level, t.description);
  }
}

// Seed Videos if empty
const countVideos = db.prepare("SELECT COUNT(*) as count FROM videos").get();
if (countVideos.count === 0) {
  const sampleVideos = [
    {
      video_id: 'VID-8921',
      title: 'Q3 Drone Survey Analysis & Precision Yield Modeling',
      description: 'Detailed analysis of the Q3 drone flyover data across Southeast Asian crop sectors. Includes multispectral imaging breakdown, preliminary moisture metrics, and algorithmic yield estimates.',
      department: 'Biotech',
      category: 'Research & Whitepaper',
      permission_level: 'Highly Confidential',
      duration: '12:04',
      views: 1420,
      likes: 88,
      thumbnail_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      tags: '#drones, #yield, #biotech, #precision-ag',
      uploaded_by: 'Dr. Alice Smith',
      uploaded_at: '2026-08-24 10:30:00'
    },
    {
      video_id: 'VID-8920',
      title: 'QC-Lab Safety Protocols & Chemical Spectrometry 2026',
      description: 'Official annual quality and safety standards for spectrometry instrumentation, chromatography maintenance, and hazardous reagent storage in all regional Feedtech QC labs.',
      department: 'QC-Lab',
      category: 'Training & Safety Protocols',
      permission_level: 'Standard',
      duration: '45:10',
      views: 3250,
      likes: 210,
      thumbnail_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      tags: '#safety, #laboratory, #spectrometry, #protocols',
      uploaded_by: 'Maria Wong',
      uploaded_at: '2026-08-22 14:15:00'
    },
    {
      video_id: 'VID-8919',
      title: 'New Silo Automated Control Panel Operating Tour',
      description: 'Walkthrough of the newly installed SCADA sensor dashboards, emergency ventilation controls, and automated temperature regulation systems at the main feed terminal.',
      department: 'Operations',
      category: 'Production & Mill Operations',
      permission_level: 'Restricted',
      duration: '05:30',
      views: 640,
      likes: 42,
      thumbnail_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      tags: '#facilities, #silo, #operations, #automation',
      uploaded_by: 'John Doe',
      uploaded_at: '2026-08-20 09:00:00'
    },
    {
      video_id: 'VID-8918',
      title: 'Pathogen Resistance Protocols in New Swine Breeds',
      description: 'Comprehensive epidemiological field trial report examining gut biome resilience and probiotic feed additives in third-generation swine breeds.',
      department: 'Swine',
      category: 'Field Trials & Reports',
      permission_level: 'Restricted',
      duration: '18:45',
      views: 1205,
      likes: 95,
      thumbnail_url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      tags: '#swine, #pathogen, #feed-formula, #genetics',
      uploaded_by: 'Somchai Prasert',
      uploaded_at: '2026-08-19 16:45:00'
    },
    {
      video_id: 'VID-8917',
      title: 'Poultry Layer Facility Smart Automation Setup Guide v2',
      description: 'Step-by-step engineering guidelines for commissioning automated egg collection conveyors, infrared climate adjusters, and robotic feeding lines.',
      department: 'Poultry',
      category: 'Production & Mill Operations',
      permission_level: 'Standard',
      duration: '08:45',
      views: 890,
      likes: 67,
      thumbnail_url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      tags: '#poultry, #automation, #layers, #engineering',
      uploaded_by: 'Ananya Srisuk',
      uploaded_at: '2026-08-18 11:20:00'
    },
    {
      video_id: 'VID-8916',
      title: 'Understanding Cellular Growth Rates in Premium Feed',
      description: 'Microscopic and metabolic evaluation of cellular protein synthesis under varied micro-mineral concentrations. Proprietary patent-pending formula research.',
      department: 'Biotech',
      category: 'Research & Whitepaper',
      permission_level: 'Highly Confidential',
      duration: '22:10',
      views: 3400,
      likes: 290,
      thumbnail_url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      tags: '#biotech, #metabolism, #cellular, #confidential',
      uploaded_by: 'Dr. Alice Smith',
      uploaded_at: '2026-08-15 08:30:00'
    },
    {
      video_id: 'VID-8915',
      title: 'Global Raw Material Supply Outlook & Risk Mitigation',
      description: 'Quarterly macro-economic analysis on soybean meal, corn futures, and shipping lane logistics across the Pacific trade corridor.',
      department: 'Raw Material',
      category: 'Townhall & Executive Updates',
      permission_level: 'Standard',
      duration: '31:15',
      views: 2150,
      likes: 140,
      thumbnail_url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      tags: '#procurement, #supplychain, #logistics, #commodities',
      uploaded_by: 'David Miller',
      uploaded_at: '2026-08-12 13:00:00'
    },
    {
      video_id: 'VID-8914',
      title: 'Aquatic Shrimp Feed Pellet Stability & Water Dissolution Trials',
      description: 'Experimental testing of water-stable binder compounds in saltwater shrimp diets to prevent nutrient leaching and optimize FCR (Feed Conversion Ratio).',
      department: 'Aquatic',
      category: 'Field Trials & Reports',
      permission_level: 'Restricted',
      duration: '14:20',
      views: 980,
      likes: 74,
      thumbnail_url: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      tags: '#aquatic, #shrimp, #pellet, #fcr',
      uploaded_by: 'Somchai Prasert',
      uploaded_at: '2026-08-10 15:10:00'
    },
    {
      video_id: 'VID-8913',
      title: 'Dairy Process Micro-filtration and Ultra-pasteurization Specs',
      description: 'Technical specs for high-efficiency temperature-controlled membrane filtration in milk separation lines.',
      department: 'Dairy Process',
      category: 'Production & Mill Operations',
      permission_level: 'Restricted',
      duration: '19:50',
      views: 730,
      likes: 51,
      thumbnail_url: 'https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
      tags: '#dairy, #pasteurization, #membrane, #processing',
      uploaded_by: 'John Doe',
      uploaded_at: '2026-08-05 11:00:00'
    },
    {
      video_id: 'VID-8912',
      title: 'China Regional Feed Market Strategy & High-Density Facilities',
      description: 'Executive briefing on modern multi-story swine farming facilities and automated feed distribution networks across Northern China.',
      department: 'China',
      category: 'Townhall & Executive Updates',
      permission_level: 'Highly Confidential',
      duration: '28:40',
      views: 1100,
      likes: 95,
      thumbnail_url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      tags: '#china, #strategy, #executive, #confidential',
      uploaded_by: 'Kittisak Tech (Admin)',
      uploaded_at: '2026-08-01 09:30:00'
    }
  ];

  const insertVideo = db.prepare(`
    INSERT INTO videos (video_id, title, description, department, category, permission_level, duration, views, likes, thumbnail_url, video_url, tags, uploaded_by, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const v of sampleVideos) {
    insertVideo.run(v.video_id, v.title, v.description, v.department, v.category, v.permission_level, v.duration, v.views, v.likes, v.thumbnail_url, v.video_url, v.tags, v.uploaded_by, v.uploaded_at);
  }
}

// Seed Audit Logs if empty
const countLogs = db.prepare("SELECT COUNT(*) as count FROM audit_logs").get();
if (countLogs.count === 0) {
  const initialLogs = [
    { actor_name: 'Kittisak Tech (Admin)', actor_role: 'System Administrator', action: 'USER_ROLE_UPDATE', target: 'Alice Smith (EMP-1001)', details: 'Upgraded permission level to Highly Confidential for Biotech projects.' },
    { actor_name: 'Maria Wong', actor_role: 'Senior Chemist', action: 'VIDEO_METADATA_EDIT', target: 'VID-8920', details: 'Updated lab safety compliance policies and duration.' },
    { actor_name: 'Dr. Alice Smith', actor_role: 'Lead Scientist', action: 'VIDEO_UPLOAD', target: 'VID-8921', details: 'Uploaded Q3 Drone Survey Analysis with Highly Confidential classification.' },
    { actor_name: 'John Doe', actor_role: 'Facility Manager', action: 'PERMISSION_POLICY_CHECK', target: 'Operations Portal', details: 'Automated policy sync for Operations department members.' }
  ];
  const insertLog = db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)");
  for (const l of initialLogs) {
    insertLog.run(l.actor_name, l.actor_role, l.action, l.target, l.details);
  }
}

// Ensure allowed_tags column exists
try {
  db.exec(`ALTER TABLE users ADD COLUMN allowed_tags TEXT DEFAULT '#general, #standard';`);
} catch (e) {}

// Keep video taxonomy fields separate from organizational departments.
try {
  db.exec(`ALTER TABLE videos ADD COLUMN content_type TEXT`);
  db.exec(`UPDATE videos SET content_type = category WHERE content_type IS NULL`);
  db.exec(`
    UPDATE videos
    SET category = CASE department
      WHEN 'China' THEN 'Commodity'
      ELSE department
    END,
    department = CASE department
      WHEN 'Biotech' THEN 'Research & Development (R&D)'
      WHEN 'Swine' THEN 'Veterinary & Animal Health'
      WHEN 'Poultry' THEN 'Veterinary & Animal Health'
      WHEN 'Aquatic' THEN 'Veterinary & Animal Health'
      WHEN 'Dairy Process' THEN 'Feed Mill Operations'
      WHEN 'Operations' THEN 'Feed Mill Operations'
      WHEN 'Automation' THEN 'Information Technology & Digital'
      WHEN 'QC-Lab' THEN 'Quality Assurance & QC-Lab'
      WHEN 'Commodity' THEN 'Supply Chain & Procurement'
      WHEN 'China' THEN 'Supply Chain & Procurement'
      ELSE department
    END
    WHERE content_type IS NOT NULL
  `);
} catch (e) {
  try { db.prepare("UPDATE videos SET content_type = category WHERE content_type IS NULL").run(); } catch (ignore) {}
}

// Add Person-based Access Control columns to videos table
try {
  db.exec(`ALTER TABLE videos ADD COLUMN access_mode TEXT DEFAULT 'public';`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE videos ADD COLUMN allowed_user_ids TEXT DEFAULT '[]';`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE videos ADD COLUMN excluded_user_ids TEXT DEFAULT '[]';`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE videos ADD COLUMN is_featured INTEGER DEFAULT 0;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE videos ADD COLUMN is_recommended INTEGER DEFAULT 0;`);
} catch (e) {}

// Ensure audit_logs has actor_department column
try {
  db.exec(`ALTER TABLE audit_logs ADD COLUMN actor_department TEXT;`);
} catch (e) {}

// Simplify user roles to strictly 'Admin' and 'User'
try {
  db.exec(`UPDATE users SET role = 'Admin' WHERE is_admin = 1 OR role = 'System Administrator';`);
  db.exec(`UPDATE users SET role = 'User' WHERE is_admin = 0 AND role != 'System Administrator';`);

  // Clean up legacy audit logs: replace Tester and Simulation Switcher
  db.exec(`UPDATE audit_logs SET actor_name = 'Kittisak Tech (Admin)', actor_role = 'Admin', actor_department = 'Executive Board' WHERE actor_name = 'Simulation Switcher' OR actor_role = 'Tester';`);
  db.exec(`UPDATE audit_logs SET actor_role = 'Admin' WHERE actor_role = 'System Administrator' OR actor_name LIKE '%Admin%';`);
  db.exec(`UPDATE audit_logs SET actor_role = 'User' WHERE actor_role NOT IN ('Admin', 'User');`);
  db.exec(`
    UPDATE audit_logs
    SET actor_department = (SELECT department FROM users WHERE users.name = audit_logs.actor_name)
    WHERE actor_department IS NULL OR actor_department = '';
  `);
  db.exec(`UPDATE audit_logs SET actor_department = 'Executive Board' WHERE (actor_name LIKE '%Admin%' OR actor_role = 'Admin') AND (actor_department IS NULL OR actor_department = '');`);
  db.exec(`UPDATE audit_logs SET actor_department = 'General' WHERE actor_department IS NULL OR actor_department = '';`);

  // Clean up legacy TAG audit logs to PBAC Policy / Access Control equivalents
  db.exec(`UPDATE audit_logs SET action = 'PBAC_POLICY_CREATE', details = REPLACE(details, 'security tag', 'PBAC policy rule') WHERE action = 'TAG_CREATE';`);
  db.exec(`UPDATE audit_logs SET action = 'PBAC_POLICY_DELETE', details = REPLACE(details, 'security tag', 'PBAC policy rule') WHERE action = 'TAG_DELETE';`);
  db.exec(`UPDATE audit_logs SET action = 'PBAC_POLICY_UPDATE', details = REPLACE(details, 'security tag', 'PBAC policy rule') WHERE action = 'TAG_UPDATE';`);
  db.exec(`UPDATE audit_logs SET details = REPLACE(details, 'compliance tags and duration', 'compliance policies and duration') WHERE details LIKE '%compliance tags%';`);
} catch (e) {}

// Keep the demo catalog populated across every official category.
try {
  const demoDepartments = {
    Biotech: 'Research & Development (R&D)',
    Swine: 'Veterinary & Animal Health',
    Aquatic: 'Veterinary & Animal Health',
    Conference: 'Executive Board',
    Dairy: 'Animal Nutrition Science',
    'Dairy Process': 'Feed Mill Operations',
    'Extension Research': 'Research & Development (R&D)',
    Nutrition: 'Animal Nutrition Science',
    Oversea: 'Supply Chain & Procurement',
    Premix: 'Animal Nutrition Science',
    Poultry: 'Veterinary & Animal Health',
    'Raw Material': 'Supply Chain & Procurement',
    Ruminant: 'Animal Nutrition Science',
    'Ruminant Pakthongchai': 'Feed Mill Operations',
    Supplier: 'Supply Chain & Procurement',
    'QC-Lab': 'Quality Assurance & QC-Lab',
    China: 'Supply Chain & Procurement'
  };
  const demoTypes = [
    'Research & Whitepaper', 'Field Trials & Reports', 'Training & Safety Protocols',
    'Townhall & Executive Updates', 'Lab Demos & Assay Procedures',
    'Production & Mill Operations', 'Corporate Events & Symposia', 'Meeting Recordings'
  ];
  const insertDemo = db.prepare(`
    INSERT INTO videos (video_id, title, description, department, category, content_type, permission_level, duration, views, likes, thumbnail_url, video_url, tags, uploaded_by, access_mode, allowed_user_ids, excluded_user_ids)
    VALUES (?, ?, ?, ?, ?, ?, 'Standard', ?, ?, ?, ?, ?, ?, 'Demo Content Team', 'public', '[]', '[]')
  `);
  for (const [category] of officialCategories) {
    const count = db.prepare('SELECT COUNT(*) AS count FROM videos WHERE category = ?').get(category).count;
    if (count >= 5) continue;
    for (let index = count; index < 5; index++) {
      const slug = category.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toUpperCase();
      insertDemo.run(
        `MOCK-${slug}-${String(index + 1).padStart(2, '0')}`,
        `${category} Knowledge Session ${index + 1}`,
        `Demo catalog video for ${category}, prepared for NAS library integration review.`,
        demoDepartments[category] || 'Research & Development (R&D)',
        category,
        demoTypes[index % demoTypes.length],
        `${10 + (index % 8)}:${String((index * 7) % 60).padStart(2, '0')}`,
        120 + index * 37,
        12 + index,
        `/thumbnails/vid-${slug.toLowerCase()}-01.svg`,
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        `#${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}, #demo, #nas-library`
      );
    }
  }
  const demoRows = db.prepare("SELECT id FROM videos WHERE uploaded_by = 'Demo Content Team' ORDER BY id ASC").all();
  const updateDemoType = db.prepare('UPDATE videos SET content_type = ? WHERE id = ?');
  demoRows.forEach((video, index) => updateDemoType.run(demoTypes[index % demoTypes.length], video.id));
} catch (e) {
  console.error('Error seeding demo category coverage:', e.message);
}

// Seed / update initial featured highlight and recommended videos
try {
  const featCount = db.prepare("SELECT COUNT(*) as count FROM videos WHERE is_featured = 1").get().count;
  if (featCount === 0) {
    db.prepare("UPDATE videos SET is_featured = 1 WHERE video_id IN ('VID-8921', 'VID-8918', 'VID-8915')").run();
  }
  const recCount = db.prepare("SELECT COUNT(*) as count FROM videos WHERE is_recommended = 1").get().count;
  if (recCount === 0) {
    db.prepare("UPDATE videos SET is_recommended = 1 WHERE video_id IN ('VID-8921', 'VID-8920', 'VID-8917', 'VID-8913')").run();
  }
} catch (e) {}

// Initialize default user authorization levels (PBAC full baseline)
try {
  db.prepare("UPDATE users SET allowed_tags = '*' WHERE allowed_tags IS NULL OR allowed_tags != '*'").run();
} catch (e) {}

// Ensure Executive & Key Research Personas exist (Strictly Admin or User)
try {
  // Update any existing nicknames in database
  db.prepare("UPDATE users SET name = 'Nuntana W.', role = 'User', is_admin = 0 WHERE name LIKE '%Noi%' OR email LIKE '%noi%'").run();
  db.prepare("UPDATE users SET name = 'Thanawat R.', role = 'User', is_admin = 0 WHERE name LIKE '%Noom%' OR email LIKE '%noom%'").run();
  db.prepare("UPDATE users SET name = 'Gunnthanat K.', role = 'Admin', is_admin = 1 WHERE name LIKE '%Gunnthanat%' OR email LIKE '%gunnthanat%'").run();

  const existingNoi = db.prepare("SELECT * FROM users WHERE email = 'noi.exec@feedtech.com'").get();
  if (!existingNoi) {
    db.prepare("INSERT INTO users (emp_id, name, email, department, role, permission_level, is_admin, status, avatar_color, allowed_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      'VIP-001', 'Nuntana W.', 'noi.exec@feedtech.com', 'Executive Board', 'User', 'Standard', 0, 'Active', '#8b5cf6', '*'
    );
  }
  const existingNoom = db.prepare("SELECT * FROM users WHERE email = 'noom.rd@feedtech.com'").get();
  if (!existingNoom) {
    db.prepare("INSERT INTO users (emp_id, name, email, department, role, permission_level, is_admin, status, avatar_color, allowed_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      'EMP-1002', 'Thanawat R.', 'noom.rd@feedtech.com', 'Research & Development (R&D)', 'User', 'Standard', 0, 'Active', '#0284c7', '#biotech, #research'
    );
  }
  const existingGunn = db.prepare("SELECT * FROM users WHERE email = 'gunnthanat@feedtech.com'").get();
  if (!existingGunn) {
    db.prepare("INSERT INTO users (emp_id, name, email, department, role, permission_level, is_admin, status, avatar_color, allowed_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      'EMP-1003', 'Gunnthanat K.', 'gunnthanat@feedtech.com', 'Feed Mill Operations', 'Admin', 'Standard', 1, 'Active', '#059669', '*'
    );
  }

  // Universal Role Enforcement: Strictly 'Admin' and 'User'
  db.exec(`UPDATE users SET role = 'Admin' WHERE is_admin = 1;`);
  db.exec(`UPDATE users SET role = 'User' WHERE is_admin = 0;`);

  // User ID format to 4-digit auto-increment: 0001, 0002, 0003...
  try {
    const allUsers = db.prepare("SELECT id, emp_id FROM users ORDER BY id ASC").all();
    allUsers.forEach((u) => {
      if (!/^\d{4}$/.test(u.emp_id)) {
        const formatted = String(u.id).padStart(4, '0');
        try {
          db.prepare("UPDATE users SET emp_id = ? WHERE id = ?").run(formatted, u.id);
        } catch (ignore) {}
      }
    });
  } catch (e) {}
} catch (e) {}

// Update videos with Person-Based Access sample configurations
try {
  db.prepare("UPDATE videos SET access_mode = 'include', allowed_user_ids = '[1, 4, 7, 8, 9, 10]' WHERE video_id = 'VID-8921'").run();
  db.prepare("UPDATE videos SET access_mode = 'public', allowed_user_ids = '[]', excluded_user_ids = '[]' WHERE video_id = 'VID-8920'").run();
  db.prepare("UPDATE videos SET access_mode = 'exclude', excluded_user_ids = '[6]' WHERE video_id = 'VID-8919'").run();
  db.prepare("UPDATE videos SET access_mode = 'include', allowed_user_ids = '[1, 4, 9]' WHERE video_id = 'VID-8918'").run();
  db.prepare("UPDATE videos SET access_mode = 'public' WHERE video_id = 'VID-8917'").run();
  db.prepare("UPDATE videos SET access_mode = 'include', allowed_user_ids = '[1, 7, 9, 10, 11]' WHERE video_id = 'VID-8916'").run();
  db.prepare("UPDATE videos SET access_mode = 'public' WHERE video_id = 'VID-8915'").run();
  db.prepare("UPDATE videos SET access_mode = 'exclude', excluded_user_ids = '[5]' WHERE video_id = 'VID-8914'").run();
  db.prepare("UPDATE videos SET access_mode = 'public' WHERE video_id = 'VID-8913'").run();
  db.prepare("UPDATE videos SET access_mode = 'include', allowed_user_ids = '[7, 9, 11]' WHERE video_id = 'VID-8912'").run();

  // Migrate legacy orphan categories to 17 official categories
  db.prepare("UPDATE videos SET category = 'Raw Material' WHERE category IN ('Commodity', 'Raw Material')").run();
  db.prepare("UPDATE videos SET category = 'Supplier' WHERE category = 'Supply Chain'").run();
  db.prepare("UPDATE videos SET category = 'Nutrition' WHERE category IN ('Feed Formulation', 'Precision Nutrition', 'Animal Welfare', 'Pet Food')").run();
  db.prepare("UPDATE videos SET category = 'Extension Research' WHERE category IN ('Sustainable Feed', 'Automation', 'Farm IoT', 'Operations', 'Executive')").run();
  db.prepare("UPDATE videos SET category = 'QC-Lab' WHERE category = 'Food Safety'").run();
} catch (e) {}

// Global active simulation user in memory (defaults to Dr. Alice Smith)
let currentSimulatedUserId = 1;

// Person-Based Access Control (PBAC) Evaluation Engine (Public, Include Whitelist, Exclude Blacklist)
function evaluateVideoAccess(user, video) {
  if (!user || user.status !== 'Active') return { allowed: false, reason: 'User inactive or not found' };
  
  // Rule 1: Super Admin / Executive admin has full visibility always
  if (user.is_admin === 1 || user.role === 'System Administrator' || user.department === 'Executive') {
    return { allowed: true, reason: '👑 ผู้ดูแลระบบ (Full Administrator Access)' };
  }

  // Rule 2: If video is hidden by admin
  if (video.is_hidden === 1) {
    return { allowed: false, reason: '🚫 วิดีโอถูกซ่อนโดยผู้ดูแลระบบ (Archived/Hidden)' };
  }

  // Parse allowed & excluded user lists
  let allowedUsers = [];
  try {
    allowedUsers = JSON.parse(video.allowed_user_ids || '[]');
  } catch (e) {
    allowedUsers = (video.allowed_user_ids || '').split(',').map(s => parseInt(s.trim())).filter(Boolean);
  }

  let excludedUsers = [];
  try {
    excludedUsers = JSON.parse(video.excluded_user_ids || '[]');
  } catch (e) {
    excludedUsers = (video.excluded_user_ids || '').split(',').map(s => parseInt(s.trim())).filter(Boolean);
  }

  const accessMode = (video.access_mode || 'public').toLowerCase();

  // Rule 3: Include Mode (Whitelist) - Only explicitly listed individuals can view
  if (accessMode === 'include') {
    const isIncluded = allowedUsers.includes(user.id) || allowedUsers.includes(String(user.id)) || (video.uploaded_by && video.uploaded_by.includes(user.name));
    if (isIncluded) {
      return { 
        allowed: true, 
        reason: `👥 สิทธิ์เฉพาะบุคคล (Include): บัญชีของคุณอยู่ในรายชื่อผู้ได้รับอนุญาต (${allowedUsers.length} ท่าน)` 
      };
    }
    return { 
      allowed: false, 
      reason: `⛔ สิทธิ์เฉพาะบุคคล: วิดีโอนี้จำกัดสิทธิ์เฉพาะรายชื่อบุคคลที่กำหนดเท่านั้น (${allowedUsers.length} ท่าน)` 
    };
  }

  // Rule 4: Exclude Mode (Blacklist) - Everyone can view EXCEPT listed individuals
  if (accessMode === 'exclude') {
    const isExcluded = excludedUsers.includes(user.id) || excludedUsers.includes(String(user.id));
    if (isExcluded) {
      return { 
        allowed: false, 
        reason: `⛔ ถูกจำกัดสิทธิ์ (Exclude): บัญชีของคุณอยู่ในรายชื่อที่ยกเว้นการเข้าถึง` 
      };
    }
    return { 
      allowed: true, 
      reason: `🌐 เข้าถึงได้ทั่วไป (ยกเว้นเฉพาะบุคคล ${excludedUsers.length} ท่าน)` 
    };
  }

  // Rule 5: Public - Open to all active company members
  return { 
    allowed: true, 
    reason: '🌐 สาธารณะ (Public): พนักงานทุกคนในองค์กรเข้าถึงได้' 
  };
}

// ---------------- API ROUTES ----------------

// Analytics: Deep Dashboard Metrics & Access Distribution
app.get('/api/analytics/deep', (req, res) => {
  try {
    const totalVideos = db.prepare('SELECT COUNT(*) as count FROM videos').get().count;
    const totalViews = db.prepare('SELECT SUM(views) as sum FROM videos').get().sum || 0;
    const estimatedWatchHours = Math.round(totalViews * 0.18);
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'Active'").get().count;
    const avgCompletionRate = 78.4;

    // Category breakdown with views and percentage
    const catRows = db.prepare(`
      SELECT category, SUM(views) as total_views 
      FROM videos 
      GROUP BY category 
      ORDER BY total_views DESC
    `).all();

    const categoryBreakdown = catRows.map(c => ({
      category: c.category,
      total_views: c.total_views || 0,
      percentage: totalViews > 0 ? Math.round(((c.total_views || 0) / totalViews) * 100) : 0
    }));

    // Top videos
    const topVideos = db.prepare(`
      SELECT id, video_id, title, category, department, views, duration, thumbnail_url 
      FROM videos 
      ORDER BY views DESC 
      LIMIT 10
    `).all();

    // Access control distribution
    const accessRows = db.prepare(`
      SELECT access_mode, COUNT(*) as count 
      FROM videos 
      GROUP BY access_mode
    `).all();

    const accessDistribution = { public: 0, include: 0, exclude: 0 };
    accessRows.forEach(r => {
      const mode = (r.access_mode || 'public').toLowerCase();
      if (accessDistribution[mode] !== undefined) {
        accessDistribution[mode] = r.count;
      }
    });

    res.json({
      success: true,
      data: {
        totalVideos,
        totalViews,
        estimatedWatchHours,
        avgCompletionRate,
        activeUsers,
        categoryBreakdown,
        topVideos,
        accessDistribution
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Analytics: Category Drilldown
const handleCategoryDrilldown = (req, res) => {
  try {
    const catName = req.params.category;
    let query = "SELECT * FROM videos";
    let params = [];

    if (catName && catName !== 'All' && catName.toLowerCase() !== 'all categories') {
      query += " WHERE LOWER(category) = LOWER(?)";
      params.push(catName);
    }
    query += " ORDER BY views DESC";

    const videos = db.prepare(query).all(...params);
    const total_videos = videos.length;
    const total_views = videos.reduce((sum, v) => sum + (v.views || 0), 0);

    const allUsers = db.prepare("SELECT id, name, department FROM users").all();
    const userMap = {};
    allUsers.forEach(u => { userMap[u.id] = u; });

    const enhancedVideos = videos.map(v => {
      let allowedIds = [];
      let excludedIds = [];
      try { allowedIds = JSON.parse(v.allowed_user_ids || '[]'); } catch (e) {}
      try { excludedIds = JSON.parse(v.excluded_user_ids || '[]'); } catch (e) {}

      const allowed_names = allowedIds.map(id => userMap[id]?.name).filter(Boolean);
      const excluded_names = excludedIds.map(id => userMap[id]?.name).filter(Boolean);
      const viewers = allUsers.filter(u => u.department === v.department).slice(0, 3);

      return {
        id: v.id,
        video_id: v.video_id,
        title: v.title,
        category: v.category,
        department: v.department,
        duration: v.duration,
        uploaded_at: v.uploaded_at,
        views: v.views || 0,
        thumbnail_url: v.thumbnail_url || 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=100',
        access_mode: v.access_mode || 'public',
        allowed_names,
        excluded_names,
        viewers
      };
    });

    res.json({
      success: true,
      total_videos,
      total_views,
      videos: enhancedVideos
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

app.get('/api/analytics/category-drilldown', handleCategoryDrilldown);
app.get('/api/analytics/category-drilldown/:category', handleCategoryDrilldown);


// Auth Login (Demo Credentials: admin/admin or user/user)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });
  }

  const uLower = String(username).toLowerCase().trim();
  const pLower = String(password).toLowerCase().trim();
  let user = null;

  if (uLower === 'admin' && pLower === 'admin') {
    user = db.prepare("SELECT * FROM users WHERE is_admin = 1 OR role = 'System Administrator' ORDER BY id ASC").get();
  } else if (uLower === 'user' && pLower === 'user') {
    user = db.prepare("SELECT * FROM users WHERE id = 1").get() || db.prepare("SELECT * FROM users WHERE is_admin = 0 ORDER BY id ASC").get();
  } else {
    user = db.prepare("SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(emp_id) = ? OR LOWER(name) LIKE ?").get(uLower, uLower, `%${uLower}%`);
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (สำหรับ Demo ใช้ admin / admin หรือ user / user)' });
  }

  currentSimulatedUserId = user.id;

  db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
    .run(user.name, user.role, 'AUTH_LOGIN', `Session Login: [${user.emp_id}]`, `User logged in successfully via Portal Login page.`);

  res.json({ success: true, message: `เข้าสู่ระบบสำเร็จ: ${user.name}`, data: user });
});

// Auth Logout
app.post('/api/auth/logout', (req, res) => {
  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
  if (currentUser) {
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
      .run(currentUser.name, currentUser.role, 'AUTH_LOGOUT', `Session Logout: [${currentUser.emp_id}]`, `User logged out from portal.`);
  }
  res.json({ success: true, message: 'ออกจากระบบเรียบร้อยแล้ว' });
});

// Get all users
app.get('/api/users', (req, res) => {
  const users = db.prepare("SELECT * FROM users ORDER BY id ASC").all();
  res.json({ success: true, data: users });
});

// Get current simulated user
app.get('/api/current-user', (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
  if (!user) {
    const fallback = db.prepare("SELECT * FROM users LIMIT 1").get();
    currentSimulatedUserId = fallback.id;
    return res.json({ success: true, data: fallback });
  }
  res.json({ success: true, data: user });
});

// Switch simulated active user persona
app.post('/api/current-user/switch', (req, res) => {
  const { userId } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  currentSimulatedUserId = user.id;

  // Log persona switch in audit with user role and department
  const actorRole = (user.is_admin === 1 || user.role === 'Admin') ? 'Admin' : 'User';
  db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
    .run(user.name, actorRole, user.department || 'General', 'PERSONA_SWITCH', user.name, `Active viewing persona changed to ${user.name} (${user.department} - Role: ${actorRole})`);

  res.json({ success: true, message: `Switched persona to ${user.name}`, data: user });
});

// Create new user
app.post('/api/users', (req, res) => {
  const { emp_id, name, email, department, role, permission_level, is_admin, status, allowed_tags, is_executive_board } = req.body;
  if (!name || !email || !department) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    let autoEmpId = (emp_id || '').trim();
    if (!autoEmpId) {
      const allUsers = db.prepare("SELECT emp_id, id FROM users").all();
      let maxNum = 0;
      allUsers.forEach(u => {
        const num = parseInt((u.emp_id || '').replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
        if (u.id > maxNum) maxNum = u.id;
      });
      autoEmpId = String(maxNum + 1).padStart(4, '0');
    } else if (/^\d+$/.test(autoEmpId)) {
      autoEmpId = autoEmpId.padStart(4, '0');
    }
    const colors = ['#10b981', '#2563eb', '#8b5cf6', '#d97706', '#db2777', '#059669'];
    const avatar_color = colors[Math.floor(Math.random() * colors.length)];
    const normalizedRole = (role === 'Admin' || is_admin) ? 'Admin' : 'User';
    const normalizedIsAdmin = normalizedRole === 'Admin' ? 1 : 0;

    const result = db.prepare(`
      INSERT INTO users (emp_id, name, email, department, role, permission_level, is_admin, status, avatar_color, allowed_tags, is_executive_board)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      autoEmpId,
      name,
      email,
      department,
      normalizedRole,
      permission_level || 'Standard',
      normalizedIsAdmin,
      status || 'Active',
      avatar_color,
      allowed_tags || '#general',
      is_executive_board ? 1 : 0
    );

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    const actorRole = (currentUser && (currentUser.is_admin === 1 || currentUser.role === 'Admin')) ? 'Admin' : 'User';
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'System Admin', actorRole, currentUser ? currentUser.department : 'Executive Board', 'USER_CREATE', name, `Created user ${autoEmpId} in department ${department} (Role: ${normalizedRole})`);

    const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    res.json({ success: true, message: 'User created successfully', data: newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update user
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { name, email, department, role, permission_level, is_admin, status, allowed_tags, is_executive_board } = req.body;

  let normalizedRole = undefined;
  let normalizedIsAdmin = undefined;
  if (role !== undefined || is_admin !== undefined) {
    normalizedRole = (role === 'Admin' || is_admin) ? 'Admin' : 'User';
    normalizedIsAdmin = normalizedRole === 'Admin' ? 1 : 0;
  }

  try {
    db.prepare(`
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          department = COALESCE(?, department),
          role = COALESCE(?, role),
          permission_level = COALESCE(?, permission_level),
          is_admin = COALESCE(?, is_admin),
          status = COALESCE(?, status),
          allowed_tags = COALESCE(?, allowed_tags),
          is_executive_board = COALESCE(?, is_executive_board)
      WHERE id = ?
    `).run(
      name, 
      email, 
      department, 
      normalizedRole, 
      permission_level, 
      normalizedIsAdmin, 
      status, 
      allowed_tags, 
      is_executive_board !== undefined ? (is_executive_board ? 1 : 0) : null,
      userId
    );

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    const actorRole = (currentUser && (currentUser.is_admin === 1 || currentUser.role === 'Admin')) ? 'Admin' : 'User';
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', actorRole, currentUser ? currentUser.department : 'Executive Board', 'USER_UPDATE', updatedUser.name, `Updated user profile for ${updatedUser.name} (Dept: ${updatedUser.department}, Role: ${updatedUser.role})`);

    res.json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle user status (Active / Inactive)
app.patch('/api/users/:id/toggle-status', (req, res) => {
  const userId = req.params.id;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(nextStatus, userId);

  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
  const actorRole = (currentUser && (currentUser.is_admin === 1 || currentUser.role === 'Admin')) ? 'Admin' : 'User';
  db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
    .run(currentUser ? currentUser.name : 'Admin', actorRole, currentUser ? currentUser.department : 'Executive Board', 'USER_STATUS_TOGGLE', user.name, `Changed account status from ${user.status} to ${nextStatus}`);

  res.json({ success: true, message: `User status changed to ${nextStatus}`, data: { ...user, status: nextStatus } });
});

// Delete user account
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    db.prepare("DELETE FROM users WHERE id = ?").run(userId);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    const actorRole = (currentUser && (currentUser.is_admin === 1 || currentUser.role === 'Admin')) ? 'Admin' : 'User';
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', actorRole, currentUser ? currentUser.department : 'Executive Board', 'USER_DELETE', user.name, `Deleted user profile [${user.emp_id || user.id}] ${user.name}`);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get corporate departments (with user counts)
app.get('/api/departments', (req, res) => {
  try {
    const depts = db.prepare("SELECT * FROM departments ORDER BY id ASC").all();
    const counts = db.prepare("SELECT department, COUNT(*) as count FROM users GROUP BY department").all();
    const countMap = {};
    counts.forEach(c => { if (c.department) countMap[c.department] = c.count; });

    const data = depts.map(d => ({
      ...d,
      user_count: countMap[d.name] || 0
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create corporate department
app.post('/api/departments', (req, res) => {
  const { name, code, icon, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Department name is required' });
  try {
    const deptCode = code || name.slice(0, 4).toUpperCase();
    const result = db.prepare("INSERT INTO departments (name, code, icon, description) VALUES (?, ?, ?, ?)").run(name.trim(), deptCode, icon || 'business_center', description || '');
    const newDept = db.prepare("SELECT * FROM departments WHERE id = ?").get(result.lastInsertRowid);
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('Admin', 'System Administrator', 'DEPARTMENT_CREATE', name.trim(), `Created corporate department '${name.trim()}'`);
    res.json({ success: true, message: 'Department created successfully', data: newDept });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete corporate department
app.delete('/api/departments/:id', (req, res) => {
  try {
    const old = db.prepare("SELECT * FROM departments WHERE id = ?").get(req.params.id);
    if (!old) return res.status(404).json({ success: false, message: 'Department not found' });
    const userCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE department = ?").get(old.name).c;
    if (userCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete department '${old.name}' because ${userCount} user(s) currently belong to it.` });
    }
    db.prepare("DELETE FROM departments WHERE id = ?").run(req.params.id);
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('Admin', 'System Administrator', 'DEPARTMENT_DELETE', old.name, `Deleted corporate department '${old.name}'`);
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update corporate department (name and description)
app.put('/api/departments/:id', (req, res) => {
  const deptId = req.params.id;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Department name is required' });

  try {
    const oldDept = db.prepare("SELECT * FROM departments WHERE id = ?").get(deptId);
    if (!oldDept) return res.status(404).json({ success: false, message: 'Department not found' });

    const newName = name.trim();
    const newDesc = (description || '').trim();

    // Update department
    db.prepare("UPDATE departments SET name = ?, description = ? WHERE id = ?").run(newName, newDesc, deptId);

    // Cascade update to users table if name changed
    if (oldDept.name !== newName) {
      db.prepare("UPDATE users SET department = ? WHERE department = ?").run(newName, oldDept.name);
    }

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    const actorRole = (currentUser && (currentUser.is_admin === 1 || currentUser.role === 'Admin')) ? 'Admin' : 'User';
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', actorRole, currentUser ? currentUser.department : 'Executive Board', 'DEPARTMENT_UPDATE', newName, `Updated department '${oldDept.name}' -> '${newName}'`);

    res.json({ success: true, message: 'Department updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get members of a specific department
app.get('/api/departments/:id/members', (req, res) => {
  try {
    const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const members = db.prepare("SELECT id, emp_id, name, email, role, permission_level, status, avatar_color FROM users WHERE department = ? ORDER BY name ASC").all(dept.name);
    res.json({ success: true, department: dept, members });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add user to department
app.post('/api/departments/:id/members/add', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ success: false, message: 'User ID is required' });

  try {
    const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const prevDept = user.department;
    db.prepare("UPDATE users SET department = ? WHERE id = ?").run(dept.name, user_id);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    const actorRole = (currentUser && (currentUser.is_admin === 1 || currentUser.role === 'Admin')) ? 'Admin' : 'User';
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', actorRole, currentUser ? currentUser.department : 'Executive Board', 'DEPARTMENT_MEMBER_ADD', dept.name, `Assigned user ${user.name} to department '${dept.name}' (previously '${prevDept}')`);

    res.json({ success: true, message: `Added ${user.name} to ${dept.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Remove user from department (set department to 'General')
app.post('/api/departments/:id/members/remove', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ success: false, message: 'User ID is required' });

  try {
    const dept = db.prepare("SELECT * FROM departments WHERE id = ?").get(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    db.prepare("UPDATE users SET department = 'General' WHERE id = ?").run(user_id);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    const actorRole = (currentUser && (currentUser.is_admin === 1 || currentUser.role === 'Admin')) ? 'Admin' : 'User';
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', actorRole, currentUser ? currentUser.department : 'Executive Board', 'DEPARTMENT_MEMBER_REMOVE', dept.name, `Removed user ${user.name} from department '${dept.name}'`);

    res.json({ success: true, message: `Removed ${user.name} from ${dept.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Move user to another department
app.post('/api/departments/:id/members/move', (req, res) => {
  const { user_id, target_department } = req.body;
  if (!user_id || !target_department) return res.status(400).json({ success: false, message: 'User ID and target department required' });

  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(user_id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const oldDept = user.department;
    db.prepare("UPDATE users SET department = ? WHERE id = ?").run(target_department.trim(), user_id);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    const actorRole = (currentUser && (currentUser.is_admin === 1 || currentUser.role === 'Admin')) ? 'Admin' : 'User';
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', actorRole, currentUser ? currentUser.department : 'Executive Board', 'DEPARTMENT_UPDATE', target_department, `Transferred ${user.name} from '${oldDept}' to '${target_department}'`);

    res.json({ success: true, message: `Moved ${user.name} to ${target_department}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get categories
app.get('/api/categories', (req, res) => {
  try {
    const cats = db.prepare("SELECT * FROM categories ORDER BY id ASC").all();
    const videos = db.prepare("SELECT category FROM videos").all();
    
    const countMap = {};
    videos.forEach(v => {
      if (v.category) countMap[v.category] = (countMap[v.category] || 0) + 1;
    });

    const data = cats.map(c => ({
      ...c,
      video_count: countMap[c.name] || 0
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create category
app.post('/api/categories', (req, res) => {
  const { name, icon, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });
  try {
    const result = db.prepare("INSERT INTO categories (name, icon, description) VALUES (?, ?, ?)").run(name.trim(), icon || 'category', description || '');
    const newCat = db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
    
    // Audit Log
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('Kittisak Tech (Admin)', 'System Administrator', 'CATEGORY_CREATE', name.trim(), `Created new category '${name.trim()}' with icon '${icon || 'category'}'`);

    res.json({ success: true, message: 'Category created successfully', data: newCat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update category
app.put('/api/categories/:id', (req, res) => {
  const { name, icon, description } = req.body;
  try {
    const oldCat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
    if (!oldCat) return res.status(404).json({ success: false, message: 'Category not found' });

    db.prepare("UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), description = COALESCE(?, description) WHERE id = ?").run(name, icon, description, req.params.id);
    const updated = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);

    // Audit Log
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('Kittisak Tech (Admin)', 'System Administrator', 'CATEGORY_UPDATE', updated.name, `Updated category details for '${updated.name}'`);

    res.json({ success: true, message: 'Category updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete category
app.delete('/api/categories/:id', (req, res) => {
  try {
    const oldCat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
    if (!oldCat) return res.status(404).json({ success: false, message: 'Category not found' });

    db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);

    // Audit Log
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('Kittisak Tech (Admin)', 'System Administrator', 'CATEGORY_DELETE', oldCat.name, `Deleted category '${oldCat.name}'`);

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- CONTENT TYPE / FORMAT APIS ----------------

// Get all content types with video counts
app.get('/api/content-types', (req, res) => {
  try {
    const types = db.prepare("SELECT * FROM content_types ORDER BY id ASC").all();
    const videos = db.prepare("SELECT category FROM videos").all();
    const countMap = {};
    videos.forEach(v => {
      if (v.category) countMap[v.category] = (countMap[v.category] || 0) + 1;
    });

    const data = types.map(t => ({
      ...t,
      video_count: countMap[t.name] || 0
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create new content type
app.post('/api/content-types', (req, res) => {
  const { name, icon, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Content Type name is required' });
  try {
    const result = db.prepare("INSERT INTO content_types (name, icon, description) VALUES (?, ?, ?)").run(name.trim(), icon || 'description', description || '');
    const newType = db.prepare("SELECT * FROM content_types WHERE id = ?").get(result.lastInsertRowid);
    
    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('Admin', 'System Administrator', 'CONTENT_TYPE_CREATE', name.trim(), `Created new content type '${name.trim()}'`);

    res.json({ success: true, message: 'Content Type created successfully', data: newType });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete content type
app.delete('/api/content-types/:id', (req, res) => {
  try {
    const old = db.prepare("SELECT * FROM content_types WHERE id = ?").get(req.params.id);
    if (!old) return res.status(404).json({ success: false, message: 'Content type not found' });

    db.prepare("DELETE FROM content_types WHERE id = ?").run(req.params.id);
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('Admin', 'System Administrator', 'CONTENT_TYPE_DELETE', old.name, `Deleted content type '${old.name}'`);

    res.json({ success: true, message: 'Content Type deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- TAG GOVERNANCE & PERMISSION APIS ----------------

// Get all tags with usage statistics
app.get('/api/tags', (req, res) => {
  try {
    const tags = db.prepare("SELECT * FROM tags ORDER BY name ASC").all();
    const allVideos = db.prepare("SELECT tags FROM videos").all();
    const allUsers = db.prepare("SELECT allowed_tags FROM users").all();

    const data = tags.map(t => {
      const cleanTagName = t.name.replace(/^#/, '').toLowerCase();
      
      // Count matching videos
      const videoCount = allVideos.filter(v => {
        if (!v.tags) return false;
        return v.tags.toLowerCase().includes(cleanTagName);
      }).length;

      // Count matching authorized users
      const userCount = allUsers.filter(u => {
        if (!u.allowed_tags) return false;
        if (u.allowed_tags === '*' || u.allowed_tags.includes('*')) return true;
        return u.allowed_tags.toLowerCase().includes(cleanTagName);
      }).length;

      return {
        ...t,
        video_count: videoCount,
        user_count: userCount
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create new Tag
app.post('/api/tags', (req, res) => {
  const { name, department, clearance_level, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Tag name is required' });

  const formattedName = name.startsWith('#') ? name.toLowerCase() : `#${name.toLowerCase()}`;

  try {
    const result = db.prepare(`
      INSERT INTO tags (name, department, clearance_level, description)
      VALUES (?, ?, ?, ?)
    `).run(formattedName, department || 'General', clearance_level || 'Standard', description || '');

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', currentUser ? currentUser.role : 'Admin', 'PBAC_POLICY_CREATE', formattedName, `Created security policy rule ${formattedName} with clearance [${clearance_level || 'Standard'}]`);

    const newTag = db.prepare("SELECT * FROM tags WHERE id = ?").get(result.lastInsertRowid);
    res.json({ success: true, message: 'Tag created successfully', data: newTag });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Tag
app.put('/api/tags/:id', (req, res) => {
  const { name, department, clearance_level, description } = req.body;
  const tagId = req.params.id;

  try {
    const existing = db.prepare("SELECT * FROM tags WHERE id = ?").get(tagId);
    if (!existing) return res.status(404).json({ success: false, message: 'Tag not found' });

    const formattedName = name ? (name.startsWith('#') ? name.toLowerCase() : `#${name.toLowerCase()}`) : existing.name;

    db.prepare(`
      UPDATE tags
      SET name = ?,
          department = COALESCE(?, department),
          clearance_level = COALESCE(?, clearance_level),
          description = COALESCE(?, description)
      WHERE id = ?
    `).run(formattedName, department, clearance_level, description, tagId);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', currentUser ? currentUser.role : 'Admin', 'PBAC_POLICY_UPDATE', formattedName, `Updated security policy clearance to [${clearance_level || existing.clearance_level}]`);

    const updated = db.prepare("SELECT * FROM tags WHERE id = ?").get(tagId);
    res.json({ success: true, message: 'Tag updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Tag
app.delete('/api/tags/:id', (req, res) => {
  const tagId = req.params.id;
  try {
    const existing = db.prepare("SELECT * FROM tags WHERE id = ?").get(tagId);
    if (!existing) return res.status(404).json({ success: false, message: 'Tag not found' });

    db.prepare("DELETE FROM tags WHERE id = ?").run(tagId);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', currentUser ? currentUser.role : 'Admin', 'PBAC_POLICY_DELETE', existing.name, `Deleted security policy rule ${existing.name}`);

    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PBAC Policy API aliases
app.get('/api/pbac-policies', (req, res) => res.redirect(307, '/api/tags'));
app.post('/api/pbac-policies', (req, res) => res.redirect(307, '/api/tags'));
app.put('/api/pbac-policies/:id', (req, res) => res.redirect(307, `/api/tags/${req.params.id}`));
app.delete('/api/pbac-policies/:id', (req, res) => res.redirect(307, `/api/tags/${req.params.id}`));

// Get accessible videos for the CURRENT SIMULATED USER (Strict Permission Filtering)
app.get('/api/videos', (req, res) => {
  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
  const allVideos = db.prepare("SELECT * FROM videos ORDER BY id DESC").all();

  const accessibleVideos = [];
  const permissionEvaluations = [];

  for (const v of allVideos) {
    const evalResult = evaluateVideoAccess(currentUser, v);
    permissionEvaluations.push({
      video_id: v.video_id,
      title: v.title,
      department: v.department,
      permission_level: v.permission_level,
      allowed: evalResult.allowed,
      reason: evalResult.reason
    });

    // If allowed, push to visible video list
    if (evalResult.allowed) {
      accessibleVideos.push({
        ...v,
        access_grant_reason: evalResult.reason
      });
    }
  }

  // Get user's favorites
  const favRows = db.prepare("SELECT video_id FROM favorites WHERE user_id = ?").all(currentUser.id);
  const favSet = new Set(favRows.map(f => f.video_id));

  // Get user's watch history
  const historyRows = db.prepare("SELECT video_id, progress_percent, watched_at FROM watch_history WHERE user_id = ?").all(currentUser.id);
  const historyMap = {};
  historyRows.forEach(h => { historyMap[h.video_id] = h; });

  const enrichedVideos = accessibleVideos.map(v => ({
    ...v,
    is_favorite: favSet.has(v.id),
    watch_progress: historyMap[v.id] ? historyMap[v.id].progress_percent : 0
  }));

  res.json({
    success: true,
    data: enrichedVideos,
    meta: {
      currentUser,
      total_portal_videos: allVideos.length,
      visible_count: enrichedVideos.length,
      hidden_count: allVideos.length - enrichedVideos.length,
      evaluations: permissionEvaluations
    }
  });
});

// Get ALL videos for Admin Management (Raw unfiltered view for Admin Console)
app.get('/api/videos/all', (req, res) => {
  const videos = db.prepare("SELECT * FROM videos ORDER BY id DESC").all();
  res.json({ success: true, data: videos });
});

// Get single video details
app.get('/api/videos/:id', (req, res) => {
  const videoId = req.params.id;
  const video = db.prepare("SELECT * FROM videos WHERE id = ? OR video_id = ?").get(videoId, videoId);
  if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
  const evalResult = evaluateVideoAccess(currentUser, video);

  // Fetch comments
  const comments = db.prepare("SELECT * FROM comments WHERE video_id = ? ORDER BY id DESC").all(video.id);

  res.json({
    success: true,
    data: video,
    access: evalResult,
    comments
  });
});

// Batch Import Videos (Supports 800+ items via transactional bulk execution)
app.post('/api/videos/batch-import', (req, res) => {
  const { videos } = req.body;
  if (!Array.isArray(videos) || videos.length === 0) {
    return res.status(400).json({ success: false, message: 'No video records provided for bulk import' });
  }

  const defaultSvgThumbs = [
    '/thumbnails/vid-biotech-01.svg',
    '/thumbnails/vid-swine-01.svg',
    '/thumbnails/vid-feed-01.svg',
    '/thumbnails/vid-aquatic-01.svg',
    '/thumbnails/vid-dairy-01.svg',
    '/thumbnails/vid-qc-01.svg'
  ];

  try {
    const insertStmt = db.prepare(`
      INSERT INTO videos (
        video_id, title, description, department, category, content_type,
        permission_level, duration, thumbnail_url, video_url, tags,
        uploaded_by, allow_downloads, enable_comments, access_mode,
        allowed_user_ids, excluded_user_ids, views
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const catMap = {};
    (db.prepare("SELECT name FROM categories").all() || []).forEach(c => { catMap[c.name.toLowerCase()] = c.name; });

    db.exec("BEGIN TRANSACTION");
    try {
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        const title = (v.title || '').trim();
        if (!title) continue;

        const video_id = v.video_id || `VID-${Math.floor(8000 + Math.random() * 1999)}-${Date.now().toString().slice(-4)}${i}`;
        
        let category = (v.category || 'Biotech').trim();
        if (catMap[category.toLowerCase()]) {
          category = catMap[category.toLowerCase()];
        }

        const vUrl = (v.video_url || '').trim() || '/sample.mp4';
        let thumb = (v.thumbnail_url || '').trim();

        // Automatic mapping: If video is .mp4, map to .jpg
        if (!thumb && vUrl) {
          if (vUrl.toLowerCase().endsWith('.mp4')) {
            thumb = vUrl.replace(/\.mp4$/i, '.jpg');
          } else {
            thumb = defaultSvgThumbs[i % defaultSvgThumbs.length];
          }
        } else if (thumb.toLowerCase().endsWith('.mp4')) {
          thumb = thumb.replace(/\.mp4$/i, '.jpg');
        } else if (!thumb) {
          thumb = defaultSvgThumbs[i % defaultSvgThumbs.length];
        }

        const duration = (v.duration || '12:00').trim();
        const views = parseInt(v.views, 10) || Math.floor(15 + Math.random() * 120);
        const description = (v.description || `Corporate technical instructional asset under ${category} operations`).trim();
        const tags = (v.tags || '').trim();
        const rawAccessMode = (v.access_mode || 'public').trim().toLowerCase();
        const access_mode = ['public', 'include', 'exclude'].includes(rawAccessMode) ? rawAccessMode : 'public';
        const allowed_user_ids = typeof v.allowed_user_ids === 'string' ? v.allowed_user_ids : JSON.stringify(v.allowed_user_ids || []);
        const excluded_user_ids = typeof v.excluded_user_ids === 'string' ? v.excluded_user_ids : JSON.stringify(v.excluded_user_ids || []);
        const department = (v.department || category).trim();
        const content_type = (v.content_type || 'Standard Operations').trim();
        const permission_level = (v.permission_level || 'Standard').trim();
        const uploaded_by = (v.uploaded_by || 'Admin Bulk Import').trim();

        insertStmt.run(
          video_id, title, description, department, category, content_type,
          permission_level, duration, thumb, vUrl, tags,
          uploaded_by, 1, 1, access_mode,
          allowed_user_ids, excluded_user_ids, views
        );
        importedCount++;
      }
      db.exec("COMMIT");
    } catch (txErr) {
      db.exec("ROLLBACK");
      throw txErr;
    }

    // Record audit log
    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    const actorRole = (currentUser && (currentUser.is_admin === 1 || currentUser.role === 'Admin')) ? 'Admin' : 'User';
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, actor_department, action, target, details) VALUES (?, ?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'System Admin', actorRole, currentUser ? currentUser.department : 'Executive Board', 'VIDEO_BATCH_IMPORT', `Bulk (${importedCount} videos)`, `Imported ${importedCount} video assets into video catalog via CSV batch ingestion`);

    res.json({ success: true, message: `Successfully imported ${importedCount} videos`, count: importedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Batch import error: ' + err.message });
  }
});

// Create / Mock Upload Video (Admin Only)
app.post('/api/videos', (req, res) => {
  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
  const isAdmin = currentUser && (currentUser.is_admin === 1 || currentUser.role === 'System Administrator' || currentUser.department === 'Executive');
  
  if (!isAdmin) {
    return res.status(403).json({ success: false, message: 'Access denied: Only Administrators can upload video assets.' });
  }

  const { 
    title, description, department, category, content_type, permission_level, duration,
    thumbnail_url, video_url, tags, allow_downloads, enable_comments,
    access_mode, allowed_user_ids, excluded_user_ids
  } = req.body;
  
  if (!title) {
    return res.status(400).json({ success: false, message: 'Video title is required' });
  }

  const video_id = `VID-${Math.floor(8000 + Math.random() * 1999)}`;
  const defaultThumb = 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80';
  const defaultVideo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const finalCategory = category || 'Biotech';

  try {
    const result = db.prepare(`
      INSERT INTO videos (video_id, title, description, department, category, content_type, permission_level, duration, thumbnail_url, video_url, tags, uploaded_by, allow_downloads, enable_comments, access_mode, allowed_user_ids, excluded_user_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      video_id,
      title,
      description || 'Uploaded via Feedtech Cloud Hub simulator.',
      department || finalCategory,
      finalCategory,
      content_type || 'Research & Whitepaper',
      permission_level || 'Standard',
      duration || '10:00',
      thumbnail_url || defaultThumb,
      video_url || defaultVideo,
      tags || '',
      currentUser ? currentUser.name : 'Administrator',
      allow_downloads ? 1 : 0,
      enable_comments ? 1 : 0,
      access_mode || 'public',
      typeof allowed_user_ids === 'string' ? allowed_user_ids : JSON.stringify(allowed_user_ids || []),
      typeof excluded_user_ids === 'string' ? excluded_user_ids : JSON.stringify(excluded_user_ids || [])
    );

    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', currentUser ? currentUser.role : 'Admin', 'VIDEO_UPLOAD', `${video_id} - ${title}`, `Uploaded new video with Access Mode [${access_mode || 'public'}]`);

    const newVideo = db.prepare("SELECT * FROM videos WHERE id = ?").get(result.lastInsertRowid);
    res.json({ success: true, message: 'Video uploaded and indexed successfully!', data: newVideo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update Video Metadata & Permissions
app.put('/api/videos/:id', (req, res) => {
  const videoId = req.params.id;
  const { 
    title, description, department, category, content_type, permission_level, tags,
    thumbnail_url,
    is_hidden, allow_downloads, enable_comments,
    access_mode, allowed_user_ids, excluded_user_ids,
    is_featured, is_recommended
  } = req.body;

  try {
    db.prepare(`
      UPDATE videos
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          department = COALESCE(?, department),
          category = COALESCE(?, category),
          content_type = COALESCE(?, content_type),
          permission_level = COALESCE(?, permission_level),
          tags = COALESCE(?, tags),
          thumbnail_url = COALESCE(?, thumbnail_url),
          is_hidden = COALESCE(?, is_hidden),
          allow_downloads = COALESCE(?, allow_downloads),
          enable_comments = COALESCE(?, enable_comments),
          access_mode = COALESCE(?, access_mode),
          allowed_user_ids = COALESCE(?, allowed_user_ids),
          excluded_user_ids = COALESCE(?, excluded_user_ids),
          is_featured = COALESCE(?, is_featured),
          is_recommended = COALESCE(?, is_recommended)
      WHERE id = ? OR video_id = ?
    `).run(
      title, description, department, category, content_type, permission_level, tags,
      thumbnail_url,
      is_hidden, allow_downloads, enable_comments,
      access_mode,
      allowed_user_ids !== undefined ? (typeof allowed_user_ids === 'string' ? allowed_user_ids : JSON.stringify(allowed_user_ids)) : null,
      excluded_user_ids !== undefined ? (typeof excluded_user_ids === 'string' ? excluded_user_ids : JSON.stringify(excluded_user_ids)) : null,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      is_recommended !== undefined ? (is_recommended ? 1 : 0) : null,
      videoId, videoId
    );

    const updated = db.prepare("SELECT * FROM videos WHERE id = ? OR video_id = ?").get(videoId, videoId);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', currentUser ? currentUser.role : 'Admin', 'VIDEO_METADATA_UPDATE', updated.video_id, `Updated video [${updated.title}] metadata`);

    res.json({ success: true, message: 'Video updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Quick Toggle Featured Highlight (Pin to Home Page)
app.patch('/api/videos/:id/toggle-featured', (req, res) => {
  const videoId = req.params.id;
  try {
    const video = db.prepare("SELECT * FROM videos WHERE id = ? OR video_id = ?").get(videoId, videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    const nextVal = video.is_featured === 1 ? 0 : 1;
    db.prepare("UPDATE videos SET is_featured = ? WHERE id = ?").run(nextVal, video.id);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', currentUser ? currentUser.role : 'Admin', 'VIDEO_PIN_TOGGLE', video.video_id, `${nextVal === 1 ? 'Pinned video to Home Highlights' : 'Unpinned video from Home Highlights'}: [${video.title}]`);

    res.json({ success: true, message: nextVal === 1 ? 'Pinned to Featured Highlights' : 'Unpinned from Highlights', is_featured: nextVal, data: { ...video, is_featured: nextVal } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Quick Toggle Recommended Video
app.patch('/api/videos/:id/toggle-recommended', (req, res) => {
  const videoId = req.params.id;
  try {
    const video = db.prepare("SELECT * FROM videos WHERE id = ? OR video_id = ?").get(videoId, videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    const nextVal = video.is_recommended === 1 ? 0 : 1;
    db.prepare("UPDATE videos SET is_recommended = ? WHERE id = ?").run(nextVal, video.id);

    const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
    db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
      .run(currentUser ? currentUser.name : 'Admin', currentUser ? currentUser.role : 'Admin', 'VIDEO_RECOMMEND_TOGGLE', video.video_id, `${nextVal === 1 ? 'Marked as Recommended video' : 'Unmarked from Recommended'}: [${video.title}]`);

    res.json({ success: true, message: nextVal === 1 ? 'Marked as Recommended' : 'Removed from Recommended', is_recommended: nextVal, data: { ...video, is_recommended: nextVal } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Category Video Breakdown for Admin Dashboard (Drill-down)
app.get(['/api/analytics/category-drilldown', '/api/analytics/category-drilldown/:catName'], (req, res) => {
  const rawCat = req.params.catName ? decodeURIComponent(req.params.catName) : 'All';
  const catName = (rawCat === 'All' || rawCat === 'all' || !rawCat) ? '' : rawCat;
  try {
    const videos = catName 
      ? db.prepare("SELECT * FROM videos WHERE category LIKE ? OR department LIKE ? ORDER BY views DESC").all(`%${catName}%`, `%${catName}%`)
      : db.prepare("SELECT * FROM videos ORDER BY views DESC").all();
    const allUsers = db.prepare("SELECT id, name, role, department FROM users").all();
    const userMap = {};
    allUsers.forEach(u => userMap[u.id] = u);

    const enrichedVideos = videos.map(v => {
      let allowedNames = [];
      let excludedNames = [];
      try {
        const aIds = JSON.parse(v.allowed_user_ids || '[]');
        allowedNames = aIds.map(id => userMap[id]?.name || `User #${id}`);
      } catch (e) {}
      try {
        const eIds = JSON.parse(v.excluded_user_ids || '[]');
        excludedNames = eIds.map(id => userMap[id]?.name || `User #${id}`);
      } catch (e) {}

      // Get view count and recent viewers
      const viewers = db.prepare(`
        SELECT u.name, u.role, u.department, w.progress_percent, w.watched_at
        FROM watch_history w
        JOIN users u ON w.user_id = u.id
        WHERE w.video_id = ?
        ORDER BY w.watched_at DESC
      `).all(v.id);

      return {
        ...v,
        allowed_names: allowedNames,
        excluded_names: excludedNames,
        viewers
      };
    });

    res.json({
      success: true,
      category: catName,
      total_videos: videos.length,
      total_views: videos.reduce((sum, v) => sum + (v.views || 0), 0),
      videos: enrichedVideos
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Video
app.delete('/api/videos/:id', (req, res) => {
  const videoId = req.params.id;
  const video = db.prepare("SELECT * FROM videos WHERE id = ? OR video_id = ?").get(videoId, videoId);
  if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

  db.prepare("DELETE FROM videos WHERE id = ?").run(video.id);
  db.prepare("DELETE FROM favorites WHERE video_id = ?").run(video.id);
  db.prepare("DELETE FROM watch_history WHERE video_id = ?").run(video.id);

  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
  db.prepare("INSERT INTO audit_logs (actor_name, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)")
    .run(currentUser ? currentUser.name : 'Admin', currentUser ? currentUser.role : 'Admin', 'VIDEO_DELETE', video.video_id, `Permanently removed video ${video.title}`);

  res.json({ success: true, message: 'Video deleted successfully' });
});

// Toggle Favorite
app.post('/api/videos/:id/favorite', (req, res) => {
  const videoId = req.params.id;
  const video = db.prepare("SELECT * FROM videos WHERE id = ? OR video_id = ?").get(videoId, videoId);
  if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

  const existing = db.prepare("SELECT * FROM favorites WHERE user_id = ? AND video_id = ?").get(currentSimulatedUserId, video.id);
  let isFav = false;

  if (existing) {
    db.prepare("DELETE FROM favorites WHERE id = ?").run(existing.id);
    isFav = false;
  } else {
    db.prepare("INSERT INTO favorites (user_id, video_id) VALUES (?, ?)").run(currentSimulatedUserId, video.id);
    isFav = true;
  }

  res.json({ success: true, is_favorite: isFav });
});

// Track Watch History & Views
app.post('/api/videos/:id/watch', (req, res) => {
  const videoId = req.params.id;
  const { progress } = req.body; // e.g. 45 (%)
  const video = db.prepare("SELECT * FROM videos WHERE id = ? OR video_id = ?").get(videoId, videoId);
  if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

  // Increment view count on first view
  db.prepare("UPDATE videos SET views = views + 1 WHERE id = ?").run(video.id);

  // Update or Insert watch history
  db.prepare(`
    INSERT INTO watch_history (user_id, video_id, progress_percent, watched_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, video_id) DO UPDATE SET
      progress_percent = excluded.progress_percent,
      watched_at = CURRENT_TIMESTAMP
  `).run(currentSimulatedUserId, video.id, progress || 25);

  res.json({ success: true, message: 'Watch progress tracked' });
});

// Post Comment
app.post('/api/videos/:id/comments', (req, res) => {
  const videoId = req.params.id;
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ success: false, message: 'Comment content is required' });

  const video = db.prepare("SELECT * FROM videos WHERE id = ? OR video_id = ?").get(videoId, videoId);
  if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(currentSimulatedUserId);
  const result = db.prepare(`
    INSERT INTO comments (video_id, user_id, user_name, user_role, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(video.id, currentUser.id, currentUser.name, `${currentUser.role} (${currentUser.department})`, comment);

  const newComment = db.prepare("SELECT * FROM comments WHERE id = ?").get(result.lastInsertRowid);
  res.json({ success: true, data: newComment });
});

// Get Audit Logs (with Filtering, Date range & Search)
app.get('/api/audit-logs', (req, res) => {
  const { action, actor, search, date_from, date_to, date } = req.query;
  let query = "SELECT * FROM audit_logs WHERE 1=1";
  const params = [];

  if (action && action !== 'ALL') {
    if (action === 'VIDEO_UPDATE') {
      query += " AND (action = 'VIDEO_UPDATE' OR action = 'VIDEO_METADATA_UPDATE' OR action = 'VIDEO_METADATA_EDIT')";
    } else if (action === 'USER_UPDATE') {
      query += " AND (action = 'USER_UPDATE' OR action = 'USER_ROLE_UPDATE')";
    } else {
      query += " AND action = ?";
      params.push(action);
    }
  }
  if (actor && actor !== 'ALL') {
    query += " AND actor_name LIKE ?";
    params.push(`%${actor}%`);
  }
  if (date) {
    query += " AND date(created_at) = date(?)";
    params.push(date);
  }
  if (date_from) {
    query += " AND date(created_at) >= date(?)";
    params.push(date_from);
  }
  if (date_to) {
    query += " AND date(created_at) <= date(?)";
    params.push(date_to);
  }
  if (search) {
    query += " AND (target LIKE ? OR details LIKE ? OR actor_name LIKE ? OR action LIKE ? OR ip_address LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += " ORDER BY id DESC LIMIT 300";
  try {
    const logs = db.prepare(query).all(...params);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Export Audit Logs as CSV
app.get('/api/audit-logs/export-csv', (req, res) => {
  try {
    const logs = db.prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 1000").all();
    const headers = ['ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Action', 'Target', 'Details', 'IP Address'];
    
    const rows = logs.map(l => [
      l.id,
      `"${(l.created_at || '').replace(/"/g, '""')}"`,
      `"${(l.actor_name || '').replace(/"/g, '""')}"`,
      `"${(l.actor_role || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.target || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.ip_address || '127.0.0.1').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="feedtech_audit_logs.csv"');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Deep Analytics for Admin Dashboard
app.get('/api/analytics/deep', (req, res) => {
  try {
    const totalVideos = db.prepare("SELECT COUNT(*) as count FROM videos").get().count;
    const totalViews = db.prepare("SELECT SUM(views) as sum FROM videos").get().sum || 0;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'Active'").get().count;
    const totalCategories = db.prepare("SELECT COUNT(DISTINCT category) as count FROM videos").get().count;

    // Category engagement breakdown
    const categoryStats = db.prepare(`
      SELECT category, COUNT(*) as video_count, SUM(views) as total_views
      FROM videos
      GROUP BY category
      ORDER BY total_views DESC
    `).all();

    const categoryBreakdown = categoryStats.map(c => ({
      category: c.category || 'General',
      video_count: c.video_count,
      total_views: c.total_views || 0,
      percentage: totalViews > 0 ? Math.round(((c.total_views || 0) / totalViews) * 100) : 0
    }));

    // Top 5 most watched videos
    const topVideos = db.prepare(`
      SELECT id, video_id, title, category, views, duration, thumbnail_url, uploaded_by, uploaded_at
      FROM videos
      ORDER BY views DESC
      LIMIT 5
    `).all();

    // Estimated total watch hours (based on average 12 min view duration)
    const estimatedWatchHours = Math.round((totalViews * 11.5) / 60);
    const avgCompletionRate = 78.4;

    res.json({
      success: true,
      data: {
        totalVideos,
        totalViews,
        totalUsers,
        activeUsers,
        totalCategories,
        estimatedWatchHours,
        avgCompletionRate,
        categoryBreakdown,
        topVideos
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Analytics / System Stats (Standard)
app.get('/api/stats', (req, res) => {
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'Active'").get().count;
  const totalVideos = db.prepare("SELECT COUNT(*) as count FROM videos").get().count;
  const totalViews = db.prepare("SELECT SUM(views) as sum FROM videos").get().sum || 0;
  const totalCategories = db.prepare("SELECT COUNT(DISTINCT category) as count FROM videos").get().count;
  const confidentialCount = db.prepare("SELECT COUNT(*) as count FROM videos WHERE permission_level = 'Highly Confidential'").get().count;
  const restrictedCount = db.prepare("SELECT COUNT(*) as count FROM videos WHERE permission_level = 'Restricted'").get().count;
  const standardCount = db.prepare("SELECT COUNT(*) as count FROM videos WHERE permission_level = 'Standard'").get().count;

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      totalVideos,
      totalViews,
      totalCategories,
      permissions: {
        highly_confidential: confidentialCount,
        restricted: restrictedCount,
        standard: standardCount
      }
    }
  });
});

// Interactive Permission Simulation Matrix Query
app.get('/api/permission-matrix', (req, res) => {
  const users = db.prepare("SELECT * FROM users WHERE status = 'Active'").all();
  const videos = db.prepare("SELECT * FROM videos ORDER BY id ASC").all();

  const matrix = users.map(u => {
    const accessible = [];
    const restricted = [];
    for (const v of videos) {
      const evalRes = evaluateVideoAccess(u, v);
      if (evalRes.allowed) {
        accessible.push({ id: v.id, video_id: v.video_id, title: v.title, level: v.permission_level, dept: v.department });
      } else {
        restricted.push({ id: v.id, video_id: v.video_id, title: v.title, level: v.permission_level, dept: v.department, reason: evalRes.reason });
      }
    }
    return {
      user: u,
      accessibleCount: accessible.length,
      restrictedCount: restricted.length,
      accessible,
      restricted
    };
  });

  res.json({ success: true, data: matrix });
});

// ---------------- EVENTS CRUD ENDPOINTS ----------------
app.get('/api/events', (req, res) => {
  try {
    const events = db.prepare("SELECT * FROM events ORDER BY date DESC, id DESC").all();
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/events/:id', (req, res) => {
  try {
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/events', (req, res) => {
  try {
    const { title, description, date, time, location, speaker, speaker_role, department, category, content_type, clearance_level, banner_url, video_url, status, materials_url } = req.body;
    if (!title || !date || !location) {
      return res.status(400).json({ success: false, message: 'Title, date, and location are required' });
    }
    const stmt = db.prepare(`
      INSERT INTO events (title, description, date, time, location, speaker, speaker_role, department, category, content_type, clearance_level, banner_url, video_url, status, materials_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      title,
      description || '',
      date,
      time || '09:00 - 16:00',
      location,
      speaker || 'Feedtech Speaker',
      speaker_role || 'Speaker',
      department || 'General',
      category || 'Corporate Knowledge',
      content_type || 'Corporate Event',
      clearance_level || 'Standard',
      banner_url || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200',
      video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      status || 'Upcoming',
      materials_url || ''
    );
    const created = db.prepare("SELECT * FROM events WHERE id = ?").get(info.lastInsertRowid);
    
    // Audit Log
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES ('Admin', 'System Administrator', 'CREATE_EVENT', ?, ?)
    `).run(title, `Created event: ${title} on ${date}`);

    res.json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/events/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, date, time, location, speaker, speaker_role, department, category, content_type, clearance_level, banner_url, video_url, status, materials_url } = req.body;
    const stmt = db.prepare(`
      UPDATE events 
      SET title = ?, description = ?, date = ?, time = ?, location = ?, speaker = ?, speaker_role = ?, department = ?, category = ?, content_type = ?, clearance_level = ?, banner_url = ?, video_url = ?, status = ?, materials_url = ?
      WHERE id = ?
    `);
    stmt.run(
      title, description, date, time, location, speaker, speaker_role, department, category, content_type, clearance_level, banner_url, video_url, status, materials_url, id
    );
    const updated = db.prepare("SELECT * FROM events WHERE id = ?").get(id);

    // Audit Log
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES ('Admin', 'System Administrator', 'UPDATE_EVENT', ?, ?)
    `).run(title, `Updated event: ${title}`);

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const id = req.params.id;
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    db.prepare("DELETE FROM events WHERE id = ?").run(id);

    // Audit Log
    db.prepare(`
      INSERT INTO audit_logs (actor_name, actor_role, action, target, details)
      VALUES ('Admin', 'System Administrator', 'DELETE_EVENT', ?, ?)
    `).run(event.title, `Deleted event ID: ${id}`);

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Feedtech Video Portal Demo is running on:`);
  console.log(` http://localhost:${PORT}`);
  console.log(` SQLite Database: ${dbPath}`);
  console.log(`=======================================================`);
});
