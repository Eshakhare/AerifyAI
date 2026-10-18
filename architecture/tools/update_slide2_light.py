import pptx
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

prs = pptx.Presentation(r'd:\olderEdrive\EshaProjects\AerifyAI\AerifyAI_AI_Builder_Cup_Pitch_Deck.pptx')
s2 = prs.slides[2]

# Remove shapes beyond base 4 (banner, bottom line, title, canvas)
while len(s2.shapes) > 4:
    sp = s2.shapes[-1]
    sp._element.getparent().remove(sp._element)

# Ensure title is properly positioned on light canvas
for shape in s2.shapes:
    if shape.has_text_frame and 'Brief about the idea' in shape.text:
        shape.left = Emu(450000)
        shape.top = Emu(580000)
        shape.width = Emu(8250000)
        shape.height = Emu(650000)
        tf = shape.text_frame
        tf.clear()
        p0 = tf.paragraphs[0]
        p0.text = 'Brief about the idea'
        p0.font.name = 'Google Sans'
        p0.font.size = Pt(21)
        p0.font.bold = True
        p0.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
        
        p1 = tf.add_paragraph()
        p1.text = 'EXECUTIVE SUMMARY & NATIONAL PLATFORM SCOPE'
        p1.font.name = 'Google Sans'
        p1.font.size = Pt(8.5)
        p1.font.bold = True
        p1.font.color.rgb = RGBColor(100, 116, 139) # Slate 500

# 4 Google-colored cards on light background
col_lefts = [Emu(450000), Emu(4700000)]
row_tops = [Emu(1300000), Emu(3020000)]
card_w = Emu(4000000)
card_h = Emu(1600000)

google_cards = [
    {
        'col': 0, 'row': 0,
        'badge_icon': '🌐',
        'theme_color': RGBColor(66, 133, 244),   # Google Blue (#4285F4)
        'card_bg': RGBColor(240, 247, 255),       # Soft Sky Light Blue (#F0F7FF)
        'header_color': RGBColor(26, 115, 232),   # Deep Blue (#1A73E8)
        'title': 'Action-Driven Clean Air Platform',
        'subtitle': '01 // PLATFORM DEFINITION',
        'points': [
            ('Google-Native Intelligence: ', 'Transforms passive pollution alerts into scientifically verified municipal clean-air actions.'),
            ('Ground-to-Satellite Sync: ', 'Fuses Google 500m satellite telemetry directly with on-the-ground municipal field operations.')
        ]
    },
    {
        'col': 1, 'row': 0,
        'badge_icon': '⚠️',
        'theme_color': RGBColor(245, 158, 11),   # Google Amber/Yellow (#F59E0B)
        'card_bg': RGBColor(254, 252, 232),       # Soft Warm Yellow (#FEFCE8)
        'header_color': RGBColor(180, 83, 9),     # Deep Amber (#B45309)
        'title': 'Severe Smog & Unmeasured Spending',
        'subtitle': '02 // URBAN CRISIS & NEED',
        'points': [
            ('Megacity Smog Spikes: ', 'Tens of millions face hazardous seasonal air pollution spikes across urban and industrial corridors.'),
            ('Unverified Municipal Spend: ', 'Crores spent on anti-smog guns & sweepers with zero proof whether actions actually worked.')
        ]
    },
    {
        'col': 0, 'row': 1,
        'badge_icon': '🎯',
        'theme_color': RGBColor(52, 168, 83),    # Google Green (#34A853)
        'card_bg': RGBColor(240, 253, 244),       # Soft Mint Light Green (#F0FDF4)
        'header_color': RGBColor(21, 128, 61),    # Deep Green (#15803D)
        'title': 'Verify Impact & Build Civic Trust',
        'subtitle': '03 // CORE MISSION & GOAL',
        'points': [
            ('Scientific Attribution: ', 'Distinguishes genuine clean-up particulate reduction from ambient wind, rain, and weather shifts.'),
            ('Actionable Proof: ', 'Provides transparent, data-backed evidence so authorities invest only in solutions that truly work.')
        ]
    },
    {
        'col': 1, 'row': 1,
        'badge_icon': '👥',
        'theme_color': RGBColor(234, 67, 53),    # Google Red (#EA4335)
        'card_bg': RGBColor(254, 242, 242),       # Soft Rose Light Red (#FEF2F2)
        'header_color': RGBColor(185, 28, 28),    # Deep Red (#B91C1C)
        'title': 'Citizens, Municipalities & Regulators',
        'subtitle': '04 // TARGET STAKEHOLDERS',
        'points': [
            ('Municipal Teams (MCD/BMC): ', 'Dispatch equipment, schedule 4-interval checkpoints, and audit field efficacy.'),
            ('Citizens & Commuters: ', 'Pin & monitor places you care about (home, school, work) for 30-day verified actions & pollen risk.')
        ]
    }
]

for c in google_cards:
    left = col_lefts[c['col']]
    top = row_tops[c['row']]
    
    # Background Card shape
    card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, card_w, card_h)
    card.fill.solid()
    card.fill.fore_color.rgb = c['card_bg']
    card.line.color.rgb = c['theme_color']
    card.line.width = Pt(1.5)
    
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = Pt(13)
    tf.margin_top = Pt(9)
    tf.margin_right = Pt(13)
    tf.margin_bottom = Pt(8)
    
    # Subtitle / Category Tag with emoji badge
    p0 = tf.paragraphs[0]
    p0.text = f"{c['badge_icon']}  {c['subtitle']}"
    p0.font.name = 'Google Sans'
    p0.font.size = Pt(8.5)
    p0.font.bold = True
    p0.font.color.rgb = c['header_color']
    p0.space_after = Pt(2)
    
    # Main Headline
    p1 = tf.add_paragraph()
    p1.text = c['title']
    p1.font.name = 'Google Sans'
    p1.font.size = Pt(12)
    p1.font.bold = True
    p1.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
    p1.space_after = Pt(4)
    
    # Bullets
    for prefix, body in c['points']:
        pb = tf.add_paragraph()
        pb.space_after = Pt(2)
        
        r_dot = pb.add_run()
        r_dot.text = '• '
        r_dot.font.name = 'Google Sans'
        r_dot.font.size = Pt(9.5)
        r_dot.font.bold = True
        r_dot.font.color.rgb = c['theme_color']
        
        r_pre = pb.add_run()
        r_pre.text = prefix
        r_pre.font.name = 'Google Sans'
        r_pre.font.size = Pt(9.5)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(30, 41, 59) # Slate 800
        
        r_txt = pb.add_run()
        r_txt.text = body
        r_txt.font.name = 'Google Sans'
        r_txt.font.size = Pt(9.5)
        r_txt.font.color.rgb = RGBColor(71, 85, 105) # Slate 600

# Bottom Roadmap Banner in light theme
b_left = Emu(450000)
b_top = Emu(4740000)
b_w = Emu(8250000)
b_h = Emu(290000)

banner = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, b_left, b_top, b_w, b_h)
banner.fill.solid()
banner.fill.fore_color.rgb = RGBColor(255, 255, 255)
banner.line.color.rgb = RGBColor(66, 133, 244) # Google Blue
banner.line.width = Pt(1.25)

btf = banner.text_frame
btf.margin_left = Pt(12)
btf.margin_top = Pt(4)
btf.margin_right = Pt(12)
btf.margin_bottom = Pt(4)

bp = btf.paragraphs[0]
r_tag = bp.add_run()
r_tag.text = '💡 Live National Deployment | '
r_tag.font.name = 'Google Sans'
r_tag.font.size = Pt(9)
r_tag.font.bold = True
r_tag.font.color.rgb = RGBColor(26, 115, 232)

r_desc = bp.add_run()
r_desc.text = 'Auto-Detects State & District via GPS • Multi-State Selector & Reset • 500m Satellite Telemetry Across India'
r_desc.font.name = 'Google Sans'
r_desc.font.size = Pt(9)
r_desc.font.color.rgb = RGBColor(51, 65, 85)

prs.save(r'd:\olderEdrive\EshaProjects\AerifyAI\AerifyAI_AI_Builder_Cup_Pitch_Deck.pptx')
print('Slide 2 light theme with updated National Scope & Pin and Monitor Places generated successfully!')
