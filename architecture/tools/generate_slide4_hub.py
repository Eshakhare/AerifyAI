import pptx
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR

pptx_path = r'd:\olderEdrive\EshaProjects\AerifyAI\AerifyAI_AI_Builder_Cup_Pitch_Deck.pptx'
prs = pptx.Presentation(pptx_path)

# Slide 4 is at index 4
s4 = prs.slides[4]

# Remove shapes beyond base shapes
while len(s4.shapes) > 4:
    sp = s4.shapes[-1]
    sp._element.getparent().remove(sp._element)

# Add full-width light canvas
canvas = s4.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(0), Emu(507359), Emu(9144000), Emu(4636141))
canvas.fill.solid()
canvas.fill.fore_color.rgb = RGBColor(248, 250, 252) # Soft slate-50
canvas.line.fill.background()

# Style Title Text Box (Shape 3)
for shape in s4.shapes:
    if shape.has_text_frame and 'features' in shape.text.lower():
        shape.left = Emu(400000)
        shape.top = Emu(560000)
        shape.width = Emu(8344000)
        shape.height = Emu(620000)
        tf = shape.text_frame
        tf.clear()
        p0 = tf.paragraphs[0]
        p0.text = 'List of features offered by the solution'
        p0.font.name = 'Google Sans'
        p0.font.size = Pt(21)
        p0.font.bold = True
        p0.font.color.rgb = RGBColor(15, 23, 42)
        
        p1 = tf.add_paragraph()
        p1.text = 'THE AERIFY AI INTEGRATED MUNICIPAL & CIVIC ECOSYSTEM'
        p1.font.name = 'Google Sans'
        p1.font.size = Pt(8.5)
        p1.font.bold = True
        p1.font.color.rgb = RGBColor(100, 116, 139)

# -----------------------------------------------------------------
# 4 ORBITAL FEATURE CARDS AROUND CENTER
# -----------------------------------------------------------------
card_w = Emu(3150000)
card_h = Emu(1650000)

tl_left, tl_top = Emu(400000), Emu(1240000)
tr_left, tr_top = Emu(5594000), Emu(1240000)
bl_left, bl_top = Emu(400000), Emu(3260000)
br_left, br_top = Emu(5594000), Emu(3260000)

cards_config = [
    {
        'left': tl_left, 'top': tl_top,
        'tag': '01 // PUBLIC INTELLIGENCE',
        'title': '🌐 National Map & Directives',
        'theme_color': RGBColor(66, 133, 244), # Google Blue
        'card_bg': RGBColor(240, 247, 255),
        'bullets': [
            ('Auto-GPS State & District Map: ', 'Vector map with multi-state selector & reset.'),
            ('Near You Card & Pollen Risk: ', 'Live 500m street AQI, 6 chemicals & 3-day allergy risk.'),
            ('Statutory Policy Directives: ', 'Real-time state orders (Odd-Even, Firecracker Ban, GRAP-IV).')
        ]
    },
    {
        'left': tr_left, 'top': tr_top,
        'tag': '02 // CITIZEN PROTECTION',
        'title': '🛡️ Pin & Monitor Civic Places',
        'theme_color': RGBColor(52, 168, 83), # Google Green
        'card_bg': RGBColor(240, 253, 244),
        'bullets': [
            ('Privacy-First Pinning: ', 'Pin home, school, or work with 100% user privacy.'),
            ('30-Day Action Ledger: ', 'Displays municipal clean-ups conducted in pinned spots.'),
            ('Pre/Post AQI Delta Reports: ', 'Quick [Show Air Report] drawer & verified reduction views.')
        ]
    },
    {
        'left': bl_left, 'top': bl_top,
        'tag': '03 // CAUSAL VERIFICATION',
        'title': '⚙️ Causal DiD & Vertex AI',
        'theme_color': RGBColor(234, 67, 53), # Google Red
        'card_bg': RGBColor(254, 242, 242),
        'bullets': [
            ('Treated vs. Control 500m Pairing: ', 'Mathematically isolates net particulate reduction.'),
            ('Weather Confounder Filters: ', 'Removes false positives from wind shifts (>30°) & rain.'),
            ('Vertex AI Briefs & Badges: ', 'Gemini 2.5 Flash-Lite executive briefs & Verified tags.')
        ]
    },
    {
        'left': br_left, 'top': br_top,
        'tag': '04 // MUNICIPAL DISPATCH',
        'title': '🚜 Field Operations & 4 Timers',
        'theme_color': RGBColor(245, 158, 11), # Google Amber
        'card_bg': RGBColor(254, 252, 232),
        'bullets': [
            ('Gov Field Operation Dispatch: ', 'Assign anti-smog guns, sweepers & misting units.'),
            ('Configurable 4-Stage Timers: ', 'Cloud polling at +15s, +3h, +6h, +24h (custom 15s to 3d).'),
            ('Compact List & Details Drawer: ', 'Operational split (Pending vs. Measuring) with timeline.')
        ]
    }
]

# -----------------------------------------------------------------
# CONNECTOR LINES (Center to 4 corners)
# -----------------------------------------------------------------
cx, cy = Emu(4572000), Emu(3060000)

lines_coords = [
    (tl_left + card_w, tl_top + card_h, cx, cy, RGBColor(66, 133, 244)),
    (tr_left, tr_top + card_h, cx, cy, RGBColor(52, 168, 83)),
    (bl_left + card_w, bl_top, cx, cy, RGBColor(234, 67, 53)),
    (br_left, br_top, cx, cy, RGBColor(245, 158, 11))
]

for x1, y1, x2, y2, color in lines_coords:
    line = s4.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    line.line.color.rgb = color
    line.line.width = Pt(1.5)

# Render the 4 cards
for c in cards_config:
    card = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c['left'], c['top'], card_w, card_h)
    card.fill.solid()
    card.fill.fore_color.rgb = c['card_bg']
    card.line.color.rgb = c['theme_color']
    card.line.width = Pt(1.75)
    
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = Pt(10)
    tf.margin_top = Pt(8)
    tf.margin_right = Pt(10)
    tf.margin_bottom = Pt(6)
    
    # Tag
    p_tag = tf.paragraphs[0]
    p_tag.text = c['tag']
    p_tag.font.name = 'Google Sans'
    p_tag.font.size = Pt(7.5)
    p_tag.font.bold = True
    p_tag.font.color.rgb = c['theme_color']
    p_tag.space_after = Pt(1)
    
    # Title
    p_t = tf.add_paragraph()
    p_t.text = c['title']
    p_t.font.name = 'Google Sans'
    p_t.font.size = Pt(11.5)
    p_t.font.bold = True
    p_t.font.color.rgb = RGBColor(15, 23, 42)
    p_t.space_after = Pt(4)
    
    # Bullets
    for pre, bdy in c['bullets']:
        pb = tf.add_paragraph()
        pb.space_after = Pt(2.5)
        
        r_pre = pb.add_run()
        r_pre.text = f"• {pre}"
        r_pre.font.name = 'Google Sans'
        r_pre.font.size = Pt(8.5)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(30, 41, 59)
        
        r_bdy = pb.add_run()
        r_bdy.text = bdy
        r_bdy.font.name = 'Google Sans'
        r_bdy.font.size = Pt(8.5)
        r_bdy.font.color.rgb = RGBColor(71, 85, 105)

# -----------------------------------------------------------------
# CENTER HUB CIRCLE (AERIFY AI SYSTEM WITH GOOGLE APIS)
# -----------------------------------------------------------------
circle_d = Emu(1900000)
circle_left = cx - circle_d // 2
circle_top = cy - circle_d // 2

center_circle = s4.shapes.add_shape(MSO_SHAPE.OVAL, circle_left, circle_top, circle_d, circle_d)
center_circle.fill.solid()
center_circle.fill.fore_color.rgb = RGBColor(15, 23, 42) # Slate 900
center_circle.line.color.rgb = RGBColor(66, 133, 244)   # Google Blue accent ring
center_circle.line.width = Pt(3.0)

ctf = center_circle.text_frame
ctf.word_wrap = True
ctf.margin_left = Pt(8)
ctf.margin_top = Pt(12)
ctf.margin_right = Pt(8)
ctf.margin_bottom = Pt(8)

cp0 = ctf.paragraphs[0]
cp0.alignment = pptx.enum.text.PP_ALIGN.CENTER
r_cicon = cp0.add_run()
r_cicon.text = "🧭"
r_cicon.font.size = Pt(15)

cp1 = ctf.add_paragraph()
cp1.alignment = pptx.enum.text.PP_ALIGN.CENTER
r_cname = cp1.add_run()
r_cname.text = "Aerify AI"
r_cname.font.name = 'Google Sans'
r_cname.font.size = Pt(13.5)
r_cname.font.bold = True
r_cname.font.color.rgb = RGBColor(255, 255, 255)

cp2 = ctf.add_paragraph()
cp2.alignment = pptx.enum.text.PP_ALIGN.CENTER
r_csub = cp2.add_run()
r_csub.text = "Unified Clean Air Action Hub"
r_csub.font.name = 'Google Sans'
r_csub.font.size = Pt(8)
r_csub.font.color.rgb = RGBColor(148, 163, 184)

cp3 = ctf.add_paragraph()
cp3.alignment = pptx.enum.text.PP_ALIGN.CENTER
r_ctech = cp3.add_run()
r_ctech.text = "Google APIs • Vertex AI • PostGIS"
r_ctech.font.name = 'Google Sans'
r_ctech.font.size = Pt(7.5)
r_ctech.font.bold = True
r_ctech.font.color.rgb = RGBColor(138, 180, 248)

prs.save(pptx_path)
print('Slide 4 successfully regenerated with 100% user privacy text and Google APIs credit!')
