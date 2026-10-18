import pptx
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

pptx_path = r'd:\olderEdrive\EshaProjects\AerifyAI\AerifyAI_AI_Builder_Cup_Pitch_Deck.pptx'
prs = pptx.Presentation(pptx_path)

# Slide 8 is at index 8
s8 = prs.slides[8]

# Remove custom shapes beyond base shapes
while len(s8.shapes) > 4:
    sp = s8.shapes[-1]
    sp._element.getparent().remove(sp._element)

# Add full-width light canvas
canvas = s8.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(0), Emu(507359), Emu(9144000), Emu(4636141))
canvas.fill.solid()
canvas.fill.fore_color.rgb = RGBColor(248, 250, 252) # Soft slate-50
canvas.line.fill.background()

# Attractive Slide Header
for shape in s8.shapes:
    if shape.has_text_frame and ('technologies' in shape.text.lower() or 'tech' in shape.text.lower()):
        shape.left = Emu(400000)
        shape.top = Emu(540000)
        shape.width = Emu(8344000)
        shape.height = Emu(640000)
        tf = shape.text_frame
        tf.clear()
        p0 = tf.paragraphs[0]
        p0.text = 'Technologies to be used in the solution'
        p0.font.name = 'Google Sans'
        p0.font.size = Pt(21)
        p0.font.bold = True
        p0.font.color.rgb = RGBColor(15, 23, 42)
        
        p1 = tf.add_paragraph()
        p1.text = 'THE 4 CORE PILLARS OF AERIFY AI: TOOLS, TECH ICONS & ONE-LINE PURPOSES'
        p1.font.name = 'Google Sans'
        p1.font.size = Pt(8.5)
        p1.font.bold = True
        p1.font.color.rgb = RGBColor(100, 116, 139)

# ------------------------------------------------------------------------------
# 4 EXPANDED CARDS (2 columns x 2 rows) WITH ATTRACTIVE GAP
# ------------------------------------------------------------------------------
col_lefts = [Emu(400000), Emu(4744000)]
row_tops = [Emu(1260000), Emu(3060000)]
card_w = Emu(4000000)
card_h = Emu(1660000)

four_cards = [
    # Card 1: Frontend
    {
        'col': 0, 'row': 0,
        'badge_tag': '01 // FRONTEND & UI',
        'badge_bg': RGBColor(219, 234, 254), # Light blue badge
        'badge_text': RGBColor(29, 78, 216),  # Dark blue
        'theme_color': RGBColor(66, 133, 244), # Google Blue
        'card_bg': RGBColor(240, 247, 255),
        'title': 'Interactive Vector Mapping & Civic UI',
        'items': [
            '⚛️ React 19   ·   ⚡ Vite & TypeScript   ·   🎨 Tailwind CSS',
            '🗺️ Google Maps JavaScript SDK (@vis.gl/react-google-maps)'
        ],
        'purpose': 'Renders interactive 3D vector map, persistent Near You street cards, and SVG rolling trend line graphs.'
    },
    # Card 2: AI / GenAI
    {
        'col': 1, 'row': 0,
        'badge_tag': '02 // AI & GENERATIVE INTELLIGENCE',
        'badge_bg': RGBColor(243, 232, 255), # Light purple badge
        'badge_text': RGBColor(109, 40, 217), # Dark purple
        'theme_color': RGBColor(124, 58, 237), # Purple
        'card_bg': RGBColor(245, 243, 255),
        'title': 'Vertex AI & Autonomous Briefings',
        'items': [
            '☁️ Google Cloud Vertex AI   ·   🤖 Gemini 2.5 Flash-Lite',
            '🔌 Model Context Protocol (MCP)   ·   📋 Structured JSON Schemas'
        ],
        'purpose': 'Generates plain-English executive briefings, plume explanations, and verifies statutory gazette circulars.'
    },
    # Card 3: Environmental Data
    {
        'col': 0, 'row': 1,
        'badge_tag': '03 // ENVIRONMENTAL TELEMETRY',
        'badge_bg': RGBColor(220, 252, 231), # Light green badge
        'badge_text': RGBColor(21, 128, 61),  # Dark green
        'theme_color': RGBColor(52, 168, 83),  # Google Green
        'card_bg': RGBColor(240, 253, 244),
        'title': 'Hyper-Local Continuous Telemetry',
        'items': [
            '💨 Google Air Quality API (500m & 30d History)   ·   🌸 Pollen API',
            '🌦️ Google Weather API (Wind Vectors)   ·   🛰️ Sentinel-5P Satellite'
        ],
        'purpose': 'Delivers continuous 500m street ground truth, 30-day hourly history, and 3-day respiratory risk forecasts.'
    },
    # Card 4: Data & Security
    {
        'col': 1, 'row': 1,
        'badge_tag': '04 // DATA, SPATIAL & SECURITY',
        'badge_bg': RGBColor(254, 226, 226), # Light red badge
        'badge_text': RGBColor(185, 28, 28),  # Dark red
        'theme_color': RGBColor(234, 67, 53),  # Google Red
        'card_bg': RGBColor(254, 242, 242),
        'title': 'PostGIS Spatial & Zero-Password IAM',
        'items': [
            '🐘 Cloud SQL for PostgreSQL 16   ·   🌍 PostGIS Geospatial Engine',
            '🛡️ Firebase Google OAuth   ·   🔑 Cloud IAM (Zero-Static Passwords)'
        ],
        'purpose': 'Secures municipal action plans and boundaries with zero static passwords and dual-path citizen/officer RBAC.'
    }
]

for c in four_cards:
    left = col_lefts[c['col']]
    top = row_tops[c['row']]
    
    card = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, card_w, card_h)
    card.fill.solid()
    card.fill.fore_color.rgb = c['card_bg']
    card.line.color.rgb = c['theme_color']
    card.line.width = Pt(1.75)
    
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = Pt(12)
    tf.margin_top = Pt(10)
    tf.margin_right = Pt(12)
    tf.margin_bottom = Pt(8)
    
    # 1. Badge-type Tag
    p_tag = tf.paragraphs[0]
    p_tag.text = c['badge_tag']
    p_tag.font.name = 'Google Sans'
    p_tag.font.size = Pt(8)
    p_tag.font.bold = True
    p_tag.font.color.rgb = c['badge_text']
    p_tag.space_after = Pt(2)
    
    # 2. Main Title
    p_title = tf.add_paragraph()
    p_title.text = c['title']
    p_title.font.name = 'Google Sans'
    p_title.font.size = Pt(12)
    p_title.font.bold = True
    p_title.font.color.rgb = RGBColor(15, 23, 42)
    p_title.space_after = Pt(5)
    
    # 3. Tech Stack Items with Icons
    for itm in c['items']:
        p_itm = tf.add_paragraph()
        p_itm.text = itm
        p_itm.font.name = 'Google Sans'
        p_itm.font.size = Pt(8.8)
        p_itm.font.bold = True
        p_itm.font.color.rgb = RGBColor(30, 41, 59)
        p_itm.space_after = Pt(2)
    
    # 4. One-Line Purpose
    p_purp = tf.add_paragraph()
    p_purp.space_before = Pt(3)
    r_plbl = p_purp.add_run()
    r_plbl.text = '💡 Purpose: '
    r_plbl.font.name = 'Google Sans'
    r_plbl.font.size = Pt(8.5)
    r_plbl.font.bold = True
    r_plbl.font.color.rgb = c['theme_color']
    
    r_ptxt = p_purp.add_run()
    r_ptxt.text = c['purpose']
    r_ptxt.font.name = 'Google Sans'
    r_ptxt.font.size = Pt(8.5)
    r_ptxt.font.color.rgb = RGBColor(71, 85, 105)

# Bottom Banner: Google Cloud Native Summary
b_left = Emu(400000)
b_top = Emu(4760000)
b_w = Emu(8344000)
b_h = Emu(260000)

banner = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, b_left, b_top, b_w, b_h)
banner.fill.solid()
banner.fill.fore_color.rgb = RGBColor(255, 255, 255)
banner.line.color.rgb = RGBColor(66, 133, 244)
banner.line.width = Pt(1.2)

btf = banner.text_frame
btf.margin_left = Pt(10)
btf.margin_top = Pt(3)
btf.margin_right = Pt(10)
btf.margin_bottom = Pt(3)

bp = btf.paragraphs[0]
r_tag = bp.add_run()
r_tag.text = '☁️ Google Cloud Ecosystem | '
r_tag.font.name = 'Google Sans'
r_tag.font.size = Pt(8.5)
r_tag.font.bold = True
r_tag.font.color.rgb = RGBColor(26, 115, 232)

r_desc = bp.add_run()
r_desc.text = 'Zero Static Database Passwords (IAM Connector) • Serverless Cloud Run • 100% Contract Validated (validate_contracts.py)'
r_desc.font.name = 'Google Sans'
r_desc.font.size = Pt(8.5)
r_desc.font.color.rgb = RGBColor(51, 65, 85)

prs.save(pptx_path)
print('Slide 8: 4-Card Technology Stack layout generated successfully in PPTX!')
