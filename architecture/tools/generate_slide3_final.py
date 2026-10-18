import pptx
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

pptx_path = r'd:\olderEdrive\EshaProjects\AerifyAI\AerifyAI_AI_Builder_Cup_Pitch_Deck.pptx'
prs = pptx.Presentation(pptx_path)

# Slide 3 is at index 3
s3 = prs.slides[3]

# Base shapes count: keep header picture(s) and bottom line, remove test shapes if any
# Let's inspect base shapes on Slide 3
# In Slide 3, base shapes are: Picture(s), AutoShape bottom line, and Text Box (title).
# We add a clean light canvas from top=507359 down to bottom.
# First, remove any custom shapes beyond base shapes.
base_shape_count = 0
for sp in s3.shapes:
    if 'Google Shape' in sp.name:
        base_shape_count += 1

while len(s3.shapes) > 4:
    sp = s3.shapes[-1]
    sp._element.getparent().remove(sp._element)

# Add full-width light canvas below the black header banner
canvas = s3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(0), Emu(507359), Emu(9144000), Emu(4636141))
canvas.fill.solid()
canvas.fill.fore_color.rgb = RGBColor(248, 250, 252) # Soft clean slate-50
canvas.line.fill.background() # No border line

# Style Title Text Box (Shape 3)
for shape in s3.shapes:
    if shape.has_text_frame and 'Opportunities' in shape.text:
        shape.left = Emu(400000)
        shape.top = Emu(560000)
        shape.width = Emu(8344000)
        shape.height = Emu(620000)
        tf = shape.text_frame
        tf.clear()
        p0 = tf.paragraphs[0]
        p0.text = 'Opportunities'
        p0.font.name = 'Google Sans'
        p0.font.size = Pt(21)
        p0.font.bold = True
        p0.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
        
        p1 = tf.add_paragraph()
        p1.text = 'HOW WE DIFFER  •  THE CAUSAL MECHANISM  •  CORE GOOGLE USP'
        p1.font.name = 'Google Sans'
        p1.font.size = Pt(8.5)
        p1.font.bold = True
        p1.font.color.rgb = RGBColor(100, 116, 139) # Slate 500

# -------------------------------------------------------------
# TOP SECTION: 4 Downward-Arrow Comparison Cards (How We Differ)
# -------------------------------------------------------------
top_card_top = Emu(1220000)
top_card_h = Emu(1340000)
top_card_w = Emu(1981000)
top_card_lefts = [Emu(400000), Emu(2521000), Emu(4642000), Emu(6763000)]

diff_cards_data = [
    {
        'tag': 'PARADIGM',
        'legacy_label': '🔴 Legacy Display',
        'legacy_text': 'Static AQI Scores',
        'aerify_label': '🟢 Aerify AI Solution',
        'aerify_text': 'Causal Action Auditing',
        'border_color': RGBColor(234, 67, 53) # Google Red
    },
    {
        'tag': 'COVERAGE',
        'legacy_label': '🔴 Legacy Stations',
        'legacy_text': '~40 Sparse Towers',
        'aerify_label': '🟢 Aerify AI Solution',
        'aerify_text': 'Continuous 500m Sat Grid',
        'border_color': RGBColor(245, 158, 11) # Google Amber
    },
    {
        'tag': 'MUNICIPAL GOV',
        'legacy_label': '🔴 Legacy Operations',
        'legacy_text': 'Blind Municipal Spending',
        'aerify_label': '🟢 Aerify AI Solution',
        'aerify_text': 'Verified Before/After Deltas',
        'border_color': RGBColor(66, 133, 244) # Google Blue
    },
    {
        'tag': 'CITIZEN IMPACT',
        'legacy_label': '🔴 Legacy Civic State',
        'legacy_text': 'Passive Alert Anxiety',
        'aerify_label': '🟢 Aerify AI Solution',
        'aerify_text': 'Pin & Monitor Civic Proof',
        'border_color': RGBColor(52, 168, 83) # Google Green
    }
]

for idx, c in enumerate(diff_cards_data):
    left = top_card_lefts[idx]
    card = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top_card_top, top_card_w, top_card_h)
    card.fill.solid()
    card.fill.fore_color.rgb = RGBColor(255, 255, 255) # Clean White
    card.line.color.rgb = c['border_color']
    card.line.width = Pt(1.5)
    
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = Pt(8)
    tf.margin_top = Pt(8)
    tf.margin_right = Pt(8)
    tf.margin_bottom = Pt(6)
    
    # Tag
    p_tag = tf.paragraphs[0]
    p_tag.text = c['tag']
    p_tag.font.name = 'Google Sans'
    p_tag.font.size = Pt(7.5)
    p_tag.font.bold = True
    p_tag.font.color.rgb = RGBColor(100, 116, 139)
    p_tag.space_after = Pt(2)
    
    # Legacy text
    p_leg = tf.add_paragraph()
    r_leg_lbl = p_leg.add_run()
    r_leg_lbl.text = c['legacy_text']
    r_leg_lbl.font.name = 'Google Sans'
    r_leg_lbl.font.size = Pt(9.5)
    r_leg_lbl.font.bold = True
    r_leg_lbl.font.color.rgb = RGBColor(185, 28, 28) # Red 700
    p_leg.space_after = Pt(1)
    
    # Down arrow
    p_arr = tf.add_paragraph()
    r_arr = p_arr.add_run()
    r_arr.text = '     ⬇'
    r_arr.font.name = 'Google Sans'
    r_arr.font.size = Pt(9)
    r_arr.font.bold = True
    r_arr.font.color.rgb = c['border_color']
    p_arr.space_after = Pt(1)
    
    # Aerify AI text
    p_aero = tf.add_paragraph()
    r_aero = p_aero.add_run()
    r_aero.text = c['aerify_text']
    r_aero.font.name = 'Google Sans'
    r_aero.font.size = Pt(9.5)
    r_aero.font.bold = True
    r_aero.font.color.rgb = RGBColor(15, 23, 42) # Slate 900

# -------------------------------------------------------------
# BOTTOM SECTION: 2 Side-by-Side Hero Cards (How Solves & Core USP)
# -------------------------------------------------------------
bottom_top = Emu(2660000)
bottom_h = Emu(2360000)
bottom_w = Emu(4072000)

# Card 1: ⚙️ HOW IT SOLVES (Google Blue)
c1_left = Emu(400000)
card_solves = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c1_left, bottom_top, bottom_w, bottom_h)
card_solves.fill.solid()
card_solves.fill.fore_color.rgb = RGBColor(240, 247, 255) # Light Blue
card_solves.line.color.rgb = RGBColor(66, 133, 244) # Google Blue
card_solves.line.width = Pt(2.0)

tf1 = card_solves.text_frame
tf1.word_wrap = True
tf1.margin_left = Pt(12)
tf1.margin_top = Pt(10)
tf1.margin_right = Pt(12)
tf1.margin_bottom = Pt(8)

p0 = tf1.paragraphs[0]
p0.text = '⚙️  02 // THE CAUSAL MECHANISM'
p0.font.name = 'Google Sans'
p0.font.size = Pt(8.5)
p0.font.bold = True
p0.font.color.rgb = RGBColor(26, 115, 232)
p0.space_after = Pt(2)

p1 = tf1.add_paragraph()
p1.text = 'Difference-in-Differences (DiD) Engine'
p1.font.name = 'Google Sans'
p1.font.size = Pt(12.5)
p1.font.bold = True
p1.font.color.rgb = RGBColor(15, 23, 42)
p1.space_after = Pt(5)

solves_bullets = [
    ('🎯 Treated vs. Control Pairing: ', 'Pairs clean-up spots with untouched control zones (2–3 km) to cut ambient weather bias.'),
    ('⏱️ 4-Timed Cloud Checkpoints: ', 'Auto-samples air at +15s, +3h, +6h, +24h (configurable to 3d) to measure true duration.'),
    ('🌬️ Confounder-Aware Validation: ', 'Cross-checks wind shifts (>30°) & rain (>0.2mm/h) via Google Weather API to eliminate false positives.'),
    ('🏷️ Tamper-Proof Evidence Badges: ', 'Automatically tags outcomes as Verified Improvement, Confounded, or Inconclusive.')
]

for prefix, body in solves_bullets:
    pb = tf1.add_paragraph()
    pb.space_after = Pt(3.5)
    
    r_pre = pb.add_run()
    r_pre.text = prefix
    r_pre.font.name = 'Google Sans'
    r_pre.font.size = Pt(8.8)
    r_pre.font.bold = True
    r_pre.font.color.rgb = RGBColor(30, 41, 59)
    
    r_txt = pb.add_run()
    r_txt.text = body
    r_txt.font.name = 'Google Sans'
    r_txt.font.size = Pt(8.8)
    r_txt.font.color.rgb = RGBColor(71, 85, 105)

# Card 2: ⭐ CORE USP: Google-Native Ecosystem (Google Green)
c2_left = Emu(4672000)
card_usp = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c2_left, bottom_top, bottom_w, bottom_h)
card_usp.fill.solid()
card_usp.fill.fore_color.rgb = RGBColor(240, 253, 244) # Light Green
card_usp.line.color.rgb = RGBColor(52, 168, 83) # Google Green
card_usp.line.width = Pt(2.0)

tf2 = card_usp.text_frame
tf2.word_wrap = True
tf2.margin_left = Pt(12)
tf2.margin_top = Pt(10)
tf2.margin_right = Pt(12)
tf2.margin_bottom = Pt(8)

p0_2 = tf2.paragraphs[0]
p0_2.text = '⭐  03 // UNIQUE SELLING PROPOSITION'
p0_2.font.name = 'Google Sans'
p0_2.font.size = Pt(8.5)
p0_2.font.bold = True
p0_2.font.color.rgb = RGBColor(21, 128, 61)
p0_2.space_after = Pt(2)

p1_2 = tf2.add_paragraph()
p1_2.text = 'Google-Native Evidence Ecosystem'
p1_2.font.name = 'Google Sans'
p1_2.font.size = Pt(12.5)
p1_2.font.bold = True
p1_2.font.color.rgb = RGBColor(15, 23, 42)
p1_2.space_after = Pt(5)

usp_bullets = [
    ('🛰️ Pure Google Environmental APIs: ', 'Combines Google Air Quality (500m + 30d history), Google Pollen API, & Maps Vector SDK.'),
    ('🧠 Vertex AI (Gemini 2.5 Flash-Lite): ', 'Automated plain-English executive briefings and statutory gazette verification (GRAP-IV).'),
    ('🛡️ Privacy-First Civic Protection: ', 'Citizens pin and monitor places they care about with 100% zero background GPS tracking.'),
    ('🔒 Zero-Password Enterprise Security: ', 'Cloud SQL PostGIS with IAM database authentication for official municipal dispatch.')
]

for prefix, body in usp_bullets:
    pb = tf2.add_paragraph()
    pb.space_after = Pt(3.5)
    
    r_pre = pb.add_run()
    r_pre.text = prefix
    r_pre.font.name = 'Google Sans'
    r_pre.font.size = Pt(8.8)
    r_pre.font.bold = True
    r_pre.font.color.rgb = RGBColor(30, 41, 59)
    
    r_txt = pb.add_run()
    r_txt.text = body
    r_txt.font.name = 'Google Sans'
    r_txt.font.size = Pt(8.8)
    r_txt.font.color.rgb = RGBColor(71, 85, 105)

prs.save(pptx_path)
print('Slide 3 exclusively generated and saved in PPTX!')
