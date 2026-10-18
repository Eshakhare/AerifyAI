import pptx
from pptx.util import Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN

pptx_path = r'd:\olderEdrive\EshaProjects\AerifyAI\AerifyAI_AI_Builder_Cup_Pitch_Deck.pptx'
prs = pptx.Presentation(pptx_path)

# Slide 5 is at index 5
s5 = prs.slides[5]

# Remove shapes beyond base 4 shapes
while len(s5.shapes) > 4:
    sp = s5.shapes[-1]
    sp._element.getparent().remove(sp._element)

# Add full-width light canvas
canvas = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(0), Emu(507359), Emu(9144000), Emu(4636141))
canvas.fill.solid()
canvas.fill.fore_color.rgb = RGBColor(248, 250, 252) # Soft slate-50
canvas.line.fill.background()

# Style Title Text Box (Shape 3)
for shape in s5.shapes:
    if shape.has_text_frame and ('process' in shape.text.lower() or 'use-case' in shape.text.lower()):
        shape.left = Emu(350000)
        shape.top = Emu(550000)
        shape.width = Emu(8444000)
        shape.height = Emu(600000)
        tf = shape.text_frame
        tf.clear()
        p0 = tf.paragraphs[0]
        p0.text = 'Process flow diagram or Use-case diagram'
        p0.font.name = 'Google Sans'
        p0.font.size = Pt(20)
        p0.font.bold = True
        p0.font.color.rgb = RGBColor(15, 23, 42)
        
        p1 = tf.add_paragraph()
        p1.text = 'END-TO-END PRODUCT FLOW: CITIZEN JOURNEY • AI INTELLIGENCE • AUTHORIZED OFFICER WORKFLOW'
        p1.font.name = 'Google Sans'
        p1.font.size = Pt(8)
        p1.font.bold = True
        p1.font.color.rgb = RGBColor(100, 116, 139)

# ==============================================================================
# 3 HORIZONTAL SWIMLANES
# ==============================================================================
lane_left = Emu(350000)
lane_w = Emu(8444000)

# Lane A: Citizen (top=1160000, h=1060000)
lane_a = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, lane_left, Emu(1160000), lane_w, Emu(1060000))
lane_a.fill.solid()
lane_a.fill.fore_color.rgb = RGBColor(240, 247, 255) # Soft Blue tint
lane_a.line.color.rgb = RGBColor(186, 215, 255)
lane_a.line.width = Pt(1)

# Lane B: AI Intelligence (top=2280000, h=960000)
lane_b = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, lane_left, Emu(2280000), lane_w, Emu(960000))
lane_b.fill.solid()
lane_b.fill.fore_color.rgb = RGBColor(245, 243, 255) # Soft Purple tint
lane_b.line.color.rgb = RGBColor(221, 214, 254)
lane_b.line.width = Pt(1)

# Lane C: Officer Workflow (top=3300000, h=1680000)
lane_c = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, lane_left, Emu(3300000), lane_w, Emu(1680000))
lane_c.fill.solid()
lane_c.fill.fore_color.rgb = RGBColor(254, 252, 232) # Soft Amber tint
lane_c.line.color.rgb = RGBColor(254, 240, 138)
lane_c.line.width = Pt(1)

# ------------------------------------------------------------------------------
# LANE HEADERS / BADGES (Left column inside lanes)
# ------------------------------------------------------------------------------
def add_lane_badge(left, top, text, bg_rgb, text_rgb):
    badge = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, Emu(1500000), Emu(260000))
    badge.fill.solid()
    badge.fill.fore_color.rgb = bg_rgb
    badge.line.fill.background()
    tf = badge.text_frame
    tf.margin_top = Pt(2)
    p = tf.paragraphs[0]
    p.text = text
    p.font.name = 'Google Sans'
    p.font.size = Pt(7.5)
    p.font.bold = True
    p.font.color.rgb = text_rgb
    p.alignment = PP_ALIGN.CENTER
    return badge

add_lane_badge(Emu(400000), Emu(1200000), 'LANE 1: CITIZEN JOURNEY', RGBColor(66, 133, 244), RGBColor(255, 255, 255))
add_lane_badge(Emu(400000), Emu(2320000), 'LANE 2: AI INTELLIGENCE', RGBColor(124, 58, 237), RGBColor(255, 255, 255))
add_lane_badge(Emu(400000), Emu(3340000), 'LANE 3: OFFICER WORKFLOW', RGBColor(217, 119, 6), RGBColor(255, 255, 255))

# ==============================================================================
# SECTION A: PUBLIC / CITIZEN EXPERIENCE
# ==============================================================================
# Step 1: Open Aerify AI
c_step1 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(2000000), Emu(1200000), Emu(1700000), Emu(860000))
c_step1.fill.solid()
c_step1.fill.fore_color.rgb = RGBColor(255, 255, 255)
c_step1.line.color.rgb = RGBColor(66, 133, 244)
c_step1.line.width = Pt(1.5)
tf1 = c_step1.text_frame
tf1.word_wrap = True
tf1.margin_left = Pt(6)
tf1.margin_top = Pt(6)
p = tf1.paragraphs[0]
p.text = '🌍 1. Open Aerify AI'
p.font.name = 'Google Sans'
p.font.size = Pt(9)
p.font.bold = True
p.font.color.rgb = RGBColor(15, 23, 42)
p2 = tf1.add_paragraph()
p2.text = '• No login required\n• Instant auto-GPS detection'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7.5)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Step 2: Explore Local AQI
c_step2 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(3950000), Emu(1200000), Emu(1850000), Emu(860000))
c_step2.fill.solid()
c_step2.fill.fore_color.rgb = RGBColor(255, 255, 255)
c_step2.line.color.rgb = RGBColor(66, 133, 244)
c_step2.line.width = Pt(1.5)
tf2 = c_step2.text_frame
tf2.word_wrap = True
tf2.margin_left = Pt(6)
tf2.margin_top = Pt(6)
p = tf2.paragraphs[0]
p.text = '📍 2. Explore Local AQI'
p.font.name = 'Google Sans'
p.font.size = Pt(9)
p.font.bold = True
p.font.color.rgb = RGBColor(15, 23, 42)
p2 = tf2.add_paragraph()
p2.text = '• Street AQI & 6 chemicals\n• Pollen allergy risk & weather'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7.5)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Step 3: View Govt Actions
c_step3 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(6050000), Emu(1200000), Emu(1850000), Emu(860000))
c_step3.fill.solid()
c_step3.fill.fore_color.rgb = RGBColor(255, 255, 255)
c_step3.line.color.rgb = RGBColor(52, 168, 83)
c_step3.line.width = Pt(2.0)
tf3 = c_step3.text_frame
tf3.word_wrap = True
tf3.margin_left = Pt(6)
tf3.margin_top = Pt(6)
p = tf3.paragraphs[0]
p.text = '🏛️ 3. View Govt Actions'
p.font.name = 'Google Sans'
p.font.size = Pt(9)
p.font.bold = True
p.font.color.rgb = RGBColor(21, 128, 61)
p2 = tf3.add_paragraph()
p2.text = '• Active orders (Odd-Even)\n• Verified clean-up outcomes'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7.5)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Optional Google Auth Branch on top-right
c_opt = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(400000), Emu(1520000), Emu(1450000), Emu(600000))
c_opt.fill.solid()
c_opt.fill.fore_color.rgb = RGBColor(255, 255, 255)
c_opt.line.color.rgb = RGBColor(100, 116, 139)
c_opt.line.width = Pt(1)
tf_opt = c_opt.text_frame
tf_opt.word_wrap = True
tf_opt.margin_left = Pt(4)
tf_opt.margin_top = Pt(4)
p = tf_opt.paragraphs[0]
p.text = '🔐 Optional Google Login'
p.font.name = 'Google Sans'
p.font.size = Pt(7.5)
p.font.bold = True
p.font.color.rgb = RGBColor(30, 41, 59)
p2 = tf_opt.add_paragraph()
p2.text = '📌 Pin & Monitor Places'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7)
p2.font.color.rgb = RGBColor(22, 101, 52)

# Arrows in Lane A
def add_arrow(x1, y1, x2, y2, color=RGBColor(66, 133, 244)):
    arr = s5.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    arr.line.color.rgb = color
    arr.line.width = Pt(1.5)
    return arr

add_arrow(Emu(3700000), Emu(1630000), Emu(3950000), Emu(1630000))
add_arrow(Emu(5800000), Emu(1630000), Emu(6050000), Emu(1630000))

# ==============================================================================
# SECTION B: AERIFY AI POLLUTION INTELLIGENCE
# ==============================================================================
b_step1 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(2000000), Emu(2350000), Emu(1800000), Emu(780000))
b_step1.fill.solid()
b_step1.fill.fore_color.rgb = RGBColor(255, 255, 255)
b_step1.line.color.rgb = RGBColor(124, 58, 237)
b_step1.line.width = Pt(1.5)
btf1 = b_step1.text_frame
btf1.word_wrap = True
btf1.margin_left = Pt(6)
btf1.margin_top = Pt(5)
p = btf1.paragraphs[0]
p.text = '📡 1. Collect Evidence'
p.font.name = 'Google Sans'
p.font.size = Pt(8.5)
p.font.bold = True
p.font.color.rgb = RGBColor(15, 23, 42)
p2 = btf1.add_paragraph()
p2.text = '• Google 500m satellite grid\n• CPCB stations & weather'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7.5)
p2.font.color.rgb = RGBColor(71, 85, 105)

b_step2 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(4050000), Emu(2350000), Emu(1800000), Emu(780000))
b_step2.fill.solid()
b_step2.fill.fore_color.rgb = RGBColor(255, 255, 255)
b_step2.line.color.rgb = RGBColor(124, 58, 237)
b_step2.line.width = Pt(1.5)
btf2 = b_step2.text_frame
btf2.word_wrap = True
btf2.margin_left = Pt(6)
btf2.margin_top = Pt(5)
p = btf2.paragraphs[0]
p.text = '🧠 2. Analyze & Cross-Check'
p.font.name = 'Google Sans'
p.font.size = Pt(8.5)
p.font.bold = True
p.font.color.rgb = RGBColor(15, 23, 42)
p2 = btf2.add_paragraph()
p2.text = '• Identify pollution hotspots\n• Cross-check wind & rain'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7.5)
p2.font.color.rgb = RGBColor(71, 85, 105)

b_step3 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(6100000), Emu(2350000), Emu(1950000), Emu(780000))
b_step3.fill.solid()
b_step3.fill.fore_color.rgb = RGBColor(255, 255, 255)
b_step3.line.color.rgb = RGBColor(124, 58, 237)
b_step3.line.width = Pt(1.5)
btf3 = b_step3.text_frame
btf3.word_wrap = True
btf3.margin_left = Pt(6)
btf3.margin_top = Pt(5)
p = btf3.paragraphs[0]
p.text = '🎯 3. Recommend Actions'
p.font.name = 'Google Sans'
p.font.size = Pt(8.5)
p.font.bold = True
p.font.color.rgb = RGBColor(109, 40, 217)
p2 = btf3.add_paragraph()
p2.text = '• Target priority corridors\n• Suggest guns/sweepers'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7.5)
p2.font.color.rgb = RGBColor(71, 85, 105)

add_arrow(Emu(3800000), Emu(2740000), Emu(4050000), Emu(2740000), RGBColor(124, 58, 237))
add_arrow(Emu(5850000), Emu(2740000), Emu(6100000), Emu(2740000), RGBColor(124, 58, 237))

# Downward arrow from AI to Officer (AI recommends; human decides)
down_arr = s5.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Emu(7070000), Emu(3130000), Emu(7070000), Emu(3350000))
down_arr.line.color.rgb = RGBColor(124, 58, 237)
down_arr.line.width = Pt(1.5)

# ==============================================================================
# SECTION C: AUTHORIZED GOVERNMENT OFFICER WORKFLOW
# ==============================================================================
# Sequence:
# Step 1: Officer Login
# Step 2: Review Recs
# Step 3: Approve & Assign
# Step 4: Track Progress
# Step 5: Verify Before/After
# Step 6: Decision Diamond -> YES (Publish) / NO (Follow-up)

c_w = Emu(1300000)
c_h = Emu(780000)
c_top_row = Emu(3400000)

# Step 1: Officer Login
o1 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(400000), c_top_row, c_w, c_h)
o1.fill.solid()
o1.fill.fore_color.rgb = RGBColor(255, 255, 255)
o1.line.color.rgb = RGBColor(217, 119, 6)
o1.line.width = Pt(1.2)
tf = o1.text_frame
tf.word_wrap = True
tf.margin_left = Pt(4)
tf.margin_top = Pt(4)
p = tf.paragraphs[0]
p.text = '🔑 1. Officer Login'
p.font.name = 'Google Sans'
p.font.size = Pt(8)
p.font.bold = True
p.font.color.rgb = RGBColor(15, 23, 42)
p2 = tf.add_paragraph()
p2.text = 'Official Gov ID\n@mcd.delhi.gov.in'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Step 2: Review AI Recs
o2 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(1900000), c_top_row, c_w, c_h)
o2.fill.solid()
o2.fill.fore_color.rgb = RGBColor(255, 255, 255)
o2.line.color.rgb = RGBColor(217, 119, 6)
o2.line.width = Pt(1.2)
tf = o2.text_frame
tf.word_wrap = True
tf.margin_left = Pt(4)
tf.margin_top = Pt(4)
p = tf.paragraphs[0]
p.text = '📋 2. Review Recs'
p.font.name = 'Google Sans'
p.font.size = Pt(8)
p.font.bold = True
p.font.color.rgb = RGBColor(15, 23, 42)
p2 = tf.add_paragraph()
p2.text = 'Examine hotspot\n& plume evidence'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Step 3: Approve & Assign
o3 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(3400000), c_top_row, c_w, c_h)
o3.fill.solid()
o3.fill.fore_color.rgb = RGBColor(255, 255, 255)
o3.line.color.rgb = RGBColor(217, 119, 6)
o3.line.width = Pt(1.2)
tf = o3.text_frame
tf.word_wrap = True
tf.margin_left = Pt(4)
tf.margin_top = Pt(4)
p = tf.paragraphs[0]
p.text = '✅ 3. Approve Action'
p.font.name = 'Google Sans'
p.font.size = Pt(8)
p.font.bold = True
p.font.color.rgb = RGBColor(15, 23, 42)
p2 = tf.add_paragraph()
p2.text = 'Approve, modify\n& set equipment'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Step 4: Track Progress
o4 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(4900000), c_top_row, c_w, c_h)
o4.fill.solid()
o4.fill.fore_color.rgb = RGBColor(255, 255, 255)
o4.line.color.rgb = RGBColor(217, 119, 6)
o4.line.width = Pt(1.2)
tf = o4.text_frame
tf.word_wrap = True
tf.margin_left = Pt(4)
tf.margin_top = Pt(4)
p = tf.paragraphs[0]
p.text = '⏱️ 4. Track Timers'
p.font.name = 'Google Sans'
p.font.size = Pt(8)
p.font.bold = True
p.font.color.rgb = RGBColor(15, 23, 42)
p2 = tf.add_paragraph()
p2.text = '+15s, +3h, +6h, +24h\ncloud polling'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Step 5: Verify Before/After
o5 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(6400000), c_top_row, c_w, c_h)
o5.fill.solid()
o5.fill.fore_color.rgb = RGBColor(255, 255, 255)
o5.line.color.rgb = RGBColor(217, 119, 6)
o5.line.width = Pt(1.2)
tf = o5.text_frame
tf.word_wrap = True
tf.margin_left = Pt(4)
tf.margin_top = Pt(4)
p = tf.paragraphs[0]
p.text = '📊 5. Causal DiD'
p.font.name = 'Google Sans'
p.font.size = Pt(8)
p.font.bold = True
p.font.color.rgb = RGBColor(15, 23, 42)
p2 = tf.add_paragraph()
p2.text = 'Treated vs Control\nsubtract weather'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Arrows row 1
add_arrow(Emu(1700000), Emu(3790000), Emu(1900000), Emu(3790000), RGBColor(217, 119, 6))
add_arrow(Emu(3200000), Emu(3790000), Emu(3400000), Emu(3790000), RGBColor(217, 119, 6))
add_arrow(Emu(4700000), Emu(3790000), Emu(4900000), Emu(3790000), RGBColor(217, 119, 6))
add_arrow(Emu(6200000), Emu(3790000), Emu(6400000), Emu(3790000), RGBColor(217, 119, 6))

# Decision Diamond: Is Improvement Supported by Evidence?
dia_left, dia_top, dia_w, dia_h = Emu(3800000), Emu(4280000), Emu(1500000), Emu(650000)
diamond = s5.shapes.add_shape(MSO_SHAPE.DIAMOND, dia_left, dia_top, dia_w, dia_h)
diamond.fill.solid()
diamond.fill.fore_color.rgb = RGBColor(255, 255, 255)
diamond.line.color.rgb = RGBColor(217, 119, 6)
diamond.line.width = Pt(1.5)
dtf = diamond.text_frame
dtf.word_wrap = True
dp = dtf.paragraphs[0]
dp.alignment = PP_ALIGN.CENTER
dp.text = 'Evidence Valid?'
dp.font.name = 'Google Sans'
dp.font.size = Pt(7.5)
dp.font.bold = True
dp.font.color.rgb = RGBColor(15, 23, 42)

# Connector from Step 5 to Diamond
add_arrow(Emu(7050000), Emu(4180000), Emu(5300000), Emu(4600000), RGBColor(217, 119, 6))

# Outcome YES: 🟢 Publish Verified Outcome
out_yes = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(5800000), Emu(4300000), Emu(2400000), Emu(600000))
out_yes.fill.solid()
out_yes.fill.fore_color.rgb = RGBColor(240, 253, 244) # Green tint
out_yes.line.color.rgb = RGBColor(52, 168, 83)
out_yes.line.width = Pt(1.5)
ytf = out_yes.text_frame
ytf.word_wrap = True
ytf.margin_left = Pt(5)
ytf.margin_top = Pt(4)
p = ytf.paragraphs[0]
p.text = 'YES ➔ 🟢 Publish Verified Outcome'
p.font.name = 'Google Sans'
p.font.size = Pt(8)
p.font.bold = True
p.font.color.rgb = RGBColor(21, 128, 61)
p2 = ytf.add_paragraph()
p2.text = 'Public status updated • Real AQI delta shown'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Outcome NO / INSUFFICIENT: 🟠 Follow-up Required
out_no = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(900000), Emu(4300000), Emu(2400000), Emu(600000))
out_no.fill.solid()
out_no.fill.fore_color.rgb = RGBColor(254, 242, 242) # Red tint
out_no.line.color.rgb = RGBColor(234, 67, 53)
out_no.line.width = Pt(1.5)
ntf = out_no.text_frame
ntf.word_wrap = True
ntf.margin_left = Pt(5)
ntf.margin_top = Pt(4)
p = ntf.paragraphs[0]
p.text = 'NO ➔ 🟠 Follow-Up Required'
p.font.name = 'Google Sans'
p.font.size = Pt(8)
p.font.bold = True
p.font.color.rgb = RGBColor(185, 28, 28)
p2 = ntf.add_paragraph()
p2.text = 'Request reassessment • No false claim issued'
p2.font.name = 'Google Sans'
p2.font.size = Pt(7)
p2.font.color.rgb = RGBColor(71, 85, 105)

# Arrows from diamond to outcomes
add_arrow(Emu(5300000), Emu(4600000), Emu(5800000), Emu(4600000), RGBColor(52, 168, 83))
add_arrow(Emu(3800000), Emu(4600000), Emu(3300000), Emu(4600000), RGBColor(234, 67, 53))

# Upward Feedback Loop Arrow from Publish Verified Outcome (out_yes) to Step 3 in Lane A (c_step3)
loop_line = s5.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Emu(7200000), Emu(4300000), Emu(7200000), Emu(2060000))
loop_line.line.color.rgb = RGBColor(52, 168, 83)
loop_line.line.width = Pt(1.5)

prs.save(pptx_path)
print('Slide 5: Product Process Flow Diagram created successfully in PPTX!')
